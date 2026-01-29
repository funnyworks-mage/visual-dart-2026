import * as THREE from 'three';

/**
 * Extracts a dominant color from an image and applies HSL boosting 
 * for cinematic background visuals.
 */
export const extractCornerColors = (imageUrl, callback) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 20; canvas.height = 20;
        ctx.drawImage(img, 0, 0, 20, 20);
        const data = ctx.getImageData(0, 0, 20, 20).data;

        const getPowerColor = (xStart, xEnd, yStart, yEnd) => {
            let rTotal = 0, gTotal = 0, bTotal = 0, weightTotal = 0;
            for (let y = yStart; y < yEnd; y++) {
                for (let x = xStart; x < xEnd; x++) {
                    const idx = (y * 20 + x) * 4;
                    const r = data[idx], g = data[idx + 1], b = data[idx + 2];

                    // Standard color conversion
                    const c = new THREE.Color(`rgb(${r},${g},${b})`);
                    const h = {}; c.getHSL(h);

                    // Weighing logic: Favor pixels with some saturation over pure grey/black
                    // but stay grounded in the average RGB to keep the atmospheric mood.
                    const weight = (h.s * 0.5 + 0.5) * (h.l > 0.05 ? 1.0 : 0.1);

                    rTotal += r * weight;
                    gTotal += g * weight;
                    bTotal += b * weight;
                    weightTotal += weight;
                }
            }

            if (weightTotal === 0) return '#000000';

            const avgR = Math.round(rTotal / weightTotal);
            const avgG = Math.round(gTotal / weightTotal);
            const avgB = Math.round(bTotal / weightTotal);

            const final = new THREE.Color(`rgb(${avgR},${avgG},${avgB})`);
            const h = {}; final.getHSL(h);

            // Subtle cinematic boost: slightly darken and boost saturation of the average
            final.setHSL(h.h, Math.min(h.s * 1.3, 0.9), h.l * 0.6);

            return `#${final.getHexString()}`;
        };

        callback({
            tl: getPowerColor(0, 7, 0, 7),
            tr: getPowerColor(13, 20, 0, 7),
            bl: getPowerColor(0, 7, 13, 20),
            br: getPowerColor(13, 20, 13, 20)
        });
    };
};
