export const fresnelChunk = /* glsl */ `
    // 计算视线方向：从物体表面点到相机的方向向量
    vec3 viewDir = normalize(cameraPosition - mPosition.xyz);
    
    // 计算菲涅尔效果强度：
    // 1. dot(mNormal, viewDir) 计算法线和视线方向的点积，值在[-1,1]之间
    // 2. 1.0 - dot(...) 将结果反转，使得视线与法线夹角越大，强度越大
    float intensity = 1.0 - dot(mNormal, viewDir);
    
    // 设置最终颜色：
    // - uColor: 基础颜色
    // - pow(intensity, fresnelLevel): 对强度进行指数运算，fresnelLevel控制边缘效果的锐利程度
    gl_FragColor = vec4(uColor, pow(intensity, fresnelLevel));

    // 注释掉的替代方案：
    // 使用绿色通道显示强度，蓝色通道显示经过指数运算后的强度
    // gl_FragColor = vec4(0.0, intensity, intensity, pow(intensity,3.0)*0.6);
    
`;
