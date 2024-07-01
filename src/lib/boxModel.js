import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import MemoryManager from "./memoryManager";
class BoxModel {
    constructor(core) {
        this.core = core;
        this.elapsedTime = { value: 0 };
        this.boxModel = null;
        this.position = null;
        this.lightIndex = 0;
        this.lastRenderTime = 0; // 上次计算时间
        this.newInter = null;
        this.Lines = [];
    }
    initModel(center,radius) {
        this.position = center;
        if (this.boxModel) {
            this.dispose();
        }
        let shaderMaterial = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: false,
            alphaTest: 1,
            uniforms: {
                uTime: this.elapsedTime,
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                        }
                        `,
            fragmentShader: `
                        uniform float uTime;
                        varying vec2 vUv;
                        #define PI 3.14159265

						vec2 lll(float x){
							return vec2(x - 0.001,x+0.001);
						}

                        void main(){

                          vec3 color1 = vec3(0.25882353,0.392156863,0.6627451);
                          vec3 color2 = vec3(0.239215686,0.2117647,0.6627451);
                          vec3 color3 = mix(color1,color2,0.8);
                          vec4 baseColor = vec4(color3,1.0);

                        // vec4 baseColor = vec4(0.3568, 0.359375, 0.7804, 1.0);
                        // vec4 baseColor = vec4(0., 0., 1., 1.0);
                        vec4 flowColor = vec4(1,1,1,1);
                        vec4 finalColor;

                        float amplitude = 1.;
                        float frequency = 10.;

                        float x = vUv.x;

                        float y = sin(x * frequency);
                        float t = 0.01*(-uTime*130.0);
                        y += sin(x*frequency*2.1 + t)*4.5;
                        y += sin(x*frequency*1.72 + t*1.121)*4.0;
                        y += sin(x*frequency*2.221 + t*0.437)*5.0;
                        y += sin(x*frequency*3.1122+ t*4.269)*2.5;
                        y *= amplitude*0.012;
                        y /= 3.;
                        y += 0.55;

                        vec4 color = gl_FragColor.rgba;

                        float r = step(0.5, fract(vUv.y - uTime));

                        baseColor.a = step(vUv.y,y) * (y-vUv.y)/y * 0.4;



                        vec2 base1 = lll(0.1);
                        vec2 base2 = lll(0.3);
                        vec2 base3 = lll(0.4);

                        gl_FragColor = baseColor;

                        }
                        `,
        });
        let shaderMaterialTou = new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            color: "#ffffff",
            side: THREE.BackSide,
        });
        let shaderMaterial2 = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: false,
            alphaTest: 1,
            uniforms: {
                uTime: this.elapsedTime,
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                        }
                        `,
            fragmentShader: `
                        uniform float uTime;
                        varying vec2 vUv;

                        void main(){

                          vec3 color1 = vec3(0.2078, 0.4431, 0.6588); // 蓝色
                          vec3 color2 = vec3(0.1529, 0.0824, 0.3922); // 紫色
                          vec3 colorL = vec3(0.,0.,1.);
                          vec2 center = vec2(0.5,0.5);
                          float distance = distance(center,vUv);
                          vec3 color3 = mix(color1,color2,sqrt(distance));
                          // vec3 color3 = mix(color1,color2,0.);
                        gl_FragColor = vec4(color3,0.4);

                        }
                        `,
        });

        // todo
        let shaderMaterial3 = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: true,
            alphaTest: 1,
            uniforms: {
                uTime: this.elapsedTime,
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                        }
                        `,
            fragmentShader: `
                        uniform float uTime;
                        varying vec2 vUv;

                        void main(){
                          vec2 uv = (vUv-.5)*2.;
                          vec2 frac=fract(uv*24.);
                          float vertical_lines=step(frac.x,.01);
                          float horizontal_lines=step(frac.y,.01);
                          float lines=vertical_lines+horizontal_lines;
                          vec3 col=vec3(lines);

                          // create circles
                          float d=length(uv);
                          d=sin(d*3.-uTime*1.32)/24.;
                          d=abs(d);
                          d=pow(.005/d,1.2);
                          col*=d;
                          vec4 color=vec4(.6,.3922,.9137,1.);
                          gl_FragColor=vec4(col,.08);

                        }
                        `,
        });
        const textureLoader = new THREE.TextureLoader();
        const bg = textureLoader.load("/icon_20210625174703331_294105.png");
        bg.colorSpace = THREE.SRGBColorSpace;
        let shaderMaterial4 = new THREE.ShaderMaterial({
            side: THREE.DoubleSide,
            transparent: true,
            depthWrite: true,
            depthTest: true,
            alphaTest: 1,
            uniforms: {
                uTime: this.elapsedTime,
                glowFactor: {
                    value: 1.0, // 扩撒圈的明暗程度
                },
                uColor: {
                    value: new THREE.Color("#60C6FF"),
                },
                flowColor: {
                    value: new THREE.Color("#EEF5F5"),
                },
                bg: {
                    value: bg,
                },
                opacity: {
                    value: 0.4,
                },
                alpha: {
                    value: 2.5,
                },
                speed: { value: 1 },
            },
            vertexShader: `
                        varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                        }
                        `,
            fragmentShader: `
                        uniform float uTime;
                        uniform sampler2D bg;
                        uniform vec3 uColor;
                        uniform float speed;
                        uniform float opacity;
                        uniform vec3 flowColor;
                        uniform float alpha;
                        uniform float glowFactor;
                        varying vec2 vUv;

                        void main() {
                            float repeatFactor =1.0;
                            vec2 mapUv = vUv * repeatFactor;
                            float t=mod(uTime/5.*speed,1.);
                            vec2 uv=abs((vUv-vec2(0.5))*2.0);
                            float dis = length(uv);
                            float r = t-dis;
                            vec4 col=texture2D(bg, mapUv);
                            vec3 finalCol;
                            vec4 mask = texture2D(bg, vec2(0.5,r));
                            finalCol = mix(uColor,flowColor,clamp(0.,1.,mask.a*glowFactor));
                            gl_FragColor= vec4(finalCol.rgb,(alpha+mask.a*glowFactor)*col.a*(1.-dis)*opacity);
                            }
                        `,
        });
        const geometry = new THREE.BoxGeometry(radius * 20,20,radius * 20);
        const materials = [
            shaderMaterial, // 前面
            shaderMaterial, // 后面
            shaderMaterialTou, // 顶部
            shaderMaterial4, // 底部
            shaderMaterial, // 左侧
            shaderMaterial, // 右侧
        ];
        this.boxModel = new THREE.Mesh(geometry,materials);
        this.boxModel.position.set(this.position.x,this.position.y,this.position.z);
        this.core.scene.add(this.boxModel);
    }
    lightAnimate() {
        this.Lines.map((child,index) => {
            child.material = new THREE.ShaderMaterial({
                side: THREE.DoubleSide,
                vertexShader: `varying vec2 vUv;
                        void main(){
                            vUv = uv;
                            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                        }`,
                fragmentShader: `
        uniform float uTime;
        uniform float uIndex;
      varying vec2 vUv;
      vec3 color1 = vec3(0.133333,0.164706,0.427451);
      vec3 color2 = vec3(0.3764706,0.341176,0.698);
      void main() {
        vec3 color = mix(color1,color2,cos(uTime*4. - uIndex+8.));
        gl_FragColor=vec4(color,0.8);
      }
      `,
                uniforms: {
                    uTime: this.elapsedTime,
                    uIndex: {
                        value: index,
                    },
                },
                transparent: true,
                depthTest: false,
                depthWrite: false,
            });
            this.core.postprocessing.addBloom(child);
        });
    }
    dispose() {
        MemoryManager.dispose(this.boxModel);
    }
    update(value) {
        const relTime = value - this.lastRenderTime;
        this.elapsedTime.value = value;
    }
}

export default BoxModel;
