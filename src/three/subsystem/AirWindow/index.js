import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import { loadGLTF,loadOBJ } from "../../loader";
import { air_window_double } from "@/assets/models";
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
import { getLengthFromVertices } from "../../../utils";
import { PlatformCircle } from "../../../lib/PlatformCircle";
import { Stars } from "../../../lib/stars";
import { fresnelColorBlue } from "../../../shader/paramaters";
import { shaderModify } from "../../../shader/shaderModify";
import { Reflector } from "../../../lib/Reflector";

export const _BoringMachineSubsystem = Symbol();

const position = new THREE.Vector3(-320,20,80);
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
    minAzimuthAngle: 1.2 - Math.PI * 3 / 4, // 左侧
    maxDistance: 15,
    enableDamping: true,
};

/**@classdesc 包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class AirWindow extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);

        this.postprocessing = core.postprocessing;

        this.elapseTime = 0;

        this.init();

        /**双击事件检测对象 */
        this.dblClickArray = [];

        this.removes = [];

        this.glasses = [];
        this.flowLights = [];
        this.bloomLights = [];
    }

    init() {
        this.initScene();
    }

    /**@param {DAY|NIGHT|SCIENCE} param  黑夜白天科幻参数 */
    updateLightingPattern(param) {
        if (param === NIGHT) {
            this.postprocessing.addBloom(this.glasses);
            this.postprocessing.addBloom(this.flowLights);
        } else {
            this.postprocessing.clearBloom(this.glasses);
            this.postprocessing.clearBloom(this.flowLights);
        }
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
        this.camera.position.clampSphere(SPHERE_CAMERA);
        this.controls.target.clampSphere(SPHERE_CONTROLS);
    };

    async onEnter() {
        this.addEvents();
        this.handleControls();
        this.onRenderQueue.set(_BoringMachineSubsystem,this.update);

        await loadGLTF(air_window_double,this.onProgress);
        await loadOBJ(air_window_double,this.onOBJProgress);

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
                    child.material.onBeforeCompile = shader => {
                        shaderModify(shader,{ shader: "fresnel",color: color1.color,shaderName: "level2" });
                    };
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
                        shaderModify(shader,{ shader: "pumpModify",color: color5.color,shaderName: "level4" });
                    };
                }
            });
        }
        if (name === "ground") {
            gltf.scene.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = child.material.clone();
                    child.material.transparent = true;
                    child.material.onBeforeCompile = shader => {
                        shaderModify(shader,{ shader: "fresnel",color: color2.color,shaderName: "level4" });
                    };
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
        this.postprocessing.addBloom(this.bloomLights);

        this.playActions();

        this.onRenderQueue.set(_BoringMachineSubsystem,this.update);
    }

    /**
     * 设置设备状态
     * @param {boolean} state
     */
    setEquipmentState(state) {
        this.actions.forEach(action => (action.paused = !state));
    }

    /**@param {Core3D} core  */
    update = core => {
        this.updateMixers(core.delta);

        this.elapseTime += core.delta;

        this.flowLights.forEach(flowLight => flowLight.update(this.elapseTime));
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
