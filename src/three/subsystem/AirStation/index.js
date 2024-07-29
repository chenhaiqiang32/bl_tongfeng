import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import { loadGLTF,loadOBJ } from "../../loader";
import { air_station } from "@/assets/models";
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
import { createCSS3DObject } from "../../../lib/CSSObject";
import MemoryManager from "../../../lib/memoryManager";

export const _BoringMachineSubsystem = Symbol();

const position = new THREE.Vector3(-320,120,80);
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
export class AirStation extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);
        this.stationDom = null;
        this.boxModelObj = new BoxModel(core);
        this.postprocessing = core.postprocessing;
        this.css2d = null;

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

    updateDataInfo(element,type) {
        let info = element.info; // 显示文字
        this.stationDom.innerText = info;
    }

    initDom() {
        let changeDom = document.getElementById("windStation").cloneNode(true);
        let showDom = changeDom.getElementsByClassName("windStationWord")[0];
        this.stationDom = showDom;
        showDom.innerText = "暂无"; // dom元素赋值
        const css2d = createCSS3DObject(changeDom);
        css2d.scale.set(0.016,0.016,0.016);
        css2d.position.set(1.36,1.84,0.28);
        css2d.rotation.y = -Math.PI / 2;
        this.css2d = css2d;
        this.add(this.css2d);
    }

    limitInSphere = () => {
        this.camera.position.clampSphere(SPHERE_CAMERA);
        this.controls.target.clampSphere(SPHERE_CONTROLS);
    };

    async onEnter() {
        this.addEvents();
        this.handleControls();
        this.onRenderQueue.set(_BoringMachineSubsystem,this.update);

        await loadGLTF(air_station,this.onProgress);
        await loadOBJ(air_station,this.onOBJProgress);

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
                    };
                }
            });
        }
        if (name === "ground") {
            gltf.scene.position.y = -0.01;
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

            let geometry = new THREE.PlaneGeometry(3.48,32);
            let groundMirror = new Reflector(geometry,{
                gaussEffect: true,
                opacity: 0.32,
                clipBias: 0.003,
                textureHeight: window.innerHeight * window.devicePixelRatio,
                textureWidth: window.innerWidth * window.devicePixelRatio,
                color: 0X5e5e5e,
            });
            groundMirror.position.y = 0;
            groundMirror.rotateX(- Math.PI / 2);
            groundMirror.material.transparent = true;
            groundMirror.material.opacity = 0.001;
            this.ground = gltf.scene;
            this.add(groundMirror);
        }

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
        MemoryManager.dispose(this.css2d);
        this.removeEvents();
        this.resetControls();
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
        this.box();
        this.initDom();
    }
    box() {
        const { center,radius } = getBoxAndSphere(this.ground).sphere;
        const vec = new THREE.Vector3(radius,radius,radius).multiplyScalar(1.2);
        const position = center.clone().add(vec);
        // center.y = center.y - 2;
        this.boxModelObj.initModel(new THREE.Vector3(center.x,center.y + 0.1,center.z),radius);
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
