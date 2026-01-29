import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Callout = ({ id, x, y, label, side }) => {
    // Generate an L-shaped path based on the side
    // Anchor (dot) -> Segment 1 (diagonal) -> Segment 2 (horizontal) -> Label
    const lineX = side === 'left' ? -40 : 40;
    const lineY = -30;
    const horizontalWidth = side === 'left' ? -60 : 60;

    return (
        <motion.div
            className={`cube-callout ${side}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ left: `${x}%`, top: `${y}%` }}
        >
            {/* Anchor Dot */}
            <motion.div
                className="callout-anchor"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
            />

            {/* Horizontal part of the L-shape (Plain DIV) */}
            <div
                style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '60px',
                    height: '2px',
                    background: '#ff0000',
                    transform: `translate(${side === 'left' ? '-100%' : '0'}, ${lineY}px)`,
                    opacity: 0.8
                }}
            />
            {/* Keeping the dot very visible */}
            <div className="callout-anchor" style={{ background: '#ff0000', width: '8px', height: '8px', zIndex: 1002 }} />

            {/* Label Container */}
            <motion.div
                className="callout-text-container"
                style={{
                    left: `${lineX + horizontalWidth}px`,
                    top: `${lineY}px`,
                    transform: side === 'left' ? 'translateX(-100%)' : 'none'
                }}
                initial={{ opacity: 0, x: side === 'left' ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
            >
                <div className="callout-id">{label}</div>
                <div className="callout-status">SYNC_ACTV</div>
            </motion.div>
        </motion.div>
    );
};

const CubeCallouts = () => {
    const [callouts, setCallouts] = useState([]);

    useEffect(() => {
        console.log("CubeCallouts mounted");
        const generate = () => {
            const side = Math.random() > 0.5 ? 'right' : 'left';
            const newCallout = {
                id: Date.now() + Math.random(),
                x: 20 + Math.random() * 60,
                y: 20 + Math.random() * 60,
                label: `ID-0x${Math.floor(Math.random() * 0xFFF).toString(16).toUpperCase().padStart(3, '0')}`,
                side
            };
            console.log("Generating callout:", newCallout);
            setCallouts(prev => [...prev.slice(-3), newCallout]);
        };

        const interval = setInterval(generate, 2500);
        generate();
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="cube-callouts-layer" style={{ border: '2px dashed yellow' }}>
            {callouts.map(c => (
                <Callout key={c.id} {...c} />
            ))}
        </div>
    );
};

export default CubeCallouts;
