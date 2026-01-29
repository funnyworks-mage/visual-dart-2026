import React, { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor = () => {
    const [isHovered, setIsHovered] = useState(false);
    const [bracketSize, setBracketSize] = useState({ width: 44, height: 44 });
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springConfig = { damping: 25, stiffness: 200 };
    const cursorX = useSpring(mouseX, springConfig);
    const cursorY = useSpring(mouseY, springConfig);

    const handleMouseMove = React.useCallback((e) => {
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);

        // Adaptive Target Detection
        const target = e.target;
        const interactiveElement = target.closest('button, a, .side-label, .burger-box, .header-logo, .pagination-dot');

        if (interactiveElement) {
            const rect = interactiveElement.getBoundingClientRect();
            const nextW = rect.width + 16;
            const nextH = rect.height + 16;
            setIsHovered(true);
            setBracketSize(prev => {
                if (prev.width === nextW && prev.height === nextH) return prev;
                return { width: nextW, height: nextH };
            });
        } else {
            setIsHovered(false);
            setBracketSize(prev => {
                if (prev.width === 44 && prev.height === 44) return prev;
                return { width: 44, height: 44 };
            });
        }
    }, [mouseX, mouseY]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [handleMouseMove]);

    return (
        <motion.div
            className="custom-cursor-container"
            style={{
                left: cursorX,
                top: cursorY,
            }}
        >
            {/* 3D Cube Visual (Idle) */}
            <motion.div
                className="cube-wrapper"
                animate={{
                    rotateX: isHovered ? 0 : [0, 360],
                    rotateY: isHovered ? 0 : [0, 360],
                    opacity: isHovered ? 0 : 1,
                    scale: isHovered ? 0.5 : 1,
                }}
                transition={{
                    rotateX: { duration: 12, repeat: Infinity, ease: "linear" },
                    rotateY: { duration: 12, repeat: Infinity, ease: "linear" },
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 }
                }}
            >
                <div className="cube-face front" />
                <div className="cube-face back" />
                <div className="cube-face right" />
                <div className="cube-face left" />
                <div className="cube-face top" />
                <div className="cube-face bottom" />
            </motion.div>

            {/* 2D Bracket Visual (Hover) */}
            <motion.div
                className="bracket-2d"
                initial={false}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    width: isHovered ? bracketSize.width : 44,
                    height: isHovered ? bracketSize.height : 44,
                    rotate: isHovered ? 0 : -45,
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="corner tl" />
                <div className="corner tr" />
                <div className="corner bl" />
                <div className="corner br" />
                <div className="center-dot" />
            </motion.div>

            <style>{`
                .custom-cursor-container {
                    position: fixed;
                    pointer-events: none;
                    z-index: 10000;
                    transform: translate(-50%, -50%);
                    perspective: 600px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .cube-wrapper {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    transform-style: preserve-3d;
                }

                .cube-face {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.8);
                    background: transparent;
                    box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
                }

                .front  { transform: rotateY(0deg) translateZ(10px); }
                .back   { transform: rotateY(180deg) translateZ(10px); }
                .right  { transform: rotateY(90deg) translateZ(10px); }
                .left   { transform: rotateY(-90deg) translateZ(10px); }
                .top    { transform: rotateX(90deg) translateZ(10px); }
                .bottom { transform: rotateX(-90deg) translateZ(10px); }

                .bracket-2d {
                    position: absolute;
                    /* Dynamically controlled by framer-motion */
                }

                .corner {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    border-color: #fff;
                    border-style: solid;
                    border-width: 0;
                }

                .tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; }
                .tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; }
                .bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; }
                .br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; }

                .center-dot {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 3px;
                    height: 3px;
                    background: #fff;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 5px #fff;
                }
            `}</style>
        </motion.div>
    );
};

export default CustomCursor;
