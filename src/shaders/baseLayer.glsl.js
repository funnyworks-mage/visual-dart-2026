export const BASE_VERTEX = `
    uniform vec2 uMouse; uniform float uTime; uniform float uExitProgress; uniform float uProgress; uniform float uDirection;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Image stays static but reacts to mouse depth

        vec2 gridMouse = (uMouse - 0.5) * vec2(20.0, 13.5);
        float distToMouse = distance(pos.xy, gridMouse);
        float strength = smoothstep(12.0, 0.0, distToMouse);
        pos.z += strength * 3.5 * sin(uTime * 1.5 + distToMouse * 0.4);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

export const BASE_FRAGMENT = `
    uniform sampler2D uTexture; uniform float uProgress; uniform float uExitProgress; uniform float uTime;
    varying vec2 vUv;

    float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    void main() {
        float glitchAmount = uExitProgress > 0.0 ? uExitProgress : (1.0 - uProgress);
        vec2 uv = vUv;

        if (glitchAmount > 0.01) {
            // Finer, more technical scanlines
            float yLines = 128.0; 
            float lineHash = hash(vec2(floor(uv.y * yLines), uTime * 0.8));
            if (lineHash > (1.0 - glitchAmount * 0.4)) {
                uv.x += (hash(vec2(lineHash, uTime)) - 0.5) * glitchAmount * 0.04;
            }
            
            // Smaller, subtler block noise
            float blocks = 64.0;
            vec2 blockUv = floor(uv * blocks) / blocks;
            if (hash(blockUv + uTime * 0.3) < glitchAmount * 0.15) {
                uv += (hash(uv + uTime) - 0.5) * 0.03;
            }
        }

        vec4 tex = texture2D(uTexture, uv);
        vec3 color = tex.rgb;
        
        // Subtle RGB Split during glitch
        if (glitchAmount > 0.1) {
            float r = texture2D(uTexture, uv + vec2(glitchAmount * 0.003, 0.0)).r;
            float b = texture2D(uTexture, uv - vec2(glitchAmount * 0.003, 0.0)).b;
            color = vec3(r, color.g, b);
        }

        color = mix(vec3(0.5), color, 1.15); // Contrast
        color *= 1.1;

        float mask = smoothstep(0.0, 0.45, vUv.x) * smoothstep(1.0, 0.55, vUv.x) * 
                     smoothstep(1.0, 0.55, vUv.y) * smoothstep(0.0, 0.45, vUv.y);
        
        // CRT TV On/Off Effect (Optimized - No Edge Glow)
        float crtMask = 1.0;
        float distY = abs(vUv.y - 0.5) * 2.0;
        float distX = abs(vUv.x - 0.5) * 2.0;

        if (uExitProgress > 0.01) {
            float vScan = 1.0 - clamp(uExitProgress * 1.43, 0.0, 1.0);
            float hScan = 1.0 - clamp((uExitProgress - 0.7) * 3.33, 0.0, 1.0);
            crtMask = step(distY, vScan) * step(distX, hScan);
        } else {
            float hScan = clamp(uProgress * 3.33, 0.0, 1.0);
            float vScan = clamp((uProgress - 0.3) * 1.43, 0.0, 1.0);
            crtMask = step(distY, vScan) * step(distX, hScan);
        }

        gl_FragColor = vec4(color, mask * crtMask * 0.95); 
    }
`;
