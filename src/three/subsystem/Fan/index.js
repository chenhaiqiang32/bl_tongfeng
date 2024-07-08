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
import { changeFresnel,changeFresnelSkinColor,shaderModify,shaderModify1 } from "../../../shader/shaderModify";
import { Reflector } from "../../../lib/Reflector";
import { getBoxAndSphere } from "../../../utils";
import BoxModel from "../../../lib/boxModel";
import { fresnelChangeColor,fresnelLevelS } from "../../../shader/paramaters";

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
export class FanSubsystem extends Subsystem {
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
        this.raycastEvents = [];

        this.fanner1 = {
            name: "#1通风机",
            actions: [],
            electricMachine: null,
            state: false,
            tweenCode: null,
            flowLights: [],
            door: null,
            tm: [],
            object: [],
            equip: null
        };

        this.fanner2 = {
            name: "#2通风机",
            actions: [],
            electricMachine: null,
            state: false,
            tweenCode: null,
            flowLights: [],
            door: null,
            tm: [],
            object: [],
            equip: null
        };
        this.shaderColor = {
            wall: new THREE.Color(0.4431,0.4784,0.502),
            shan: new THREE.Color(0.7569,0.9804,0.0157),
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
        gltf.scene.traverse(child => {
            if (child.name.includes("通风机电机人孔门_1")) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.uPosition = child.position.clone();
                // this.fanner1.door = child;
                shaderModify(child,{ shader: "fresnel",cColor: true,shaderName: "#1通风机" });
                // child.visible = false;
            }
            if (child.name.includes("通风机电机人孔门_2")) {
                child.material = child.material.clone();
                child.material.transparent = true;
                child.uPosition = child.position.clone();
                // this.fanner2.door = child;
                shaderModify(child,{ shader: "fresnel",cColor: true,shaderName: "#2通风机" });
                // child.visible = false;
            }
            if (child.name === "#1通风机") {
                child.traverse(res => {
                    if (res instanceof THREE.Mesh) {
                        res.material.transparent = true;
                        if (res.name === "#1通风机_1") {
                            res.renderOrder = 10;
                            res.material = res.material.clone();
                            res.material.transparent = true;
                            this.fanner1.tm.push(res);
                            shaderModify(res,{ shader: "fresnel",cColor: true,shaderName: "#1通风机" });
                        }
                        if (res.name === "#1通风机_3") {
                            res.material.transparent = true;
                            shaderModify(res,{ shader: "fresnel",color: new THREE.Color(0.9882,0.7137,0.0196),shaderName: "wall" });
                        }
                        if (res.name === "#1通风机_4") {
                            res.material.opacity = 0.08;
                            // res.visible = false;
                            res.material.map = null;
                            res.material.color = new THREE.Color(0.9804,0.8353,0.0157);
                            // shaderModify(res,{ shader: "fresnel",color: new THREE.Color(0.9647,0.9412,0.6745),shaderName: "door" });
                        }
                        if (res.name === "#1通风机_5" || res.name === "#1通风机_2" || res.name === "#1通风机_6") {
                            res.renderOrder = 10;
                            res.material = res.material.clone();
                            res.material.transparent = true;
                            this.fanner1.tm.push(res);
                            shaderModify(res,{ shader: "fresnel",color: new THREE.Color(0.051,0.0588,0.0039),shaderName: "wall" });
                        }
                    }

                });

            }
            if (child.name === "#2通风机") {
                child.traverse(res => {
                    if (res instanceof THREE.Mesh) {
                        res.material.transparent = true;
                        if (res.name === "#2通风机_1") {
                            res.renderOrder = 10;
                            res.material = res.material.clone();
                            res.material.transparent = true;
                            this.fanner1.tm.push(res);
                            shaderModify(res,{ shader: "fresnel",cColor: true,shaderName: "#2通风机" });
                        }
                        if (res.name === "#2通风机_3") {
                            res.material.transparent = true;
                            shaderModify(res,{ shader: "fresnel",color: new THREE.Color(0.9882,0.7137,0.0196),shaderName: "wall" });
                        }
                        if (res.name === "#2通风机_4") {
                            res.material.opacity = 0.08;
                            // res.visible = false;
                            res.material.map = null;
                            res.material.color = new THREE.Color(0.9804,0.8353,0.0157);
                            // shaderModify(res,{ shader: "fresnel",color: new THREE.Color(0.9647,0.9412,0.6745),shaderName: "door" });
                        }
                        if (res.name === "#2通风机_5" || res.name === "#2通风机_6" || res.name === "#2通风机_2") {
                            res.renderOrder = 10;
                            res.material = res.material.clone();
                            res.material.transparent = true;
                            this.fanner1.tm.push(res);
                            shaderModify(res,{ shader: "fresnel",color: new THREE.Color(0.051,0.0588,0.0039),shaderName: "wall" });
                        }
                    }
                });
            }
        });
        if (name === "equip") {
            gltf.scene.traverse(child => {
                if (child.name === "#1风机") {
                    this.fanner1.equip = child;
                }
                if (child.name === "#2风机") {
                    this.fanner2.equip = child;
                }
                if (child instanceof THREE.Mesh) {
                    child.material.transparent = true;
                    child.material = child.material.clone();
                    if (child.name === "#2通风机二级电机_2" || child.name === "#2通风机一级电机_2" || child.name === "#1通风机二级电机_2" || child.name === "#1通风机一级电机_2") {
                        shaderModify(child,{ shader: "fresnel",color: new THREE.Color(0.9882,0.7137,0.0196),shaderName: "wall" });
                    }
                    if (child.name === "#2通风机二级电机_3" || child.name === "#2通风机一级电机_3" || child.name === "#1通风机二级电机_3" || child.name === "#1通风机一级电机_3") {
                        shaderModify(child,{ shader: "fresnel",color: new THREE.Color(0.9882,0.7137,0.0196),shaderName: "wall" });
                    }
                    if (child.name.includes("电机风扇")) {
                        shaderModify(child,{ shader: "pumpModify",color: this.shaderColor.shan,shaderName: "shan" });
                    }
                    if (child.name.includes("通风水平风门扇叶") || child.name.includes("通风垂直风门扇叶") || child.name.includes("机立式风门")) {
                        shaderModify(child,{ shader: "pumpModify",color: new THREE.Color(0.9412,0.5333,0.0314),shaderName: "wall" });

                    }
                }

            });
        }
        if (name === "wall") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh && child.name !== "通风口_2") {
                    child.material.transparent = true;
                    // child.material.opacity = 0.88;
                    // shaderModify(child,{ shader: "fresnel",color: new THREE.Color(0.8667,0.9373,0.9529),shaderName: "wall" },);
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
            // gltf.scene.visible = false;

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
        group && this.add(group);
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
        // this.postprocessing.addBloom(this.flowLights);

        this.postprocessing.bloomEffect.intensity = 15;

        this.playActions();
        this.setActionsState(false);

        this.onRenderQueue.set(fan,this.update);
        this.setEquipmentState(true,2);
        setTimeout(() => {
            this.setEquipmentState(false,2);
        },8000);
        this.box();
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
    setEquipmentState(state,code) {
        let fanner;
        if (code === 1) {
            fanner = this.fanner1;
        } else if (code === 2) {
            fanner = this.fanner2;
        } else {
            return;
        }

        // 通风机状态与设置状态相同返回
        if (fanner.state === state) return;

        // 通风机正在关闭的过程中开启通风机
        if (fanner.tweenCode) TWEEN.remove(fanner.tweenCode);

        if (state === true) this.elapsedTime = 0;

        const actions = fanner.actions;
        const flowLights = fanner.flowLights;
        const tm = fanner.tm;
        const door = fanner.door;
        const equip = fanner.equip;
        actions.forEach(action => {
            action.stop();
            const begin = { value: flowLights[0].uOpacity.value };
            const end = state === true ? { value: 1 } : { value: 0 };

            fanner.tweenCode = new TWEEN.Tween(begin)
                .to(end,1000)
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
                // equip.traverse(child => {
                //     if (child.name.includes("电机风扇")) {
                //         shaderModify(child,{ shader: "fresnel",color: this.shaderColor.shan,shaderName: "shan" });
                //     }
                //     if (child.name === "#1通风机二级电机_2" || child.name === "#1通风机一级电机_2" || child.name === "#2通风机二级电机_2" || child.name === "#2通风机一级电机_2") {
                //         shaderModify(child,{ shader: "fresnel",color: this.shaderColor.dian,shaderName: "dian" });
                //     }
                // });
            }
            if (!state) { // 关机
                if (action._clip.name.includes("机关门")) {
                    action.play();
                    action.paused = false;
                    action.clampWhenFinished = true;
                    action.loop = THREE.LoopOnce;
                }
            }
            if (action._clip.name.includes("机顺转")) {
                action.play();
                action.paused = !state;
            }


            fanner.state = state;
        });
        // tm.forEach(child => {
        //     let toOpacity = state ? 0.32 : 1;
        //     new TWEEN.Tween(child.material)
        //         .to({ opacity: toOpacity },1000)
        //         .onUpdate(() => {
        //         })
        //         .onComplete((object) => {

        //         })
        //         .start();
        // });

        let toFresnelValue = state ? 8.8 : 2.8;
        new TWEEN.Tween(fresnelLevelS[fanner.name])
            .to({ value: toFresnelValue },1000)
            .onUpdate(() => {
            })
            .onComplete((object) => {

            })
            .start();
        // let toFresnelColor = state ? new THREE.Color(0.0431,0.5451,0.1529) : new THREE.Color(0.0431,0.0314,0.6471);
        // new TWEEN.Tween({ r: fresnelChangeColor[fanner.name].value.r,g: fresnelChangeColor[fanner.name].value.g,b: fresnelChangeColor[fanner.name].value.b })
        //     .to({ r: toFresnelColor.r,g: toFresnelColor.g,b: toFresnelColor.b },1000)
        //     .onUpdate((object) => {
        //         changeFresnelSkinColor(new THREE.Color(object.r,object.g,object.b),fanner.name);
        //     })
        //     .onComplete((object) => {

        //     })
        //     .start();


        // let toDoorOpacity = state ? 0 : 1;
        // let toPosition = state ? door.position.y + 0.8 : door.uPosition.y;

        // new TWEEN.Tween(door.position)
        //     .to({ y: toPosition },1000)
        //     .onStart(() => {

        //     })
        //     .onUpdate(() => {
        //     })
        //     .onComplete(() => {
        //     })
        //     .start();
        // new TWEEN.Tween(door.material)
        //     .to({ opacity: toDoorOpacity },1000)
        //     .onUpdate((object) => {
        //         door.material.opacity = object.opacity;
        //         if (object.opacity === 0 && state) {
        //             object.visible = false;
        //         }
        //         if (!state) {
        //             object.visible = true;
        //         }
        //     })
        //     .onComplete(() => {
        //     })
        //     .start();

    }

    /**@param {Core3D} core  */
    update = core => {
        this.updateMixers(core.delta);

        this.elapsedTime += core.delta;
        // this.stars && this.stars.update();
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

        // const stars = new Stars(400,new THREE.Box3(new THREE.Vector3(-1500,-1500,-1500),new THREE.Vector3(1500,1500,1500)));
        // this.stars = stars;
        // this._add(stars);

        // this.scene.background = new Color(0x888888)

    }
}
