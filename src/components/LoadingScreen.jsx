import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = ({ progress }) => {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(20px)', scale: 1.1 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: '#000',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'monospace',
                color: '#fff',
                overflow: 'hidden'
            }}
        >
            {/* Background Grid Detail */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.1,
                backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                pointerEvents: 'none'
            }} />

            {/* Center Content */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        fontSize: '12px',
                        letterSpacing: '4px',
                        marginBottom: '20px',
                        color: 'rgba(255, 255, 255, 0.5)'
                    }}
                >
                    SYSTEM_INITIALIZING // ARCHIVE_SCAN
                </motion.div>

                <div style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    letterSpacing: '-2px',
                    marginBottom: '10px'
                }}>
                    {Math.round(progress)}%
                </div>

                {/* Progress Bar Container */}
                <div style={{
                    width: '240px',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    position: 'relative'
                }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ ease: "easeOut" }}
                        style={{
                            height: '100%',
                            background: '#fff',
                            boxShadow: '0 0 15px #fff'
                        }}
                    />
                </div>

                <div style={{
                    marginTop: '15px',
                    fontSize: '9px',
                    opacity: 0.3,
                    letterSpacing: '1px'
                }}>
                    PRELOADING_RESOURCES: [SLOT_{Math.floor(progress / 15)}] OK // SYNCING_LAYERS
                </div>
            </div>

            {/* Diagnostic Scan Line */}
            <motion.div
                animate={{ top: ['-10%', '110%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                style={{
                    position: 'absolute',
                    left: 0,
                    width: '100%',
                    height: '20vh',
                    background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.05), transparent)',
                    zIndex: 1,
                    pointerEvents: 'none'
                }}
            />

            {/* Corner Brackets */}
            <div style={{ position: 'absolute', top: '40px', left: '40px', width: '20px', height: '20px', borderLeft: '1px solid rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.3)' }} />
            <div style={{ position: 'absolute', top: '40px', right: '40px', width: '20px', height: '20px', borderRight: '1px solid rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.3)' }} />
            <div style={{ position: 'absolute', bottom: '40px', left: '40px', width: '20px', height: '20px', borderLeft: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
            <div style={{ position: 'absolute', bottom: '40px', right: '40px', width: '20px', height: '20px', borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
        </motion.div>
    );
};

export default LoadingScreen;
