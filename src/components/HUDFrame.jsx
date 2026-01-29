import React from 'react';
import { useMotionValue } from 'framer-motion';
import { Menu } from 'lucide-react';
import logo from '../assets/logo.png';
import { MENU_ITEMS } from '../constants/menu';

const MetadataStream = ({ active }) => {
    const [stream, setStream] = React.useState('STATUS: OK');
    const labels = ['SYNC_TARGET', 'BUFFER_STREAM', 'CORE_TEMP', 'ARCHIVE_INDEX', 'PKT_LOSS', 'UI_LATENCY'];

    React.useEffect(() => {
        const interval = setInterval(() => {
            const label = labels[Math.floor(Math.random() * labels.length)];
            const val = (Math.random() * 100).toFixed(2);
            setStream(`${label}: ${val}%`);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return <span className="metadata-stream">{stream}</span>;
};

const TerminalFeed = () => {
    const [logs, setLogs] = React.useState([]);
    const pool = [
        'SYSP:GMRK1-21', 'RETRIEVE PASS 2', 'REDUNDANCY ON TAPE LCAC', 'LABEL OP OPERANDS',
        'JO8 JB 1401 AUTOCODER', 'SYSTP.GMRK1-1', 'TSTSS LOOP1', 'GMRK1=2.999999',
        'INIT_BUFFER_0x2F', 'HEX_STREAM_A: 08:09:10', 'MEM_DUMP_01: OK', 'IO_DRIVE: READY'
    ];

    React.useEffect(() => {
        const interval = setInterval(() => {
            const newLine = pool[Math.floor(Math.random() * pool.length)];
            setLogs(prev => [...prev.slice(-6), newLine]);
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="terminal-feed">
            {logs.map((log, i) => (
                <div key={i} className="terminal-line" style={{ opacity: (i + 1) / logs.length * 0.4 }}>
                    {log}
                </div>
            ))}
        </div>
    );
};

const GridScanner = () => {
    const [scans, setScans] = React.useState([]);

    React.useEffect(() => {
        const interval = setInterval(() => {
            const newScan = {
                id: Math.random(),
                x: Math.floor(Math.random() * 10) * 10 + 5, // Round to grid intersections
                y: Math.floor(Math.random() * 8) * 10 + 10,
                label: `SEC-0x${Math.floor(Math.random() * 255).toString(16).toUpperCase()}`
            };
            setScans(prev => [...prev.slice(-3), newScan]);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="grid-scanner-layer">
            {scans.map(scan => (
                <div
                    key={scan.id}
                    className="scan-point"
                    style={{ left: `${scan.x}%`, top: `${scan.y}%` }}
                >
                    <div className="scan-box" />
                    <span className="scan-label">{scan.label}</span>
                </div>
            ))}
        </div>
    );
};

const ScrambleText = ({ text, isActive }) => {
    const [displayText, setDisplayText] = React.useState(text);
    const chars = '!<>-_\\/[]{}—=+*^?#________';
    const frameRef = React.useRef(0);

    React.useEffect(() => {
        if (!isActive) {
            setDisplayText(text);
            return;
        }

        let frame = 0;
        const maxFrames = 12;
        const scramble = () => {
            if (frame >= maxFrames) {
                setDisplayText(text);
                return;
            }

            const scrambled = text.split('').map((char, i) => {
                if (char === ' ') return ' ';
                if (frame / maxFrames > (i / text.length) + 0.1) return char;
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');

            setDisplayText(scrambled);
            frame++;
            frameRef.current = requestAnimationFrame(scramble);
        };

        scramble();
        return () => cancelAnimationFrame(frameRef.current);
    }, [isActive, text]);

    return <span>{displayText}</span>;
};


const HUDFrame = ({ activeIndex, total, onSelect }) => {
    const containerRef = React.useRef();
    const mX = useMotionValue(0);
    const mY = useMotionValue(0);
    const [displayCoords, setDisplayCoords] = React.useState({ x: 0, y: 0 });

    React.useEffect(() => {
        const handleMouseMove = (e) => {
            if (containerRef.current) {
                const { clientX, clientY } = e;
                containerRef.current.style.setProperty('--mx', `${clientX}px`);
                containerRef.current.style.setProperty('--my', `${clientY}px`);
                mX.set(clientX);
                mY.set(clientY);

                // Use functional update to avoid dependency on displayCoords
                setDisplayCoords(prev => {
                    if (Math.abs(clientX - prev.x) > 2 || Math.abs(clientY - prev.y) > 2) {
                        return { x: clientX, y: clientY };
                    }
                    return prev;
                });
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []); // Empty deps now stable

    return (
        <div className="hud-frame" ref={containerRef}>
            <GridScanner />

            <div className="bottom-left-hud">
                <TerminalFeed />
                {/* Pointer Information */}
                <div className="pointer-coords">
                    <span className="label">PTR-DATA //</span>
                    X: <span className="val">{displayCoords.x}</span>
                    <span className="sep"> / </span>
                    Y: <span className="val">{displayCoords.y}</span>
                    <span className="sep" style={{ margin: '0 12px', opacity: 0.1 }}>|</span>
                    <MetadataStream />
                </div>
            </div>
            {/* Grid Snap Brackets */}
            <div className="grid-line-h1" /><div className="grid-line-h2" /><div className="grid-line-h3" />
            <div className="grid-line-v1" /><div className="grid-line-v2" />

            {/* Grid Snap Brackets */}
            <div className="grid-snap-x" />
            <div className="grid-snap-y" />

            <div className="header-logo">
                <img src={logo} alt="VISUAL DART" style={{ height: '34px', filter: 'brightness(0) invert(1)' }} />
            </div>

            <div className="header-menu">
                <div className="burger-box">
                    <div className="corner-dot dot-tl" /><div className="dot-tr corner-dot" />
                    <div className="dot-bl corner-dot" /><div className="dot-br corner-dot" />
                    <Menu size={18} color="#fff" strokeWidth={1.5} />
                </div>
            </div>

            <div className="category-container">
                <div className="category-main"><span style={{ opacity: 0.5 }}>::</span> GAME ART OUTSOURCING</div>
                <div className="category-sub">CO-DEVELOPMENT</div>
            </div>

            <div className="side-menu-container">
                {MENU_ITEMS.map((item, idx) => (
                    <div
                        key={idx}
                        className={`side-label ${idx === activeIndex ? 'active' : ''}`}
                        onClick={() => onSelect?.(idx)}
                        style={{ justifyContent: 'flex-end' }}
                    >
                        <ScrambleText text={item} isActive={idx === activeIndex} />
                        {idx === activeIndex && <span className="bracket-r">]</span>}
                    </div>
                ))}
            </div>

            <div className="bottom-btn-container">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <button className="view-more-btn"><span className="plus">+</span> VIEW MORE</button>
                    <div className="hud-page-count">0{activeIndex + 1} / 0{total}</div>
                </div>
            </div>
        </div>
    );
};

export default HUDFrame;
