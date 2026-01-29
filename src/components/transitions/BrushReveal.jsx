import React from 'react';
import { motion } from 'framer-motion';

const BrushReveal = ({ imageUrl, isVisible, accentColor }) => {
    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            background: '#000'
        }}>
            {/* Background Glow */}
            <motion.div
                animate={{ opacity: isVisible ? 0.3 : 0 }}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: accentColor,
                    zIndex: 1,
                    pointerEvents: 'none',
                }}
            />

            {/* The Image with a Brush-like Wipe */}
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{
                    opacity: isVisible ? 1 : 0,
                    x: isVisible ? 0 : 30,
                    clipPath: isVisible
                        ? 'inset(0% 0% 0% 0%)'
                        : 'inset(0% 100% 0% 0%)'
                }}
                transition={{
                    duration: 1.2,
                    ease: [0.22, 1, 0.36, 1], // Cubic-out
                    delay: 0.1
                }}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    zIndex: 2,
                }}
            >
                <img
                    src={imageUrl}
                    alt="Brush Reveal"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            </motion.div>
        </div>
    );
};

export default BrushReveal;
