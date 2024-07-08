import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import { loadGLTF, loadOBJ } from "../../loader";
import { boringMachine_models } from "@/assets/models";
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

export const _BoringMachineSubsystem = Symbol();

const position = new THREE.Vector3(0, 20, 20);
const target = new THREE.Vector3();

// camera limit SPHERE
const SPHERE_CAMERA = new THREE.Sphere(new THREE.Vector3(), 50);
const SPHERE_CONTROLS = new THREE.Sphere(new THREE.Vector3(), 49);

/**@type {OrbitControls} */
const controlsParameters = {
    enablePan: false,
    // enableZoom: false,
    rotateSpeed: 0.4,
    // minPolarAngle: Math.PI / 2.05,
    maxPolarAngle: Math.PI / 2.1,
    maxAzimuthAngle: Math.PI * 0.05, // 右侧
    minAzimuthAngle: -Math.PI * 0.2, // 左侧
    maxDistance: 15,
    enableDamping: true,
};

/**@classdesc 包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class BoringMachineSubsystem extends Subsystem {
    /** @param {Core3D} core*/
    constructor (core) {
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
        // this.initAxesHelper();
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

        this.controls.addEventListener("change", this.limitInSphere);

        Reflect.ownKeys(controlsParameters).forEach(key => {
            this.controls.data[key] = this.controls[key];
            this.controls[key] = controlsParameters[key];
        });
    }

    resetControls() {
        this.controls.removeEventListener("change", this.limitInSphere);

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
        this.onRenderQueue.set(_BoringMachineSubsystem, this.update);

        await loadGLTF(boringMachine_models, this.onProgress);
        await loadOBJ(boringMachine_models, this.onOBJProgress);

        this.onLoaded();
    }

    /**
     * @param {import("three/examples/jsm/loaders/GLTFLoader").GLTF} gltf
     * @param {string} name
     */
    onProgress = (gltf, name) => {
        if (this.core.scene !== this.scene) return;
        let group;

        const _name = name.toLocaleLowerCase().trim();

        // 特殊模型处理
        if (_name.includes("instanced_tree")) {
            group = processingInstancedTree(gltf);
        } else if (_name.includes("merged_tree")) {
            group = processingMergedTree(gltf);
        } else if (_name.includes("instanced")) {
            group = processingInstancedModel(gltf);
        } else if (_name.includes("camera")) {
            processingCameraAnimation(gltf, this);
        } else {
            processingAnimations(gltf, this);

            const scope = this;
            /**
             * 对模型的预处理
             * @param {THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>} mesh
             */
            function preProcess(mesh) {
                mesh.castShadow = false;
                mesh.receiveShadow = false;
            }

            /**
             * 对模型的后处理
             * @param {THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>} mesh
             */
            function postProcess(mesh) {
                if (mesh.name === "矿002_2") {
                    mesh.receiveShadow = true;
                }
                if (mesh.name.includes("掘进机") || mesh.parent.name.includes("掘进机")) {
                    mesh.castShadow = true;
                }
            }

            // 通用模型处理
            group = processingCommonModel(gltf, this, postProcess, preProcess);
        }
        group && this.add(group);
    };
    /**
     * @param {{name:string;vertices:Vector3[];}[]} object
     * @param {string} name
     */
    onOBJProgress = (object, name) => {
        if (name.toLocaleLowerCase().includes("path")) {
            object.forEach(line => {
                const vertices = line.vertices;
                const flowLight = new FlowLight(vertices, {
                    type: "line",
                    width: 2.5,
                    segments: getLengthFromVertices(vertices) / 300,
                });
                flowLight.renderOrder = 2;
                this.flowLights.push(flowLight);
                this.add(flowLight);
            });
        } else {
        }
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

        this.onRenderQueue.set(_BoringMachineSubsystem, this.update);
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
        const _BoringMachineSubsystem = new PlatformCircle(100, 100);
        this._add(_BoringMachineSubsystem);

        const count = 500;
        const range = new THREE.Box3(new THREE.Vector3(-2000, -2000, -2000), new THREE.Vector3(2000, 2000, 2000));
        this.stars = new Stars(count, range);
        this._add(this.stars);

        const ambientLight = new THREE.AmbientLight(0xffffff); // 线性SRG
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);

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

        directionalLight.position.set(0, 10, -2);

        const dir2 = new THREE.DirectionalLight(0xffffff, 1);
        dir2.position.set(0, 50, 50);
        this._add(dir2);

        this.ambientLight = ambientLight;
        this._add(this.ambientLight);

        this.directionalLight = directionalLight;
        this._add(this.directionalLight);

        // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // this.scene.add(shadowHelper);
    }
}
