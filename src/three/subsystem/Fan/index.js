import * as THREE from "three";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
import { Subsystem } from "../Subsystem";
import { loadGLTF,loadOBJ } from "../../loader";
import { fan_models } from "@/assets/models";
import { Core3D } from "../..";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import {
    processingCommonModel,
    processingInstancedModel,
    processingInstancedTree,
    processingMergedTree,
    processingAnimations,
    processingCameraAnimation,
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
import MemoryManager from "../../../lib/memoryManager";

export const fan = Symbol();

const position = new THREE.Vector3(0,30,40);
const target = new THREE.Vector3();

// camera limit SPHERE
const SPHERE_CAMERA = new THREE.Sphere(new THREE.Vector3(),150);
const SPHERE_CONTROLS = new THREE.Sphere(new THREE.Vector3(),149);

/**@type {OrbitControls} */
const controlsParameters = {
    maxPolarAngle: Math.PI / 2.2,
    enablePan: false,
    // enableZoom: false
};


/**@classdesc 包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class FanSubsystem extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);
        this.boxModelObj = new BoxModel(core);
        this.postprocessing = core.postprocessing;
        this.elapsedTime = 0;
        this.labelGroup = new THREE.Group();

        this.init();

        /** @type {FlowLight[]} */
        this.flowLights = [];
        this.bloomLights = [];
        this.ground = null;
        this.raycastEvents = [];
        this.tweenCode = null;

        this.fanner1 = {
            name: "#1通风机",
            actions: [],
            state: false,
            flowLights: [],
            object: [],
            position: [0.427,8,-4.359]

        };

        this.fanner2 = {
            name: "#2通风机",
            actions: [],
            state: false,
            flowLights: [],
            object: [],
            position: [0.365,8,4.35]
        };
        this.shaderColor = {
            wall: new THREE.Color(0.4431,0.4784,0.502),
            shan: new THREE.Color(0.9569,0.9843,0.5882),
            dian: new THREE.Color(0.0588,0.1373,0.9686),
            skinCheck: new THREE.Color(0.2275,0.9961,0.7922),
        };
    }

    init() {
        // this.initAxesHelper();
        this.initScene();
    }



    addEvents() { }

    removeEvents() {
        this.raycastEvents.forEach(clear => clear());
        this.raycastEvents.length = 0;
    }

    handleControls() {
        this.camera.position.copy(position);
        this.controls.target.copy(target);

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

        await loadGLTF(fan_models,this.onProgress);
        await loadOBJ(fan_models,this.onOBJProgress);

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
            data: ["#1通风机电机人孔门_1","#1通风机电机人孔门_2","#2通风机电机人孔门_1","#2通风机电机人孔门_2","#1通风机_1","#2通风机_1"],
            color: fresnelColorBlue["深蓝偏紫"].value
        };
        let JSkin = ["#1通风机","#2通风机","#1通风机电机人孔门","#2通风机电机人孔门"];
        let color2 = {
            data: ["#1通风机_3","#2通风机_3","#2通风机二级电机_2","#2通风机一级电机_2","#1通风机二级电机_2","#1通风机一级电机_2","#2通风机二级电机_3","#2通风机一级电机_3","#1通风机二级电机_3","#1通风机一级电机_3",],
            color: fresnelColorBlue["道奇蓝"].value
        };
        let color3 = {
            data: ["#1通风机_4","#2通风机_4"],
            color: fresnelColorBlue["天蓝"].value
        };
        let color4 = {
            data: ["#1通风机_2","#1通风机_5","#1通风机_6","#2通风机_2","#2通风机_5","#2通风机_6"],
            color: fresnelColorBlue["深天蓝"].value
        };
        let color5Includes = { data: ["电机风扇"],color: fresnelColorBlue["浅蓝绿色"].value };
        let color6Includes = { data: ["通风水平风门扇叶","通风垂直风门扇叶","#1机立式风门","#2机立式风门"],color: fresnelColorBlue["亮钢兰色"].value };
        gltf.scene.traverse(child => {
            if (color1.data.includes(child.name)) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.uPosition = child.position.clone();
                child.material.onBeforeCompile = shader => {
                    shaderModify(shader,{ shader: "fresnel",color: color1.color,shaderName: "level2" });
                };
            }
            if (JSkin.includes(child.name)) {
                child.traverse(res => {
                    if (res instanceof THREE.Mesh) {
                        if (res.name === "#2通风机_5" || res.name === "#1通风机_5") {
                            res.visible = false;
                        }
                        res.material.transparent = true;
                        if (color1.data.includes(res.name)) {
                            res.renderOrder = 10;
                            res.material = res.material.clone();
                            res.material.transparent = true;
                            res.material.onBeforeCompile = shader => {
                                shaderModify(shader,{ shader: "fresnel",color: color1.color,shaderName: "base" });
                            };
                        }
                        if (color2.data.includes(res.name)) {
                            res.material.transparent = true;
                            res.material.onBeforeCompile = shader => {
                                shaderModify(shader,{ shader: "fresnel",color: color2.color,shaderName: "base" });
                            };
                        }
                        if (color3.data.includes(res.name)) {
                            res.material.opacity = 0.24;
                            res.material.map = null;
                            res.material.color = color3.color;
                        }
                        if (color4.data.includes(res.name)) {
                            res.renderOrder = 10;
                            res.material = res.material.clone();
                            res.material.transparent = true;
                            res.material.onBeforeCompile = shader => {
                                shaderModify(shader,{ shader: "fresnel",color: color4.color,shaderName: "base" });
                            };
                        }
                    }

                });
            }
        });
        if (name === "equip") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.transparent = true;
                    child.material = child.material.clone();
                    if (color2.data.includes(child.name)) {
                        child.material.onBeforeCompile = shader => {
                            shaderModify(shader,{ shader: "fresnel",color: color2.color,shaderName: "base" });
                        };
                    }
                    color5Includes.data.forEach(res => {
                        if (child.name.includes(res)) {
                            child.material.onBeforeCompile = shader => {
                                shaderModify(shader,{ shader: "fresnel",color: color5Includes.color,shaderName: "base" });
                            };
                        }
                    });
                    color6Includes.data.forEach(res => {
                        if (child.name.includes(res)) {
                            child.material.onBeforeCompile = shader => {
                                shaderModify(shader,{ shader: "fresnel",color: color6Includes.color,shaderName: "level3" });
                            };
                        }
                    });
                }

            });
        }
        if (name === "wall") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh && child.name !== "通风口_2") {
                    child.material.transparent = true;
                    child.material.opacity = 0.88;
                }
            });

        }
        if (name === "ground") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material.transparent = true;
                    child.material.opacity = 0.2;
                }
            });

            let geometry = new THREE.CircleGeometry(76,76);
            let groundMirror = new Reflector(geometry,{
                gaussEffect: true,
                opacity: 0.08,
                clipBias: 0.003,
                textureHeight: window.innerHeight * window.devicePixelRatio,
                textureWidth: window.innerWidth * window.devicePixelRatio,
                color: new THREE.Color(0.0667,0.0061,0.1098,0.1),
            });
            groundMirror.position.y = -2;
            groundMirror.rotateX(- Math.PI / 2);
            groundMirror.material.transparent = true;
            groundMirror.material.opacity = 0.001;
            gltf.scene.visible = false;
            this.ground = gltf.scene;
            this.add(groundMirror);
        }
        processingAnimations(gltf,this);
        this.actions.forEach(action => {
            if (action._clip.name.includes("#1机")) {
                this.fanner1.actions.push(action);
            } else if (action._clip.name.includes("#2机")) {
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
                width: 4.8,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(0,0,1),
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
                width: 4.8,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(0,1,0),
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

        this.flowLights.length = 0;
        this.bloomLights.length = 0;
        this.postprocessing.bloomEffect.intensity = 1;

        this.onRenderQueue.delete(fan);
    }

    createLabel() {
        if (this.labelGroup.children.length) {
            MemoryManager.dispose(this.labelGroup);
        }
        const label = new LabelEntity(this.fanner1.name);
        label.position.set(...this.fanner1.position);
        this.labelGroup.add(label);
        const label2 = new LabelEntity(this.fanner2.name);
        label2.position.set(...this.fanner2.position);
        this.labelGroup.add(label2);

        this._add(this.labelGroup);
    }

    onLoaded() {
        // 当前系统模型未加载完成时切换其他系统,将不会给前端发送信息,由目标系统发送信息。
        if (this.scene !== this.core.scene) return;
        this.postprocessing.addBloom(this.bloomLights);


        this.postprocessing.bloomEffect.intensity = 15;

        this.onRenderQueue.set(fan,this.update);
        this.box();
        this.createLabel();
    }
    updateDataInfo(element,type) {
        const { parts } = element;
        if (type === "remove") { // 该风门删除了
            this.setEquipmentState(false,1,"toOut"); // 开启动画
            this.setEquipmentState(false,2,"toOut"); // 开启动画
            this.fanner1.name = "暂无";
            this.fanner2.name = "暂无";

        } else { // 更新或者新增
            parts.forEach((child,index) => {
                const { name,status } = child;
                let fanner = this.fanner1;
                if (index === 1) {
                    fanner = this.fanner2;
                }
                fanner.name = name;
                fanner.state = status;
                this.setEquipmentState(status,index + 1,"toOut"); // 开启动画
            });
        }
        this.createLabel();
    }
    box() {
        const { center,radius } = getBoxAndSphere(this.ground).sphere;
        const vec = new THREE.Vector3(radius,radius,radius).multiplyScalar(1.2);
        const position = center.clone().add(vec);
        center.y = center.y - 2;
        this.boxModelObj.initModel(center,radius);
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
