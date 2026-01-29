import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function DigitalInterference({ active }) {
    const meshRef = useRef();
    const materialRef = useRef();

    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
            materialRef.current.uniforms.uActive.value = THREE.MathUtils.lerp(
                materialRef.current.uniforms.uActive.value,
                active ? 1.0 : 0.0,
                0.15
            );
        }
    });

    const shader = {
        uniforms: {
            uTime: { value: 0 },
            uActive: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            uniform float uActive;
            varying vec2 vUv;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }

            void main() {
                if (uActive < 0.01) discard;
                
                vec2 uv = vUv;
                float glitch = uActive;
                
                // Very fine horizontal scanlines
                float scanline = sin(uv.y * 2000.0 + uTime * 20.0) * 0.035; // 0.03 -> 0.035
                
                // Fine noise grain
                float noise = hash(uv + uTime) * 0.1; // 0.08 -> 0.1
                
                // Random horizontal "bit" flashes
                float lineNoise = step(0.997, hash(vec2(uTime * 20.0, floor(uv.y * 400.0)))); // 0.998 -> 0.997
                float burst = lineNoise * 0.06; // 0.05 -> 0.06
                
                float alpha = (scanline + noise + burst) * glitch * 0.25; // 0.2 -> 0.25
                
                gl_FragColor = vec4(vec3(1.0), alpha);
            }
        `
    };

    return (
        <mesh ref={meshRef} frustumCulled={false}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={materialRef}
                args={[shader]}
                transparent
                depthTest={false}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </mesh>
    );
}
