import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
import { loadGLTF,loadOBJ } from "../../loader";
import { air_door } from "@/assets/models";
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
import { getBoxAndSphere,getLengthFromVertices } from "../../../utils";
import { PlatformCircle } from "../../../lib/PlatformCircle";
import { Stars } from "../../../lib/stars";
import { fresnelColorBlue } from "../../../shader/paramaters";
import { shaderModify } from "../../../shader/shaderModify";
import { Reflector } from "../../../lib/Reflector";
import BoxModel from "../../../lib/boxModel";

export const _BoringMachineSubsystem = Symbol();

const position = new THREE.Vector3(-320,124,80);
const target = new THREE.Vector3(0,0,0);

// camera limit SPHERE
const SPHERE_CAMERA = new THREE.Sphere(new THREE.Vector3(),80);
const SPHERE_CONTROLS = new THREE.Sphere(new THREE.Vector3(),84);

/**@type {OrbitControls} */
const controlsParameters = {
    enablePan: false,
    // enableZoom: false,
    rotateSpeed: 0.4,
    // minPolarAngle: Math.PI / 2.05,
    maxPolarAngle: Math.PI / 2.1,
    maxAzimuthAngle: 0, // 右侧
    minAzimuthAngle: Math.PI, // 左侧
    maxDistance: 15,
    enableDamping: true,
};

/**@classdesc 包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class AirDoor extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);
        this.boxModelObj = new BoxModel(core);
        this.ground = null;
        this.postprocessing = core.postprocessing;

        this.elapseTime = 0;

        this.init();

        /**双击事件检测对象 */
        this.dblClickArray = [];

        this.removes = [];

        this.glasses = [];
        this.flowLights = [];
        this.tweenCode = null;
        this.bloomLights = [];

        this.fanner1 = {
            name: "#1风门",
            actions: [],
            state: false,
            object: [],
            trueName: { 0: "#1门开门",1: "#1开到位" },
            falseName: { 0: "#1门关门",1: "#1门关到位" },
            actionName: "#1门关到位"
        };

        this.fanner2 = {
            name: "#2风门",
            actions: [],
            state: false,
            object: [],
            trueName: { 0: "#2门开门",1: "#2开到位" },
            falseName: { 0: "#2门关门",1: "#2门关到位" },
            actionName: "#2门关到位"
        };
    }

    init() {
        this.initScene();
    }


    addEvents() { }

    removeEvents() { }

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
        // this.camera.position.clampSphere(SPHERE_CAMERA);
        this.controls.target.clampSphere(SPHERE_CONTROLS);
    };

    async onEnter() {
        this.addEvents();
        this.handleControls();
        this.onRenderQueue.set(_BoringMachineSubsystem,this.update);

        await loadGLTF(air_door,this.onProgress);
        await loadOBJ(air_door,this.onOBJProgress);

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
            data: ["局部风机_1","局部风机_2","局部风机_3","舱盖1_1","舱盖2_1"],
            color: fresnelColorBlue["深蓝偏紫"].value
        };
        let color2 = {
            data: [],
            color: fresnelColorBlue["道奇蓝"].value
        };
        let color3 = {
            data: [],
            color: fresnelColorBlue["天蓝"].value
        };
        let color4 = {
            data: [],
            color: fresnelColorBlue["深天蓝"].value
        };
        let color5 = {
            data: ["局部风机_4","局部风机_5","局部风机_6"],
            color: fresnelColorBlue["浅蓝绿色"].value
        };
        if (name === "wall") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    // child.material.opacity = 0.68;
                    if (child instanceof THREE.Mesh && child.material.name === "通风水泥") {
                        child.material.map = null;

                    }
                }
            });
        }
        if (name === "equip") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.renderOrder = 0;
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.onBeforeCompile = shader => {
                        // shaderModify(shader,{ shader: "fresnel",color: color3.color,shaderName: "level3" });
                    };
                    // child.material.opacity = 0.68;
                }
            });
        }
        if (name === "ground") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.opacity = 0.68;
                    if (child.material.name === "地面") {
                        child.material.map = null;
                    }
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
            this.add(groundMirror);
        }
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

        processingAnimations(gltf,this);

        this.actions.forEach(action => {
            if (action._clip.name.includes("#1")) {
                this.fanner1.actions.push(action);
            } else if (action._clip.name.includes("#2")) {
                this.fanner2.actions.push(action);
            }
        });

        const scope = this;

        // 通用模型处理
        group = gltf.scene;
        group.receiveShadow = true;
        group.castShadow = false;
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
                width: 2.4,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(1,0,0),
            });
            flowLight.renderOrder = 2;
            flowLight.visible = false;
            this.flowLights.push(flowLight);
            this.add(flowLight);



            const flowLight2 = new FlowLight(vertices,{
                type: "line",
                width: 2.4,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(0,1,0),
            });
            flowLight2.renderOrder = 2;
            flowLight2.visible = false;
            this.flowLights.push(flowLight2);
            this.add(flowLight2);
        });
    };

    onLeave() {
        this.removeEvents();
        this.resetControls();
        this.clearMixers();
        this.postprocessing.clearBloom(this.bloomLights);

        this.bloomLights.length = 0;
        this.removes.length = 0;
        this.glasses.length = 0;
        this.flowLights.length = 0;
        this.bloomLights.length = 0;

        this.onRenderQueue.delete(_BoringMachineSubsystem);
    }

    onLoaded() {
        // 当前系统模型未加载完成时切换其他系统,将不会给前端发送信息,由目标系统发送信息。
        if (this.scene !== this.core.scene) return;
        this.onRenderQueue.set(_BoringMachineSubsystem,this.update);

        this.box();
        this.test();
    }
    test() {
        this.setEquipmentState(true,1,0);
        setTimeout(() => {
            this.setEquipmentState(true,2,1);
        },2000);
        setTimeout(() => {
            this.setEquipmentState(false,1,1);
        },4000);
    }

    box() {
        const { center,radius } = getBoxAndSphere(this.ground).sphere;
        const vec = new THREE.Vector3(radius,radius,radius).multiplyScalar(1.2);
        const position = center.clone().add(vec);
        this.boxModelObj.initModel(center,radius);
    }
    /**
     * 设置设备状态
     * @param {boolean} state
     */
    setEquipmentState(state,code,type) {
        let fanner;
        if (code === 1) {
            fanner = this.fanner1;
        } else if (code === 2) {
            fanner = this.fanner2;
        } else {
            return;
        }
        fanner.actionName = state ? fanner.trueName[type] : fanner.falseName[type];
        // 通风机正在关闭的过程中开启通风机
        if (this.tweenCode) TWEEN.remove(this.tweenCode);
        if (state === true) this.elapsedTime = 0;

        const actions = fanner.actions;
        const flowLights = this.flowLights;

        let toValue = 0;
        if (!this.fanner1.actionName.includes('关到位') && !this.fanner2.actionName.includes('关到位')) {
            toValue = 1;
        }
        const begin = { value: flowLights[0].uOpacity.value };
        const end = { value: toValue };
        this.tweenCode = new TWEEN.Tween(begin)
            .to(end,40)
            .onUpdate((object) => {

                flowLights.forEach((flowLight) => {
                    flowLight.uOpacity.value = object.value;
                    flowLight.visible = !(flowLight.uOpacity.value === 0);
                });

            })
            .onComplete(() => {
                this.tweenCode = null;
            })
            .start();




        actions.forEach(action => {
            action.stop();
            if (action._clip.name === fanner.actionName) {
                action.play();
                action.paused = false;
                action.clampWhenFinished = true;
                action.loop = THREE.LoopOnce;
            }

            fanner.state = state;
        });
    }

    /**@param {Core3D} core  */
    update = core => {
        this.updateMixers(core.delta);

        this.elapseTime += core.delta;

        this.flowLights.forEach(flowLight => flowLight.update(this.elapseTime));
        this.boxModelObj && this.boxModelObj.update(this.elapseTime);
    };

    initScene() {
        const _BoringMachineSubsystem = new PlatformCircle(100,100);
        this._add(_BoringMachineSubsystem);

        const count = 500;
        const range = new THREE.Box3(new THREE.Vector3(-2000,-2000,-2000),new THREE.Vector3(2000,2000,2000));
        this.stars = new Stars(count,range);
        this._add(this.stars);

        const ambientLight = new THREE.AmbientLight(0xffffff); // 线性SRG
        const directionalLight = new THREE.DirectionalLight(0xffffff,1);

        directionalLight.shadow.camera.near = 0.01;
        directionalLight.shadow.camera.far = 60;
        directionalLight.shadow.camera.right = 40;
        directionalLight.shadow.camera.left = -40;
        directionalLight.shadow.camera.top = 40;
        directionalLight.shadow.camera.bottom = -40;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.blurSamples = 8;

        directionalLight.shadow.radius = 1;
        directionalLight.shadow.bias = 0;
        directionalLight.castShadow = true;

        directionalLight.position.set(0,10,-2);

        const dir2 = new THREE.DirectionalLight(0xffffff,1);
        dir2.position.set(0,50,50);
        this._add(dir2);

        this.ambientLight = ambientLight;
        this._add(this.ambientLight);

        this.directionalLight = directionalLight;
        this._add(this.directionalLight);

        // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // this.scene.add(shadowHelper);
    }
}
