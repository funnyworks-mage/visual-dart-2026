export const VOXEL_VERTEX = `
    attribute vec4 aRandom; attribute vec3 aPos; attribute vec2 aUv; attribute float aIsDebris;
    uniform float uTime; uniform float uProgress; uniform vec2 uMouse; uniform float uSeed; 
    uniform float uExitProgress; uniform float uDirection;
    varying vec2 vUv; varying vec3 vNormal; varying vec4 vRandom; varying float vMouseAlpha; varying float vActive;
    varying vec2 vLocalUv; varying float vIsDebris;
    
    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    void main() {
        vUv = aUv;
        vRandom = aRandom;
        vIsDebris = aIsDebris;
        
        vLocalUv = position.xy + 0.5; 
        
        vec3 pos = aPos;
        float p = smoothstep(0.0, 1.0, clamp((uProgress - aRandom.w * 0.4) / 0.6, 0.0, 1.0));
        
        if (aIsDebris > 0.5) {
            // Ambient Floating Dust Logic (Clean & Fine)
            pos = aPos; 
            
            // Subtle 3D drifting motion
            float driftSpeed = 0.15;
            pos.x += sin(uTime * driftSpeed + aRandom.x * 20.0) * 2.0;
            pos.y += cos(uTime * driftSpeed * 0.8 + aRandom.y * 20.0) * 2.0;
            pos.z += sin(uTime * driftSpeed * 0.5 + aRandom.z * 20.0) * 2.5;
            
            vec3 particlePos = position;
            // Correction: Counter-scale Z-axis because the shared geometry is stretched (Z=2.76 while X,Y=0.36)
            particlePos.z *= (0.36 / 2.76); 
            particlePos *= 0.12; // Reverted to clean dust size
            
            vec4 worldPos = modelMatrix * vec4(pos + particlePos, 1.0);
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
            
            vActive = 1.0;
            vMouseAlpha = 0.8; 
            return;
        }

        // Standard Fragment Logic (Image Core) - FIXED POSITION
        float nx = aUv.x - 0.5; float ny = aUv.y - 0.5;
        float dx = abs(nx * 2.05); float dy = abs(ny * 2.05);
        float dist = pow(dx, 6.0) + pow(dy, 6.0);
        float prob = 1.0 - min(dist * 0.9, 1.0);
        if (max(abs(nx * 2.0), abs(ny * 2.0)) > 0.82) prob *= 0.6;
        
        vActive = hash(aRandom.x * 100.0 + uSeed) < prob ? 1.0 : 0.0;
        
        p = smoothstep(0.0, 1.0, clamp((uProgress - aRandom.w * 0.4) / 0.6, 0.0, 1.0));
        pos = aPos;
        
        // Stable orientation & Fixed Position during transition
        float edgeDist = max(abs(aUv.x - 0.5), abs(aUv.y - 0.5)) * 2.0;
        float edgeWeight = smoothstep(0.3, 0.95, edgeDist); 
        float pulse = sin(uTime * 1.8 + aRandom.x * 20.0) * 1.8;
        
        pos.z += pulse * edgeWeight * p;
        
        vec2 gridMouse = (uMouse - 0.5) * vec2(20.0, 13.0);
        float distToMouse = distance(pos.xy, gridMouse);
        vMouseAlpha = mix(0.15, 1.0, smoothstep(1.5, 8.0, distToMouse));
        
        pos.z -= 4.0 * p;
        float pull = 1.0 - smoothstep(0.0, 8.0, distToMouse);
        pos.z += pull * (7.5 + aRandom.z * 2.5) * p;
        
        // --- Option 1: Digital Displacement Glitch ---
        float glitchAmount = uExitProgress > 0.0 ? uExitProgress : (1.0 - uProgress);
        if (glitchAmount > 0.1) {
            float blocks = 16.0;
            float blockY = floor(aUv.y * blocks);
            float offset = (hash(blockY + uTime * 10.0) - 0.5) * glitchAmount * 8.0;
            if (hash(blockY + uSeed) > 0.4) {
                pos.x += offset;
            }
        }
        // --------------------------------------------
        
        vec3 localPos = position * vActive;

        vec4 worldPos = modelMatrix * vec4(pos + localPos, 1.0);
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const VOXEL_FRAGMENT = `
    uniform sampler2D uTexture; uniform vec3 uAccentColor; uniform float uProgress; uniform float uExitProgress; uniform float uTime;
    varying vec2 vUv; varying vec3 vNormal; varying vec4 vRandom; varying float vMouseAlpha; varying float vActive;
    varying vec2 vLocalUv; varying float vIsDebris;

    void main() {
        if (vActive < 0.5) discard;
        
        if (vIsDebris > 0.5) {
            // Sequential Random Debris Logic (Atmospheric Lifecycle)
            vec3 finalColor = uAccentColor * 0.2; // Base dark dust
            float finalAlpha = vMouseAlpha * 0.1;
            
            // Selection Probability (Increased to 15% to account for duty cycle)
            if (vRandom.w > 0.85) { 
                // Individual Cycle Logic
                float randomOffset = vRandom.x * 20.0;
                float totalPeriod = 6.0 + vRandom.y * 4.0; // 6 to 10 second cycle
                float activeDuration = 2.0 + vRandom.z * 1.5; // 2 to 3.5 second lit time
                
                float cycleTime = mod(uTime + randomOffset, totalPeriod);
                // Mask for 2-3 seconds activity window with smooth fade in/out
                float lifeWindow = smoothstep(0.0, 0.8, cycleTime) * (1.0 - smoothstep(activeDuration - 0.8, activeDuration, cycleTime));
                
                if (lifeWindow > 0.01) {
                    vec3 amberColor = vec3(1.0, 0.7, 0.1); 
                    vec3 debrisColor = amberColor;
                    
                    float dist = length(vLocalUv - 0.5);
                    float halo = exp(-dist * 4.5); 
                    
                    float intensity = (45.0 + sin(uTime * 0.5) * 5.0) * lifeWindow;
                    
                    finalColor = mix(finalColor, debrisColor * (1.5 + intensity * halo), lifeWindow);
                    finalAlpha = mix(finalAlpha, vMouseAlpha * halo * (0.3 + intensity * 0.1), lifeWindow);
                }
            }
            
            gl_FragColor = vec4(finalColor, finalAlpha);
            return;
        }
        
        // Texture Slicing logic:
        // Sample the texture based on the fragment's global grid position (vUv) 
        // plus a small offset derived from the pixel's local position inside the cube face (vLocalUv).
        // The slice factor ensures the detail is mapped correctly.
        vec2 sliceFactor = vec2(0.36 / 25.8, 0.36 / 16.2); 
        vec2 slicedUv = vUv + (vLocalUv - 0.5) * sliceFactor;
        vec4 tex = texture2D(uTexture, slicedUv);
        // Subtle 3D lighting for depth without overexposure
        vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
        float diff = dot(normalize(vNormal), lightDir);
        float lighting = mix(0.85, 1.05, smoothstep(-0.5, 1.0, diff));

        // Content Switch Logic: Cubes are "Displays" that stay while images swap
        float contentWeight = 1.0;
        if (uExitProgress > 0.0) {
            contentWeight = smoothstep(1.0, 0.9, uExitProgress);
        } else {
            contentWeight = smoothstep(0.1, 0.4, uProgress);
        }

        vec3 color = tex.rgb * lighting;
        
        // --- Option 3: Data Noise Flash (Static) ---
        float glitchAmount = uExitProgress > 0.0 ? uExitProgress : (1.0 - uProgress);
        if (glitchAmount > 0.05) {
            // High-speed static noise logic
            float n = fract(sin(dot(vUv * uTime, vec2(12.9898, 78.233))) * 43758.5453);
            vec3 noiseColor = vec3(n * 1.5); // Bright white/gray noise
            float noiseMix = smoothstep(0.1, 0.8, glitchAmount);
            color = mix(color, noiseColor, noiseMix * 0.6); // Mix noise into original color
        }
        // -------------------------------------------

        // Display "Standby" state: A faint glow of the accent color
        vec3 standbyColor = uAccentColor * 0.4 * lighting;
        color = mix(standbyColor, color, contentWeight);
        
        float randomAlpha = mix(0.7, 1.0, vRandom.y);
        float feather = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.58, vUv.x) * 
                        smoothstep(1.0, 0.58, vUv.y) * smoothstep(0.0, 0.42, vUv.y);
        float fadeOut = smoothstep(1.0, 0.8, uExitProgress);
        float fadeIn = smoothstep(0.0, 0.35, uProgress);
        
        // CRT TV On/Off Mask (Synchronized with baseLayer)
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

        // Combine all alpha factors
        float finalAlpha = 0.8 * feather * randomAlpha * vMouseAlpha * fadeIn * fadeOut * crtMask;
        
        gl_FragColor = vec4(color, finalAlpha); 
    }
`;
