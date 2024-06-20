import { DAY, NIGHT } from "../../three/components/weather";
import { uStyle } from "../constant";

export function brightenNight(material, intensity = 10) {
    material.onBeforeCompile = shader => {
        shader.uniforms.uStyle = uStyle;
        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <common>`,
            `
            #include <common>
            uniform float uStyle;
        `,
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <dithering_fragment>`,
            `
            #include <dithering_fragment>
            if(uStyle == ${DAY}.){
            }else if(uStyle == ${NIGHT}.){
                vec3 color = gl_FragColor.xyz;
                gl_FragColor = vec4(color*${intensity}.,0.8);
            }
        `,
        );
    };
}

export function brighten(material, intensity = 10) {
    material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <dithering_fragment>`,
            `
            #include <dithering_fragment>
            vec3 color = gl_FragColor.xyz;
            gl_FragColor = vec4(color*${intensity}.,0.8);
        `,
        );
    };
}
