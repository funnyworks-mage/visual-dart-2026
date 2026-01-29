import React from 'react';
import { EffectComposer, Bloom, ChromaticAberration, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

const PostEffects = () => {
    return (
        <EffectComposer disableNormalPass>
            <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={[0.002, 0.002]}
            />
            {/* Bloom disabled to debug brightness */}
            {/* <Bloom intensity={0.2} luminanceThreshold={0.8} mipmapBlur /> */}
            <Noise
                opacity={0.05}
                blendFunction={BlendFunction.OVERLAY}
            />
            {/* <Vignette
                eskil={false}
                offset={0.5}
                darkness={0.5}
            /> */}
        </EffectComposer>
    );
};

export default PostEffects;
