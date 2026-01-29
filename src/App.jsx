import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette, Glitch } from '@react-three/postprocessing';
import { BlendFunction, GlitchMode } from 'postprocessing';
import * as THREE from 'three';

import HUDFrame from './components/HUDFrame';
import CustomCursor from './components/CustomCursor';
import LoadingScreen from './components/LoadingScreen';
import { SceneContent } from './components/transitions/CubeFragments';
import { LiquidLayer, DigitalDust, FloatingCubes } from './components/WebGLBackground';
import { DigitalInterference } from './components/DigitalInterference';
import { MENU_ITEMS, SCENE_CONFIG } from './constants/menu';
import { extractCornerColors } from './utils/colorUtils';

function UnifiedScene({ mouseX, mouseY, cornerColors, imageUrl, exitTransition, direction }) {
  const groupRef = useRef();

  useFrame((state) => {
    const mx = mouseX.get(); const my = mouseY.get();

    // Camera Position: Original refined range
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, (mx - 0.5) * 12.0, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, (my - 0.5) * -8.0, 0.05);
    state.camera.lookAt(0, 0, 0);

    // Scene Tilt: Re-implementing the rotation that was lost
    if (groupRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, (my - 0.5) * 0.4, 0.05);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, (mx - 0.5) * 0.5, 0.05);
    }
  });

  return (
    <group ref={groupRef}>
      <LiquidLayer cornerColors={cornerColors} mouseX={mouseX} mouseY={mouseY} />
      <DigitalDust mouseX={mouseX} mouseY={mouseY} accentColor={cornerColors.tl} />
      <FloatingCubes mouseX={mouseX} mouseY={mouseY} accentColor={cornerColors.tl} exitTransition={exitTransition} direction={direction} />
      <SceneContent
        imageUrl={imageUrl} accentColor={cornerColors.tl}
        mouseX={mouseX} mouseY={mouseY}
        skipInternalTilt={true} exitTransition={exitTransition} direction={direction}
      />
      <DigitalInterference active={exitTransition} />
    </group>
  );
}

function App() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [exitTransition, setExitTransition] = useState(false);
  const [cornerColors, setCornerColors] = useState({
    tl: '#2a3a2a', tr: '#2a3a2a', bl: '#2a3a2a', br: '#2a3a2a'
  });
  const [loadedCount, setLoadedCount] = useState(0);
  const lastWheelTime = useRef(0);

  const slides = useMemo(() => [
    { title: MENU_ITEMS[0], img: '/01_2D ART.jpg' },
    { title: MENU_ITEMS[1], img: '/02_3D ART.jpg' },
    { title: MENU_ITEMS[2], img: '/03_ANIMATION.jpeg' },
    { title: MENU_ITEMS[3], img: '/04_CONCEPT ART.jpg' },
    { title: MENU_ITEMS[4], img: '/05_MARKETING.jpg' },
    { title: MENU_ITEMS[5], img: '/06_VFX.jpg' },
    { title: MENU_ITEMS[6], img: '/07_UI.jpg' },
  ], []);

  const total = slides.length;
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [mouseX, mouseY]);

  // Preload all textures for smooth transitions
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let count = 0;
    slides.forEach(slide => {
      loader.load(slide.img, () => {
        count++;
        setLoadedCount(count);
      });
    });
  }, [slides]);

  useEffect(() => {
    extractCornerColors(slides[index].img, setCornerColors);
  }, [index, slides]);

  const transitionTo = useCallback((targetIndex, newDirection) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 800) return;
    lastWheelTime.current = now;

    setExitTransition(true);
    setTimeout(() => {
      setDirection(newDirection);
      setIndex(targetIndex);
      setExitTransition(false);
    }, 500);
  }, []);

  const paginate = useCallback((dir) => {
    transitionTo((index + dir + total) % total, dir);
  }, [index, total, transitionTo]);

  const goToIndex = useCallback((target) => {
    if (target === index) return;
    transitionTo(target, target > index ? 1 : -1);
  }, [index, transitionTo]);

  useEffect(() => {
    const handleWheelGlobal = (e) => {
      if (Math.abs(e.deltaY) > 20) paginate(e.deltaY > 0 ? 1 : -1);
    };
    window.addEventListener('wheel', handleWheelGlobal, { passive: true });
    return () => window.removeEventListener('wheel', handleWheelGlobal);
  }, [paginate]);

  const variants = useMemo(() => ({
    enter: (d) => ({ x: d > 0 ? '100%' : '-100%', opacity: 0, filter: 'blur(20px)' }),
    center: { zIndex: 1, x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: (d) => ({ zIndex: 0, x: d > 0 ? '-100%' : '100%', opacity: 0, filter: 'blur(20px)' }),
  }), []);

  const isLoading = loadedCount < total;
  const progress = (loadedCount / total) * 100;

  return (
    <div className="app-container">
      <AnimatePresence>
        {isLoading && <LoadingScreen progress={progress} />}
      </AnimatePresence>

      <div className="global-webgl-layer">
        <Canvas camera={SCENE_CONFIG.CANVAS_CAMERA} dpr={[1, 1.5]} gl={{ alpha: true, antialias: false }}>
          <color attach="background" args={['#000000']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 20, 10]} intensity={1} />
          <EffectComposer multisampling={0} disableNormalPass>
            <Bloom
              intensity={exitTransition ? 0.2 : 0.5}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
            <Noise opacity={0.04} blendFunction={BlendFunction.OVERLAY} />
          </EffectComposer>
          <UnifiedScene
            mouseX={mouseX} mouseY={mouseY} cornerColors={cornerColors}
            imageUrl={slides[index].img} direction={direction} exitTransition={exitTransition}
          />
        </Canvas>
      </div>

      <main className="slider-main">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div key={index} custom={direction} variants={variants} initial="enter" animate="center" exit="exit" className="slide-content" />
        </AnimatePresence>
      </main>

      <HUDFrame activeIndex={index} total={total} onSelect={goToIndex} />
      <CustomCursor />

      <style dangerouslySetInnerHTML={{
        __html: `
        .app-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; }
        .global-webgl-layer { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: 1; pointer-events: none; }
        .slider-main { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5; pointer-events: none; }
      `}} />
    </div>
  );
}

export default App;
