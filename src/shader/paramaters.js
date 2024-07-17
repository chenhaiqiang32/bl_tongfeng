/** @description 灯光风格控制器 4白天，8夜晚 16科技风 */
import * as THREE from "three";
import { fresnelChunk } from './lib/fresnel';
export const DAY = 4;
export const NIGHT = 8;
export const SCIENCE = 16;
export const lightingPattern = {
    value: SCIENCE,
};
export const elapsedTime = {
    value: 0,
};

export const fresnelChangeColor = {
    "#1通风机": {
        value: new THREE.Color(0.9451,0.9451,0.5725)
    },
    "#2通风机": {
        value: new THREE.Color(0.9451,0.9451,0.5725)
    },
};
export const fresnelColorBlue = {
    "深蓝偏紫": {
        value: new THREE.Color("#007BFF")
    },
    "道奇蓝": {
        value: new THREE.Color("#1E90FF")
    },
    "天蓝": {
        value: new THREE.Color("#87CEEB")
    },
    "深天蓝": {
        value: new THREE.Color("#00BFFF")
    },
    "浅蓝绿色": {
        value: new THREE.Color("#ADD8E6")
    },
    "亮钢兰色": {
        value: new THREE.Color("#B0C4DE")
    },
};
export const fresnelLevelS = {
    "base": {
        value: 2.8
    },
    "level2": {
        value: 1.8
    },
    "level3": {
        value: .8
    },
    "level4": {
        value: 10.8
    },
    "levelN": {
        value: 1000.8
    },
};

export const flowTime = {
    value: 0,
};
// 窗户玻璃动画时间
export const glassTime = {
    value: 0,
};
/**
 * @description 着色器定位锚点
 * @SHADER_END  着色器最终输出值处
 * @DIFFUSE_EN 着色器漫反射结束点
 * @SHADER_UNIFORM 着色器uniform添加处
 */
export const SHADER_END = "//#shader_end#";
export const SHADER_UNIFORM = "//#shader_uniform#";
export const DIFFUSE_END = "//#diffuse_end#";
