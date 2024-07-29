import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import { loadGLTF,loadOBJ } from "../../loader";
import * as TWEEN from "three/examples/jsm/libs/tween.module";
import { air_window_double } from "@/assets/models";
import { Core3D } from "../..";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import {
    processingAnimations,
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
const target = new THREE.Vector3(0,0,-2);

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
    maxDistance: 18,
    enableDamping: true,
};

/**@classdesc 包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class AirWindow extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);
        this.css2ds = [];
        this.boxModelObj = new BoxModel(core);
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
            name: "暂无",
            actions: [],
            object: [],
            dom: {
                speed: null,
                name: null,
                status: null
            },
            angle: "0", // 角度
            trueName: "#1风窗开窗",
            falseName: "#1风窗关窗",
            actionName: "#1风窗关窗"
        };
        this.domSpeed = "暂无";

        this.fanner2 = {
            name: "暂无",
            actions: [],
            object: [],
            angle: "0", // 角度
            dom: {
                speed: null,
                name: null,
                status: null
            },
            trueName: "#2风窗开窗",
            falseName: "#2风窗关窗",
            actionName: "#2风窗关窗"
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
                    // child.material.opacity = 0.68;
                    if (child instanceof THREE.Mesh && child.material.name === "通风水泥") {
                        child.material.map = null;

                    }
                }
            });
        }
        if (name === "position") {
            gltf.scene.traverse(child => {
                if (child.name === "风速1") {
                    this.createSpeedDom(child.position,"fanner1");
                }
                if (child.name === "风速2") {
                    this.createSpeedDom(child.position,"fanner2");
                }
                if (child.name.includes("门牌1")) {
                    this.createNameDom(child.position,"fanner1");
                }
                if (child.name.includes("门牌2")) {
                    this.createNameDom(child.position,"fanner2");
                }
                if (child.name === "开闭状态1") {
                    this.createStatusDom(child.position,"fanner1");
                }
                if (child.name === "开闭状态2") {
                    this.createStatusDom(child.position,"fanner2");
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

        this.actions.forEach(action => {
            console.log(action._clip.name);
            if (action._clip.name.includes("#1")) {
                this.fanner1.actions.push(action);
            }
            if (action._clip.name.includes("#2")) {
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

    updateDataInfo(element,type) {
        const { speed,parts } = element;
        if (type === "remove") { // 该风门删除了
            this.domSpeed = "暂无";
            this.setEquipmentState(1,"0"); // 两个风门关闭
            this.setEquipmentState(2,"0"); // 两个风门关闭

        } else { // 更新或者新增
            this.domSpeed = speed;
            parts.forEach((child,index) => {
                const { name,angle } = child;
                let fanner = this.fanner1;
                if (index === 1) {
                    fanner = this.fanner2;
                }
                fanner.name = name;
                if (angle === "0") {
                    fanner.actionName = fanner.falseName;
                } else {
                    fanner.actionName = fanner.trueName;
                }
                fanner.angle = angle;
                fanner.dom.speed.innerText = speed;
                fanner.dom.name.innerText = name;
                fanner.dom.status.innerText = angle + "度";
                this.setEquipmentState(index + 1,angle); // 开启动画
            });
        }
    }

    createSpeedDom(position,local) {
        let changeDom = document.getElementById("speedBoard").cloneNode(true);
        let arDoom = changeDom.getElementsByClassName("speedBoardInfo");
        arDoom[0].innerText = '暂无'; // dom元素赋值
        this[local].dom.speed = arDoom[0];
        const css2d = createCSS3DObject(changeDom);
        css2d.scale.set(0.0088,0.0088,0.0088);
        css2d.position.copy(position);
        css2d.rotation.y = -Math.PI / 2;
        this.css2ds.push(css2d);
        this.add(css2d);

    }
    createNameDom(position,local) {
        let changeDom = document.getElementById("nameBoard").cloneNode(true);
        changeDom.innerText = '暂无'; // dom元素赋值
        this[local].dom.name = changeDom;
        const css2d = createCSS3DObject(changeDom);
        css2d.scale.set(0.0048,0.0048,0.0048);
        css2d.position.copy(position);
        this.css2ds.push(css2d);
        this.add(css2d);
    }

    createStatusDom(position,local) {
        let changeDom = document.getElementById("statusBoard").cloneNode(true);
        changeDom.innerText = '暂无'; // dom元素赋值
        this[local].dom.status = changeDom;
        const css2d = createCSS3DObject(changeDom);
        css2d.scale.set(0.0088,0.0088,0.0088);
        css2d.position.copy(position);
        this.css2ds.push(css2d);
        this.add(css2d);

    }
    removeDom() {
        [...this.css2ds].forEach(child => {
            MemoryManager.dispose(child);
        });
    }
    /**
     * @param {{name:string;vertices:Vector3[];}[]} object
     * @param {string} name
     */
    onOBJProgress = (object,name) => {
        object.forEach(line => {
            const vertices = line.vertices;

            const flowLight = new FlowLight(vertices,{
                type: "line",
                width: 1.2,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(1,0,0),
                depthTest: true
            });
            flowLight.renderOrder = 2;
            flowLight.visible = false;
            this.flowLights.push(flowLight);
            this.add(flowLight);



            const flowLight2 = new FlowLight(vertices,{
                type: "line",
                width: 1.2,
                color1: new THREE.Vector3(0.3,0.3,0.6),
                color2: new THREE.Vector3(0,0.8,0.4),
                segments: 3,
                up: new THREE.Vector3(0,1,0),
                depthTest: true
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
        this.removeDom();
    }

    onLoaded() {
        // 当前系统模型未加载完成时切换其他系统,将不会给前端发送信息,由目标系统发送信息。
        if (this.scene !== this.core.scene) return;
        this.postprocessing.addBloom(this.bloomLights);

        this.onRenderQueue.set(_BoringMachineSubsystem,this.update);
        this.box();
        this.test();
    }

    test() {
        setTimeout(() => {
            this.setEquipmentState(true,1,0);
        },2000);
        setTimeout(() => {
            this.setEquipmentState(true,2,1);
        },4000);
        setTimeout(() => {
            this.setEquipmentState(false,1,1);
        },6000);
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
    setEquipmentState(code,type) {
        let fanner;
        if (code === 1) {
            fanner = this.fanner1;
        } else if (code === 2) {
            fanner = this.fanner2;
        } else {
            return;
        }
        // 通风机正在关闭的过程中开启通风机
        if (this.tweenCode) TWEEN.remove(this.tweenCode);
        if (type === "0") this.elapsedTime = 0;

        const actions = fanner.actions;
        const flowLights = this.flowLights;

        let toValue = 0;
        if (this.fanner1.actionName.includes('开窗') && this.fanner2.actionName.includes('开窗')) {
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
