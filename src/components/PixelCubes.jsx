import React, { useRef, useMemo } from 'react';
import { useFrame, useThree, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDepth;
  
  attribute vec3 aGridPos;
  attribute vec4 aRandom;
  
  uniform float uTime;
  uniform float uExplosion;
  uniform vec2 uMouse;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    
    // UV calculation for 60x34 grid
    vUv = vec2(aGridPos.x / 60.0, aGridPos.y / 34.0);
    
    vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    
    // Mouse Interaction
    vec2 mouseWorld = uMouse * vec2(8.0, 4.5);
    float mouseDist = length(instancePos.xy - mouseWorld);
    float mouseEffect = smoothstep(3.5, 0.5, mouseDist);
    
    // Base Depth Jitter (Constant 3D feel)
    float baseZ = aRandom.z * 1.5 - 0.75;
    
    // Animation Jitter
    float pulse = sin(uTime * 0.5 + aRandom.y * 10.0) * 0.15;
    
    // Explosion effect
    float activeExplosion = uExplosion * aRandom.x * 6.0;
    
    // Combined Z depth
    float zOffset = (baseZ + pulse + activeExplosion) * (1.0 - mouseEffect);
    
    // Independent Rotation
    float angle = (uTime * 0.2 + aRandom.w * 20.0) * (uExplosion * 2.0 + 0.1) * (1.0 - mouseEffect);
    float s = sin(angle);
    float c = cos(angle);
    mat2 rot = mat2(c, -s, s, c);
    
    vec3 pos = position;
    pos.xy = rot * pos.xy;
    pos.xz = rot * pos.xz;
    
    vec4 worldPosition = instanceMatrix * vec4(pos, 1.0);
    worldPosition.z += zOffset;
    
    vDepth = zOffset;
    
    gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vDepth;
  
  uniform sampler2D uMap;
  uniform float uOpacity;
  
  void main() {
    vec4 texColor = texture2D(uMap, vUv);
    
    // Strong 3D shading: Bright front, very dark sides
    float shading = 1.0;
    if (abs(vNormal.z) < 0.5) {
      shading = 0.15; // Dark sides
    } else {
      shading = 1.2; // Bright front
    }
    
    // Apply atmospheric tint based on depth
    vec3 finalColor = texColor.rgb * shading;
    finalColor += vDepth * 0.05; // Light/Dark based on Z position
    
    gl_FragColor = vec4(finalColor, texColor.a * uOpacity);
    
    if (texColor.a < 0.1) discard;
  }
`;

const PixelCubes = ({ textureUrl, explosion = 0 }) => {
    const meshRef = useRef();
    const { mouse } = useThree();

    // Use useLoader for reliable texture fetching in Suspense
    const texture = useLoader(THREE.TextureLoader, textureUrl);

    const COLS = 60;
    const ROWS = 34;
    const COUNT = COLS * ROWS;

    const { instanceMatrix, aGridPos, aRandom } = useMemo(() => {
        const matrix = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 16), 16);
        const gridPos = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
        const random = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 4), 4);

        const dummy = new THREE.Object3D();
        const cellSize = 0.18; // Slightly larger for better density

        for (let i = 0; i < COUNT; i++) {
            const x = i % COLS;
            const y = Math.floor(i / COLS);

            const posX = (x - COLS / 2) * cellSize;
            const posY = (y - ROWS / 2) * cellSize;

            dummy.position.set(posX, posY, 0);
            dummy.updateMatrix();
            dummy.matrix.toArray(matrix.array, i * 16);

            gridPos.setXYZ(i, x, y, 0);
            random.setXYZW(i, Math.random(), Math.random(), Math.random(), Math.random());
        }

        return { instanceMatrix: matrix, aGridPos: gridPos, aRandom: random };
    }, [COUNT]);

    useFrame((state) => {
        if (meshRef.current) {
            const uniforms = meshRef.current.material.uniforms;
            uniforms.uTime.value = state.clock.getElapsedTime();
            uniforms.uMouse.value.set(mouse.x, mouse.y);
            uniforms.uExplosion.value = THREE.MathUtils.lerp(
                uniforms.uExplosion.value,
                explosion,
                0.08
            );
        }
    });

    return (
        <instancedMesh ref={meshRef} args={[null, null, COUNT]} instanceMatrix={instanceMatrix}>
            <boxGeometry args={[0.16, 0.16, 0.1]}> {/* Thicker Z-depth for cube feel */}
                <bufferAttribute attach="aGridPos" {...aGridPos} />
                <bufferAttribute attach="aRandom" {...aRandom} />
            </boxGeometry>
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                transparent={true}
                side={THREE.DoubleSide}
                uniforms={{
                    uTime: { value: 0 },
                    uMap: { value: texture },
                    uExplosion: { value: 0 },
                    uMouse: { value: new THREE.Vector2() },
                    uOpacity: { value: 1.0 }
                }}
            />
        </instancedMesh>
    );
};

export default PixelCubes;
