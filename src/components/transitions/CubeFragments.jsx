import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SCENE_CONFIG } from '../../constants/menu';
import { BASE_VERTEX, BASE_FRAGMENT } from '../../shaders/baseLayer.glsl';
import { VOXEL_VERTEX, VOXEL_FRAGMENT } from '../../shaders/voxelLayer.glsl';

function useStableTexture(imageUrl) {
    const [texture, setTexture] = React.useState(null);
    const loader = useMemo(() => new THREE.TextureLoader(), []);
    useEffect(() => {
        loader.load(imageUrl, (tex) => setTexture(tex));
    }, [imageUrl, loader]);
    return texture;
}

export const FragmentMesh = ({ imageUrl, accentColor, mouseX, mouseY, exitTransition = false, direction = 1 }) => {
    const materialRef = useRef();
    const basePlaneMaterialRef = useRef();
    const texture = useStableTexture(imageUrl);
    const exitProgressRef = useRef(0);

    const { ROWS, COLS, DEBRIS_COUNT, GRID_SIZE } = SCENE_CONFIG;
    const COUNT = ROWS * COLS + DEBRIS_COUNT;

    const { positions, uvs, randoms, isDebris } = useMemo(() => {
        const p = new Float32Array(COUNT * 3);
        const u = new Float32Array(COUNT * 2);
        const r = new Float32Array(COUNT * 4);
        const d = new Float32Array(COUNT);
        const CORE = ROWS * COLS;
        for (let i = 0; i < CORE; i++) {
            const rIdx = Math.floor(i / COLS); const cIdx = i % COLS;
            p[i * 3] = (cIdx / COLS - 0.5) * GRID_SIZE.x;
            p[i * 3 + 1] = (rIdx / ROWS - 0.5) * GRID_SIZE.y;
            p[i * 3 + 2] = Math.floor(Math.random() * 4) * 0.5;
            u[i * 2] = cIdx / COLS; u[i * 2 + 1] = rIdx / ROWS;
            r[i * 4] = Math.random(); r[i * 4 + 1] = Math.random(); r[i * 4 + 2] = Math.random(); r[i * 4 + 3] = Math.random();
            d[i] = 0.0;
        }
        for (let i = CORE; i < COUNT; i++) {
            p[i * 3] = (Math.random() - 0.5) * 85; p[i * 3 + 1] = (Math.random() - 0.5) * 65; p[i * 3 + 2] = (Math.random() - 0.5) * 40 - 15;
            u[i * 2] = Math.random(); u[i * 2 + 1] = Math.random();
            r[i * 4] = Math.random(); r[i * 4 + 1] = Math.random(); r[i * 4 + 2] = Math.random(); r[i * 4 + 3] = Math.random();
            d[i] = 1.0;
        }
        return { positions: p, uvs: u, randoms: r, isDebris: d };
    }, [ROWS, COLS, DEBRIS_COUNT, GRID_SIZE]);

    const uniforms = useMemo(() => ({
        uTexture: { value: null }, uProgress: { value: 0 }, uTime: { value: 0 }, uSeed: { value: Math.random() },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uAccentColor: { value: new THREE.Color(accentColor) },
        uExitProgress: { value: 0 }, uDirection: { value: 1.0 }
    }), []);

    useEffect(() => {
        if (texture) {
            uniforms.uTexture.value = texture;
            exitProgressRef.current = 0;
            if (materialRef.current) {
                materialRef.current.uniforms.uProgress.value = 0;
                materialRef.current.uniforms.uSeed.value = Math.random();
                materialRef.current.uniforms.uExitProgress.value = 0;
            }
        }
    }, [texture, uniforms]);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        exitProgressRef.current = THREE.MathUtils.lerp(exitProgressRef.current, exitTransition ? 1.0 : 0.0, 0.18);
        if (materialRef.current && texture) {
            materialRef.current.uniforms.uTime.value = time;
            materialRef.current.uniforms.uMouse.value.lerp(new THREE.Vector2(mouseX.get(), 1.0 - mouseY.get()), 0.1);
            materialRef.current.uniforms.uProgress.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uProgress.value, 1.0, 0.15);
            materialRef.current.uniforms.uExitProgress.value = exitProgressRef.current;
            materialRef.current.uniforms.uDirection.value = direction;
            materialRef.current.uniforms.uAccentColor.value.set(accentColor);
        }
        if (basePlaneMaterialRef.current && texture) {
            basePlaneMaterialRef.current.uniforms.uTime.value = time;
            basePlaneMaterialRef.current.uniforms.uProgress.value = materialRef.current ? materialRef.current.uniforms.uProgress.value : 1.0;
            basePlaneMaterialRef.current.uniforms.uMouse.value.lerp(new THREE.Vector2(mouseX.get(), 1.0 - mouseY.get()), 0.1);
            basePlaneMaterialRef.current.uniforms.uExitProgress.value = exitProgressRef.current;
            basePlaneMaterialRef.current.uniforms.uDirection.value = direction;
        }
    });

    if (!texture) return null;

    return (
        <group>
            <mesh position={[0, 0, -8.4]}>
                <planeGeometry args={[24, 15.6, 100, 100]} />
                <shaderMaterial ref={basePlaneMaterialRef} transparent uniforms={uniforms} vertexShader={BASE_VERTEX} fragmentShader={BASE_FRAGMENT} />
            </mesh>
            <instancedMesh args={[null, null, COUNT]} frustumCulled={false}>
                <boxGeometry args={[0.36, 0.36, 2.76]}>
                    <instancedBufferAttribute attach="attributes-aRandom" args={[randoms, 4]} />
                    <instancedBufferAttribute attach="attributes-aPos" args={[positions, 3]} />
                    <instancedBufferAttribute attach="attributes-aUv" args={[uvs, 2]} />
                    <instancedBufferAttribute attach="attributes-aIsDebris" args={[isDebris, 1]} />
                </boxGeometry>
                <shaderMaterial ref={materialRef} transparent uniforms={uniforms} vertexShader={VOXEL_VERTEX} fragmentShader={VOXEL_FRAGMENT} />
            </instancedMesh>
        </group>
    );
};

export const SceneContent = ({ imageUrl, accentColor, mouseX, mouseY, skipInternalTilt = false, exitTransition = false, direction = 1 }) => {
    const groupRef = useRef();
    useFrame((state) => {
        if (!skipInternalTilt) {
            const mx = mouseX.get(); const my = mouseY.get();
            state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, (mx - 0.5) * 6.0, 0.05);
            state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, (my - 0.5) * -4.0, 0.05);
            state.camera.lookAt(0, 0, 0);
            if (groupRef.current) {
                groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, (my - 0.5) * 0.4, 0.05);
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (mx - 0.5) * 0.5, 0.05);
            }
        }
    });
    return (
        <group ref={groupRef}>
            <FragmentMesh imageUrl={imageUrl} accentColor={accentColor} mouseX={mouseX} mouseY={mouseY} exitTransition={exitTransition} direction={direction} />
        </group>
    );
};

const CubeFragments = (props) => (
    <div style={{ width: '100%', height: '100%' }}>
        <Canvas camera={SCENE_CONFIG.CANVAS_CAMERA} dpr={[1, 1.5]} gl={{ alpha: true }}>
            <SceneContent {...props} />
            <EffectComposer multisampling={0}>
                {/* <Bloom intensity={0.05} luminanceThreshold={0.9} mipmapBlur /> */}
                <ChromaticAberration offset={[0.001, 0.001]} radialModulation={true} modulationOffset={0.5} />
            </EffectComposer>
        </Canvas>
    </div>
);

export default CubeFragments;
