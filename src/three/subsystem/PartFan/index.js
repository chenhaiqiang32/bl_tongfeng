import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
import { Subsystem } from "../Subsystem";
import { loadGLTF,loadOBJ } from "../../loader";
import { partFan_models } from "@/assets/models";
import { Core3D } from "../..";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import {
    processingCommonModel,
    processingAnimations,
} from "../../processing";

import { FlowLight } from "../../../lib/blMeshes";
import { loadTexture } from "../../../utils/texture";
import { Stars } from "../../../lib/stars";
import { PlatformCircle } from "../../../lib/PlatformCircle";
import { LabelEntity } from "../../../lib/LabelEntity";
import { changeFresnel,changeFresnelSkinColor,shaderModify } from "../../../shader/shaderModify";
import { Reflector } from "../../../lib/Reflector";
import { getBoxAndSphere } from "../../../utils";
import BoxModel from "../../../lib/boxModel";
import { fresnelChangeColor,fresnelColorBlue,fresnelLevelS } from "../../../shader/paramaters";

export const fan = Symbol();

const position = new THREE.Vector3(-8.8,0,-4);
const target = new THREE.Vector3();

// camera limit SPHERE
const SPHERE_CAMERA = new THREE.Sphere(new THREE.Vector3(),150);
const SPHERE_CONTROLS = new THREE.Sphere(new THREE.Vector3(),149);

/**@type {OrbitControls} */
const controlsParameters = {
    maxPolarAngle: Math.PI / 2.2,
    enablePan: false,
    maxAzimuthAngle: 0, // 右侧
    minAzimuthAngle: Math.PI, // 左侧
    maxDistance: 15,
    // enableZoom: false
};

const labelData = [
    {
        name: "1号通风机",
        position: [-2.69,5.25,0]
    },
    {
        name: "2号通风机",
        position: [2.69,5.25,0]
    }
];

/**@classdesc 包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class PartFanSubsystem extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);
        this.boxModelObj = new BoxModel(core);
        this.postprocessing = core.postprocessing;
        this.elapsedTime = 0;

        this.init();

        /** @type {FlowLight[]} */
        this.flowLights = [];
        this.bloomLights = [];
        this.ground = null;
        this.fenJi = null;
        this.raycastEvents = [];
        let data = {
            direction: 0 // 0 顺丰  1 逆风
        };

        this.fanner1 = {
            name: "#1通风机",
            actions: [],
            state: false,
            tweenCode: null,
            flowLights: [],
            object: [],
        };

        this.fanner2 = {
            name: "#2通风机",
            actions: [],
            state: false,
            tweenCode: null,
            flowLights: [],
            object: [],
        };
        this.data = {
            direction: 0
        };
        this.shaderColor = {
            wall: new THREE.Color(0.4431,0.4784,0.502),
            shan: new THREE.Color(0.9569,0.9843,0.5882),
            dian: new THREE.Color(0.0588,0.1373,0.9686),
            skinCheck: new THREE.Color(0.2275,0.9961,0.7922),
        };
    }

    init() {
        this.initScene();
    }



    addEvents() { }

    removeEvents() {
        this.raycastEvents.forEach(clear => clear());
        this.raycastEvents.length = 0;
    }

    handleControls() {
        // this.camera.position.copy(position);
        // this.controls.target.copy(target);

        this.controls.addEventListener("change",this.limitInSphere);

        Reflect.ownKeys(controlsParameters).forEach(key => {
            this.controls.data[key] = this.controls[key];
            this.controls[key] = controlsParameters[key];
        });
    }

    resetControls() {
        this.controls.removeEventListener("change",this.limitInSphere);

        Reflect.ownKeys(controlsParameters).forEach(key => {
            this.controls[key] = this.controls.data[key];
        });
    }

    limitInSphere = () => {
        this.camera.position.clampSphere(SPHERE_CAMERA);
        this.controls.target.clampSphere(SPHERE_CONTROLS);
    };

    async onEnter() {
        this.handleControls();
        this.onRenderQueue.set(fan,this.update);

        await loadGLTF(partFan_models,this.onProgress);
        await loadOBJ(partFan_models,this.onOBJProgress);

        this.onLoaded();
    }


    /**
     * @param {import("three/examples/jsm/loaders/GLTFLoader").GLTF} gltf
     * @param {string} name
     */
    onProgress = (gltf,name) => {
        if (this.core.scene !== this.scene) return;
        let group;
        let color1 = {
            data: ["TY-144","TY-09","TY-144_TM"],
            color: fresnelColorBlue["深蓝偏紫"].value
        };
        let JSkin = [];
        let color2 = {
            data: [],
            color: fresnelColorBlue["道奇蓝"].value
        };
        let color3 = {
            data: ["TY-136"],
            color: fresnelColorBlue["天蓝"].value
        };
        let color4 = {
            data: ["TY-09","TY-144_轮廓线"],
            color: fresnelColorBlue["深天蓝"].value
        };
        let color5 = {
            data: ["BL_TYJS_067"],
            color: fresnelColorBlue["浅蓝绿色"].value
        };
        if (name === "wall") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.transparent = false;
                    if (child.material.name === "通风水泥") {
                        child.material.map = null;
                    }
                }

            });
        }
        if (name === "equip") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.renderOrder = 1;
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.onBeforeCompile = shader => {
                        shaderModify(shader,{ shader: "pumpModify",color: color5.color,shaderName: "level2" });
                    };
                }
            });
        }
        // if (name === "test") {
        //     gltf.scene.traverse(child => {
        //         if (child instanceof THREE.Mesh) {
        //             child.position.y = 3.2;
        //             child.renderOrder = 0;
        //             child.material = child.material.clone();
        //             child.material.transparent = true;
        //             child.material.onBeforeCompile = shader => {
        //                 shaderModify(shader,{ shader: "pumpModify",color: color1.color,shaderName: "level4" });
        //             };
        //         }
        //     });
        // }
        // if (name === "wind") {
        //     let obj = {
        //         shiLi: {
        //             hui: null,
        //             chu: null
        //         },
        //         position: [

        //         ]
        //     };
        //     gltf.scene.traverse(child => {
        //         if (child.name === "新风") {
        //             obj.shiLi.chu = child;
        //         }
        //         if (child.name === "回风") {
        //             obj.shiLi.hui = child;
        //         }
        //         if (child.name.includes("风流")) {
        //             let wordPosition = new THREE.Vector3();
        //             child.getWorldPosition(wordPosition);
        //             obj.position.push(wordPosition);
        //         }
        //     });
        //     gltf.scene.visible = false;
        //     let currentObj = this.data.direction === 0 ? obj.shiLi.chu : obj.shiLi.hui;
        //     for (let i = 0; i < obj.position.length; i++) {
        //         let newObj = currentObj.clone();
        //         newObj.position.copy(obj.position[i]);
        //         newObj.visible = true;
        //         newObj.material.onBeforeCompile = shader => {
        //             // shaderModify(shader,{ shader: "pumpModify",color: color5.color,shaderName: "level4" });
        //         };
        //         this.add(newObj);
        //     }
        // }
        if (name === "fenJi") {
            gltf.scene.name = "fenJi";
            this.fenJi = gltf.scene;
            gltf.scene.traverse(child => {
                if (child.name === "舱盖1" || child.name === "舱盖2") {
                    child.traverse(res => {
                        if (res instanceof THREE.Mesh) {
                            res.material.onBeforeCompile = shader => {
                                shaderModify(shader,{ shader: "pumpModify",color: color1.color,shaderName: "level2" });
                            };
                        }
                    });
                }
                if (child instanceof THREE.Mesh && child.material.name.includes("TY-145")) {
                    child.visible = false;
                    // child.material.transparent = false;
                    child.material.side = THREE.DoubleSide;
                    child.material.map = null;
                    child.material.alphaTest = 0.02;
                    child.material.color = new THREE.Color(0.4275,0.7216,0.4863);
                    child.material.onBeforeCompile = shader => {
                        shaderModify(shader,{ shader: "pumpModify",color: color1.color,shaderName: "level4" });
                    };
                }
                if (child instanceof THREE.Mesh) {
                    child.material.transparent = true;
                    child.renderOrder = 10;
                    if (color1.data.includes(child.material.name)) {
                        child.material.onBeforeCompile = shader => {
                            shaderModify(shader,{ shader: "pumpModify",color: color1.color,shaderName: "level2" });
                        };
                    }
                    if (color3.data.includes(child.material.name)) {
                        child.material.onBeforeCompile = shader => {
                            shaderModify(shader,{ shader: "pumpModify",color: color3.color,shaderName: "level2" });
                        };
                    }
                    console.log(child.material.name);
                    if (color4.data.includes(child.material.name)) {
                        // child.material.onBeforeCompile = shader => {
                        //     shaderModify(shader,{ shader: "fresnel",color: color4.color,shaderName: "level2" });
                        // };

                        child.material.opacity = 0.24;
                        child.material.map = null;
                        child.material.color = color3.color;
                    }

                    if (color5.data.includes(child.material.name)) {
                        child.renderOrder = 1;
                        child.material.onBeforeCompile = shader => {
                            shaderModify(shader,{ shader: "pumpModify",color: color5.color,shaderName: "level2" });
                        };
                    }
                }
                // if (child instanceof THREE.Mesh && child.material.name.includes("TY-136")) {
                //     child.material = child.material.clone();
                //     child.material.transparent = true;
                //     child.renderOrder = 0;
                //     child.material.onBeforeCompile = shader => {
                //         shaderModify(shader,{ shader: "pumpModify",color: color3.color,shaderName: "level4" });
                //     };
                // }
            });
        }
        if (name === "ground") {
            // gltf.scene.visible = false;
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    if (child.material.name === "地面") {
                        child.material.map = null;
                    }
                    // child.material = child.material.clone();
                    // child.material.transparent = true;
                    // child.material.onBeforeCompile = shader => {
                    //     shaderModify(shader,{ shader: "fresnel",color: color2.color,shaderName: "level4" });
                    // };
                    // child.material.opacity = 0.32;
                }
            });

            let geometry = new THREE.CircleGeometry(400,640);
            let groundMirror = new Reflector(geometry,{
                gaussEffect: true,
                opacity: 0.32,
                clipBias: 0.003,
                textureHeight: window.innerHeight * window.devicePixelRatio,
                textureWidth: window.innerWidth * window.devicePixelRatio,
                color: 0x000000,
            });
            groundMirror.position.y = -2;
            groundMirror.rotateX(- Math.PI / 2);
            groundMirror.material.transparent = true;
            groundMirror.material.opacity = 0.001;
            this.ground = gltf.scene;
            console.log(this.scene);
            this.add(groundMirror);
        }
        processingAnimations(gltf,this);
        this.actions.forEach(action => {
            console.log(action._clip.name);
            if (action._clip.name.includes("#1风机")) {
                this.fanner1.actions.push(action);
            } else if (action._clip.name.includes("#2风机")) {
                this.fanner2.actions.push(action);
            }
        });
        const scope = this;
        function preProcess(mesh) { }
        function postProcess(mesh) {
        }

        // 通用模型处理
        group = processingCommonModel(gltf,this,postProcess,preProcess);
        group && this._add(group);
    };
    /**
     * @param {{name:string;vertices:Vector3[];}[]} object
     * @param {string} name
     */
    onOBJProgress = (object,name) => {
        object.forEach(line => {
            const vertices = line.vertices;
            const flowLight = new FlowLight(vertices,{
                type: "line",
                width: 2.4,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(0,1,0),
            });
            flowLight.renderOrder = 2;
            flowLight.visible = false;

            this.flowLights.push(flowLight);
            this.add(flowLight);
            if (name === "f1") {
                this.fanner1.flowLights.push(flowLight);
            } else {
                this.fanner2.flowLights.push(flowLight);
            }



            const flowLight2 = new FlowLight(vertices,{
                type: "line",
                width: 1.2,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(1,0,0),
            });
            flowLight2.renderOrder = 2;
            flowLight2.visible = false;

            this.flowLights.push(flowLight2);
            this.add(flowLight2);
            if (name === "f1") {
                this.fanner1.flowLights.push(flowLight2);
            } else {
                this.fanner2.flowLights.push(flowLight2);
            }
        });


    };

    onLeave() {
        this.removeEvents();
        this.resetControls();
        this.clearMixers();
        this.postprocessing.clearBloom(this.bloomLights);
        this.postprocessing.clearBloom(this.flowLights);

        this.flowLights.length = 0;
        this.bloomLights.length = 0;
        this.postprocessing.bloomEffect.intensity = 1;

        this.onRenderQueue.delete(fan);
    }

    createLabel() {
        const labelGroup = new THREE.Group();
        labelData.forEach(data => {
            const label = new LabelEntity(data.name);
            label.position.set(...data.position);
            labelGroup.add(label);
        });
        this._add(labelGroup);
    }

    onLoaded() {
        // 当前系统模型未加载完成时切换其他系统,将不会给前端发送信息,由目标系统发送信息。
        if (this.scene !== this.core.scene) return;
        this.postprocessing.addBloom(this.bloomLights);


        this.postprocessing.bloomEffect.intensity = 15;

        this.onRenderQueue.set(fan,this.update);
        this.test();
        this.box();
    }
    test() {
        this.setEquipmentState(true,1,"toOut");
        setTimeout(() => {
            this.setEquipmentState(false,1,"toOut");
            this.setEquipmentState(true,2,"toIn");
        },8000);
    }
    box() {
        const { center,radius } = getBoxAndSphere(this.fenJi).sphere;
        const vec = new THREE.Vector3(-radius * (7.2 / 4),radius,-radius).multiplyScalar(1.2);
        const position = center.clone().add(vec);
        this.camera.position.copy(position);
        this.controls.target.copy(center);
        center.y = center.y - 2;
        this.boxModelObj.initModel(center,20);
    }
    addClick() {
        const { clear: clear2,intersects: intersects2 } = this.core.raycast(
            "mousemove",
            this.fanner1.object,
            () => {
                if (intersects2.length) {
                    document.body.style.cursor = "pointer";
                } else {
                    document.body.style.cursor = "default";
                }
            },
        );
        this.raycastEvents.push(clear2);
    }
    /**
     * 设置设备状态
     * @param {boolean} state
     * @param {number} code 设备编号
     */
    setEquipmentState(state,code,direct) {
        let fanner;
        if (code === 1) {
            fanner = this.fanner1;
        } else if (code === 2) {
            fanner = this.fanner2;
        } else {
            return;
        }
        let directName = "机顺转";
        console.log(direct);
        if (!direct || direct === "toOut") {
            directName = "机顺转";
        } else {

            directName = "机逆转";
        }
        // 通风机正在关闭的过程中开启通风机
        if (fanner.tweenCode) TWEEN.remove(fanner.tweenCode);

        if (state === true) this.elapsedTime = 0;

        const actions = fanner.actions;
        const flowLights = fanner.flowLights;
        actions.forEach(action => {
            action.stop();
            const begin = { value: flowLights[0].uOpacity.value };
            const end = state === true ? { value: 1 } : { value: 0 };
            fanner.tweenCode = new TWEEN.Tween(begin)
                .to(end,40)
                .onUpdate((object) => {

                    flowLights.forEach((flowLight) => {
                        flowLight.uOpacity.value = object.value;
                        flowLight.visible = !(flowLight.uOpacity.value === 0);
                    });

                })
                .onComplete(() => {
                    fanner.tweenCode = null;
                })
                .start();

            if (state) { // 开机
                if (action._clip.name.includes("机开门")) {
                    action.play();
                    action.paused = false;
                    action.clampWhenFinished = true;
                    action.loop = THREE.LoopOnce;
                }
            }
            if (!state) { // 关机
                if (action._clip.name.includes("机关门")) {
                    action.play();
                    action.paused = false;
                    action.clampWhenFinished = true;
                    action.loop = THREE.LoopOnce;
                }
            }
            if (action._clip.name.includes(directName)) {
                action.play();
                action.paused = !state;
            }

            fanner.state = state;
        });

        let toFresnelValue = state ? 28.8 : 2.8;
        // new TWEEN.Tween(fresnelLevelS[fanner.name])
        //     .to({ value: toFresnelValue },1000)
        //     .onUpdate(() => {
        //     })
        //     .onComplete((object) => {

        //     })
        //     .start();
    }

    /**@param {Core3D} core  */
    update = core => {
        this.updateMixers(core.delta);

        this.elapsedTime += core.delta;
        this.flowLights.forEach(flowLight => flowLight.update(this.elapsedTime));
        this.boxModelObj && this.boxModelObj.update(this.elapsedTime);
    };

    initScene() {
        const ambientLight = new THREE.AmbientLight(0xffffff,1); // 线性SRG
        const directionalLight = new THREE.DirectionalLight(0xffffff,1);
        directionalLight.shadow.camera.near = 1;
        directionalLight.shadow.camera.far = 150;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.radius = 1.1;
        directionalLight.shadow.bias = -0.002;

        directionalLight.position.set(50,50,50);
        directionalLight.castShadow = true;

        const dir2 = new THREE.DirectionalLight(0xffffff,0.7);
        dir2.position.set(50,30,-50);

        const dir3 = new THREE.DirectionalLight(0xffffff,0.5);
        dir2.position.set(-20,30,-50);

        this._add(ambientLight);
        this._add(directionalLight);
        this._add(dir2);
        this._add(dir3);
        const ground = new PlatformCircle(200,200);
        this._add(ground);

    }
}
