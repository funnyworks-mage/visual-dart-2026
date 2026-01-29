import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';

const LIQUID_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const LIQUID_FRAGMENT = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColorTL;
  uniform vec3 uColorTR;
  uniform vec3 uColorBL;
  uniform vec3 uColorBR;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  
  float random (vec2 st) {
      return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  float noise (vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // High-fidelity marble noise (8 Octaves)
  #define OCTAVES 8
  float fbm (vec2 st) {
      float value = 0.0;
      float amplitude = .5;
      for (int i = 0; i < OCTAVES; i++) {
          value += amplitude * noise(st);
          st *= 2.2; 
          amplitude *= .48; 
      }
      return value;
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 st = vUv * vec2(aspect, 1.0) * 1.5;
    vec2 mouse = uMouse * vec2(aspect, 1.0);
    
    // Mouse stir intensity
    float mouseReact = 1.0 - smoothstep(0.0, 0.5, distance(vUv * vec2(aspect, 1.0), mouse));
    
    // Multi-layered Domain Warping (Slowed down for atmosphere)
    vec2 q = vec2(0.0);
    q.x = fbm(st + 0.03 * uTime + mouseReact * 0.18); // Tuned for balance
    q.y = fbm(st + vec2(1.0) + mouseReact * 0.05);
    
    vec2 r = vec2(0.0);
    r.x = fbm(st + 1.2 * q + vec2(1.7, 9.2) + 0.02 * uTime + mouseReact * 0.08);
    r.y = fbm(st + 1.2 * q + vec2(8.3, 2.8) + 0.015 * uTime + mouseReact * 0.06);
    
    // Final high-frequency fluid value
    float f = fbm(st + r);
    
    // Base Slide-specific Ambilight
    vec3 top = mix(uColorTL, uColorTR, vUv.x);
    vec3 bottom = mix(uColorBL, uColorBR, vUv.x);
    vec3 uAccentColor = mix(bottom, top, vUv.y);
    
    // Sharpen and refine the marble lines
    float marble = pow(f, 3.0) * 1.8; 
    float mask = smoothstep(0.0, 1.0, marble);
    
    // Pure Ambilight Highlights (No holographic shift)
    vec3 baseColor = uAccentColor * 0.15; // Deeper atmospheric base
    vec3 fluidColor = uAccentColor * (1.6 + mouseReact * 2.5); // Vibrant glow on lines
    
    // Final composite peaking through the black
    float radial = 1.0 - smoothstep(0.2, 1.2, distance(vUv, vec2(0.5)));
    vec3 finalColor = mix(baseColor, fluidColor, mask * radial);
    
    // Additive atmospheric bloom
    finalColor += uAccentColor * 0.05 * radial;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function LiquidLayer({ cornerColors, accentColor, mouseX, mouseY }) {
    const materialRef = useRef();
    const { viewport } = useThree();

    // Standard fallback if cornerColors is missing
    const colors = useMemo(() => {
        if (cornerColors && cornerColors.tl) return cornerColors;
        const fallback = accentColor || '#2a3a2a';
        return { tl: fallback, tr: fallback, bl: fallback, br: fallback };
    }, [cornerColors, accentColor]);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uColorTL: { value: new THREE.Color(colors.tl) },
        uColorTR: { value: new THREE.Color(colors.tr) },
        uColorBL: { value: new THREE.Color(colors.bl) },
        uColorBR: { value: new THREE.Color(colors.br) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(1, 1) }
    }), []); // Keep stable

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
            // Faster lerp (0.1) for punchier transitions
            materialRef.current.uniforms.uColorTL.value.lerp(new THREE.Color(colors.tl), 0.1);
            materialRef.current.uniforms.uColorTR.value.lerp(new THREE.Color(colors.tr), 0.1);
            materialRef.current.uniforms.uColorBL.value.lerp(new THREE.Color(colors.bl), 0.1);
            materialRef.current.uniforms.uColorBR.value.lerp(new THREE.Color(colors.br), 0.1);

            materialRef.current.uniforms.uResolution.value.set(state.size.width, state.size.height);

            if (mouseX && mouseY) {
                // Remap mouse [0, 1] to mesh UV [0, 1] accounting for 1.2x scale
                // Formula: 0.5 + (mouse - 0.5) / scale
                const mx = 0.5 + (mouseX.get() - 0.5) / 1.2;
                const my = 0.5 + (mouseY.get() - 0.5) / 1.2;
                materialRef.current.uniforms.uMouse.value.set(mx, 1.0 - my);
            }
        }
    });

    // Calculate precision scale to fill viewport at z = -20
    // Safe viewport calculation to prevent 'getWorldPosition' of null error
    const { camera } = useThree();
    const viewportData = (camera && viewport)
        ? viewport.getCurrentViewport(camera, [0, 0, -20])
        : { width: 10, height: 10 }; // Safe fallback dimensions

    const width = viewportData.width * 1.5;
    const height = viewportData.height * 1.5;

    return (
        <mesh position={[0, 0, -20]}>
            <planeGeometry args={[width, height]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={LIQUID_VERTEX}
                fragmentShader={LIQUID_FRAGMENT}
                transparent={true}
                depthWrite={false}
                uniforms={uniforms}
            />
        </mesh>
    );
}

export function FloatingCubes({ mouseX, mouseY, accentColor = '#2a3a2a', exitTransition = false, direction = 1 }) {
    const count = 130;
    const meshRef = useRef();
    const exitProgressRef = useRef(0);

    // Create random initial attributes
    const { positions, randoms } = useMemo(() => {
        const p = new Float32Array(count * 3);
        const r = new Float32Array(count * 4);
        for (let i = 0; i < count; i++) {
            // Balanced spread for comfortable visibility
            p[i * 3] = (Math.random() - 0.5) * 140;
            p[i * 3 + 1] = (Math.random() - 0.5) * 110;
            // Pushed back Z range: -140 (background) to 12 (mid-ground)
            p[i * 3 + 2] = -140.0 + Math.random() * 152.0;
            r[i * 4] = Math.random(); r[i * 4 + 1] = Math.random();
            r[i * 4 + 2] = Math.random(); r[i * 4 + 3] = Math.random();
        }
        return { positions: p, randoms: r };
    }, []);

    const uniforms = useMemo(() => ({
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uExitProgress: { value: 0 },
        uDirection: { value: 1.0 },
        uSeed: { value: Math.random() },
        uAccentColor: { value: new THREE.Color(accentColor) }
    }), []);

    useFrame((state) => {
        if (meshRef.current) {
            const time = state.clock.getElapsedTime();
            meshRef.current.material.uniforms.uTime.value = time;

            // Sync transition progress
            exitProgressRef.current = THREE.MathUtils.lerp(exitProgressRef.current, exitTransition ? 1.0 : 0.0, 0.18);
            meshRef.current.material.uniforms.uExitProgress.value = exitProgressRef.current;
            meshRef.current.material.uniforms.uProgress.value = THREE.MathUtils.lerp(meshRef.current.material.uniforms.uProgress.value, 1.0, 0.15);
            meshRef.current.material.uniforms.uDirection.value = direction;

            // Smoothly transition accent color to match central cluster
            meshRef.current.material.uniforms.uAccentColor.value.lerp(new THREE.Color(accentColor), 0.1);
        }
    });

    const shader = {
        uniforms,
        vertexShader: `
            attribute vec4 aRandom; attribute vec3 aPos;
            uniform float uTime; uniform float uProgress; uniform float uExitProgress; uniform float uSeed;
            varying vec4 vRandom; varying vec3 vNormal;
            
            float hash(float n) { return fract(sin(n) * 43758.5453123); }
            
            void main() {
                vRandom = aRandom;
                
                vec3 pos = aPos;
                // Larger drift scale for deep space
                float driftSpeed = 0.05 + aRandom.y * 0.05;
                pos.x += sin(uTime * driftSpeed + aRandom.x * 20.0) * 8.0;
                pos.y += cos(uTime * driftSpeed * 0.7 + aRandom.y * 20.0) * 6.0;
                pos.z += sin(uTime * driftSpeed * 0.4 + aRandom.z * 20.0) * 4.0;
                
                // Randomized Individual Displacement Glitch
                float glitchAmount = uExitProgress > 0.0 ? uExitProgress : (1.0 - uProgress);
                if (glitchAmount > 0.05) {
                    float blocks = 24.0;
                    float blockY = floor((pos.y + 75.0) / 150.0 * blocks);
                    // Vary speed and intensity per cube
                    float indSpeed = 20.0 + aRandom.w * 20.0;
                    float indIntensity = 0.5 + aRandom.z * 1.5;
                    float offset = (hash(blockY + uTime * indSpeed) - 0.5) * glitchAmount * 1.5 * indIntensity;
                    if (hash(blockY + uSeed + aRandom.x) > 0.35) {
                        pos.x += offset;
                    }
                }
                
                vec3 cubePos = position;
                // Rotation logic
                float rot = uTime * (0.05 + aRandom.w * 0.25);
                float c = cos(rot); float s = sin(rot);
                mat2 rMat = mat2(c, -s, s, c);
                cubePos.xz *= rMat;
                cubePos.xy *= rMat;
                
                // Add individual scale variation based on aRandom.z (0.6x to 1.6x)
                float individualScale = 0.6 + aRandom.z * 1.0;
                cubePos *= 0.36 * individualScale; 
                
                vec4 worldPos = modelMatrix * vec4(pos + cubePos, 1.0);
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * viewMatrix * worldPos;
            }
        `,
        fragmentShader: `
            uniform vec3 uAccentColor; uniform float uTime; uniform float uProgress; uniform float uExitProgress;
            varying vec4 vRandom; varying vec3 vNormal;
            
            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            
            void main() {
                // Transition trigger (0.0 to 1.0)
                float transitionAmount = uExitProgress > 0.0 ? uExitProgress : (1.0 - uProgress);
                
                // --- Pure Solid State ---
                vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
                float diff = dot(vNormal, lightDir);
                float lighting = mix(0.85, 1.05, smoothstep(-0.5, 1.0, diff));
                vec3 baseColor = uAccentColor * 0.4 * lighting;
                float baseAlpha = 0.4;
                
                // --- Randomized Individual Flicker ---
                float indFreq = 30.0 + vRandom.x * 40.0;
                float flicker = hash(vec2(uTime * indFreq, vRandom.y));
                
                // --- Smooth Fade Envelope ---
                // Gently dip visibility during the middle of the transition
                float smoothFade = 1.0 - smoothstep(0.0, 0.8, transitionAmount) * 0.85;
                
                // --- Visual Flash & Color jitter ---
                float effectStrength = smoothstep(0.0, 1.0, transitionAmount);
                float flash = effectStrength * flicker * (0.4 + vRandom.w * 0.4);
                vec3 finalColor = baseColor + (uAccentColor * flash * 1.5);
                
                // --- Final Alpha Combination ---
                // Random dropout threshold + uniform smooth fade
                float threshold = 0.2 + vRandom.z * 0.3;
                float alphaMask = step(threshold * effectStrength, flicker);
                
                float finalAlpha = baseAlpha * smoothFade * alphaMask;
                
                gl_FragColor = vec4(finalColor, finalAlpha);
            }
        `
    };

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
            <boxGeometry args={[1, 1, 1]}>
                <instancedBufferAttribute attach="attributes-aPos" args={[positions, 3]} />
                <instancedBufferAttribute attach="attributes-aRandom" args={[randoms, 4]} />
            </boxGeometry>
            <shaderMaterial args={[shader]} transparent depthWrite={false} />
        </instancedMesh>
    );
}

export function DigitalDust({ mouseX, mouseY, accentColor = '#ffffff' }) {
    const count = 4000;
    const [positions] = useMemo(() => {
        const p = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            // Maximum coverage for large monitors (32" / Ultrawide)
            p[i * 3] = (Math.random() - 0.5) * 120;
            p[i * 3 + 1] = (Math.random() - 0.5) * 100;

            // Extreme Z-range: from behind cubes (-10) to near camera (45)
            // Camera position is Z=48.
            p[i * 3 + 2] = -10 + (Math.random() * 55);
        }
        return [p];
    }, []);

    const ref = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        const mx = mouseX ? mouseX.get() : 0.5;
        const my = mouseY ? mouseY.get() : 0.5;

        if (ref.current) {
            // Calm drifting movement
            ref.current.rotation.y = Math.sin(t * 0.1) * 0.05;
            ref.current.rotation.x = Math.cos(t * 0.1) * 0.05;

            // Sync with main parallax
            ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, (mx - 0.5) * -1.5, 0.02);
            ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, (my - 0.5) * 1.5, 0.02);
        }
    });

    const finalColor = useMemo(() => {
        const c = new THREE.Color(accentColor);
        return c.lerp(new THREE.Color('#ffffff'), 0.5); // More vibrant color
    }, [accentColor]);

    return (
        <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color={finalColor}
                size={0.12} // Increased size
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.35} // Increased opacity
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}

export function FluidGhostParticles({ mouseX, mouseY, accentColor = '#ffffff' }) {
    const count = 1200;
    const [positions, life] = useMemo(() => {
        const p = new Float32Array(count * 3);
        const l = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            p[i * 3] = (Math.random() - 0.5) * 40;
            p[i * 3 + 1] = (Math.random() - 0.5) * 30;
            p[i * 3 + 2] = -15 + Math.random() * 5;
            l[i] = Math.random();
        }
        return [p, l];
    }, []);

    const pointsRef = useRef();

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        if (!pointsRef.current) return;

        const pos = pointsRef.current.geometry.attributes.position.array;

        for (let i = 0; i < count; i++) {
            // Very slow drift following a pseudo-fluid field
            const idx = i * 3;
            const x = pos[idx];
            const y = pos[idx + 1];

            // Influence by time and position (simulating noise flow)
            pos[idx] += Math.sin(t * 0.2 + y * 0.1) * 0.005;
            pos[idx + 1] += Math.cos(t * 0.2 + x * 0.1) * 0.005;

            // Respawn logic
            life[i] -= 0.002;
            if (life[i] <= 0) {
                life[i] = 1.0;
                // Respawn near mouse or random
                const mx = mouseX ? (mouseX.get() - 0.5) * 40 : 0;
                const my = mouseY ? (mouseY.get() - 0.5) * -30 : 0;
                pos[idx] = mx + (Math.random() - 0.5) * 10;
                pos[idx + 1] = my + (Math.random() - 0.5) * 10;
            }
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    return (
        <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
            <PointMaterial
                transparent
                color={accentColor}
                size={0.12}
                sizeAttenuation={true}
                depthWrite={false}
                opacity={0.1}
                blending={THREE.AdditiveBlending}
            />
        </Points>
    );
}

const WebGLBackground = ({ accentColor = '#2a3a2a', mouseX, mouseY }) => {
    return (
        <div style={{ width: '100%', height: '100%', background: '#000' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }} dpr={[1, 1.5]}>
                <color attach="background" args={['#000000']} />
                <LiquidLayer accentColor={accentColor} mouseX={mouseX} mouseY={mouseY} />
                <DigitalDust mouseX={mouseX} mouseY={mouseY} accentColor={accentColor} />
                <FluidGhostParticles mouseX={mouseX} mouseY={mouseY} accentColor={accentColor} />
            </Canvas>
        </div>
    );
};

export default WebGLBackground;
