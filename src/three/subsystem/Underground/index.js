import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import { Core3D } from "../..";
import { Weather,DAY,NIGHT,SCIENCE } from "../../components/weather";
import { HDGeometry } from './../../../lib/HDGeometry';

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TweenControls } from "../../../lib/tweenControls";

import DEFAULT from "../../../config/index.json";
import { LabelManager } from "../../components/label";
import { TunnelCard } from "./utils";

export const ground = Symbol();

const position = new THREE.Vector3(-370.885379032486,260.94104592491357,257.39776480151085);
const target = new THREE.Vector3(...DEFAULT.controls.target);

// camera limit SPHERE
const SPHERE_CAMERA = new THREE.Sphere(new THREE.Vector3(),2000);
const SPHERE_CONTROLS = new THREE.Sphere(new THREE.Vector3(),1900);

/**@type {OrbitControls} */
const controlsParameters = {};

/**@classdesc 地面广场，包含场景，子系统特有的功能，系统的切换（包含主场景和子场景切换） */
export class UnderGround extends Subsystem {
    /** @param {Core3D} core*/
    constructor(core) {
        super(core);
        /**
         * 实例的名称。
         * @type position vec3 坐标
         * @type name string 名称
         */
        this.labelData = [];
        this.tweenControls = new TweenControls(this);
        this.equipMentSystem = core.equipSystem; // 设备系统

        this.elapseTime = 0;

        this.init();

        /**双击事件检测对象 */
        this.eventsArray = [];
        this.removes = [];

        this.glasses = [];
        this.flowLights = [];

        this.labelManager = new LabelManager(this);

        /**
         * @property {Object} - 巷道样条曲线集合
        */
        this.tunnelCure = {};
        this.tunnelData = new Map(); // 巷道数据
        this.clearOutLine = null;
    }
    /**
   * 设置id数据
   * @param {string} id
   * @param {T2} value
   */
    set(id,value) {
        this.tunnelData.set(id,value);
    }

    /**是否存在id数据 */
    has(id) {
        return this.tunnelData.has(id);
    }

    /** 获取id数据 */
    get(id) {
        return this.tunnelData.get(id);
    }

    /**删除id数据 */
    del(id) {
        this.tunnelData.delete(id);
    }

    onOBJProgress = (object,name) => { // 流光
        if (name.toLocaleLowerCase().includes("path")) {
            object.forEach(line => {
                const vertices = line.vertices;
                const flowLight = new FlowLight(vertices,{
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
    init() {
        this.initLight();
    }

    /**
     * 处理用户数组的函数
     * @param {initialized[]} ars - 初始化巷道/更新巷道
    */
    initialized(ars) { // 生成巷道
        ars.forEach(child => {
            const { id,branchName,pList } = child;
            let points = pList.map(res => { return new THREE.Vector3(res.x,res.y,res.z); });
            this.initCurve(points,id);
            let geometry = new HDGeometry({ points });
            this.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.1,0.4,0.6),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.48,
            });
            this.material.onBeforeCompile = shader => {
                const chunk = `
                vec3 outgoingLight = reflectedLight.indirectDiffuse;
                outgoingLight.xyz *= 1.8;
                `;

                shader.fragmentShader = shader.fragmentShader.replace(
                    "vec3 outgoingLight = reflectedLight.indirectDiffuse",
                    chunk,
                );
            };
            const object = new THREE.Object3D();
            const mesh = new THREE.Mesh(geometry,this.material); // 巷道模型
            mesh.typeId = id;
            let labelPosition = this.getCurve(id).getPointAt(0.5);
            child.position = labelPosition;
            this.labelData.push({ position: labelPosition,name: `巷道名称：${branchName}` });
            object.add(mesh);
            child.object3d = object;
            this.set(id,child);
            this.eventsArray.push(mesh);
            this.scene.add(object);
        });
    }

    getCurve(id) { // 获取样条曲线
        return this.tunnelCure[id];
    }

    /**
     *
     * @param {string} tunnelString -
     * 巷道风格
     * default:默认
     * direction：风向
     * volume：风量
     * speed：风速
     * resistance：阻力
    */
    switchTunnelStyle(tunnelString) { // 切换巷道风格
        const type = { default: "巷道名称",direction: "风向",volume: "风量",speed: "风速",resistance: "阻力" };
        this.labelManager.dispose();
        this.labelData = [];
        let tunnelType = tunnelString === "default" ? "branchName" : tunnelString;
        this.tunnelData.forEach(child => {
            this.labelData.push({
                name: type[tunnelString] + ":" + child[tunnelType],
                position: child.position
            });
        });
        this.labelManager.init(this.labelData);
    }
    updateTunnelConfig(object,config) {
        object.forEach(child => {
            const { id,data } = child;
            let tunnel = this.get(id);
            tunnel[config] = data;
        });

    }
    initCurve(points,id) { // 生成样条曲线
        const curve = new THREE.CatmullRomCurve3(points);
        curve.curveType = "catmullrom";
        curve.tension = 0;
        this.tunnelCure[id] = curve;
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
        this.lineObj = new THREE.Line(geometry,material);
        this.scene.add(this.lineObj);
    }

    /**
     * 处理用户数组的函数
     * @param {deviceManage[]} ars - 初始化巷道/更新巷道
    */
    deviceManage(ars) { // 设备管理
        this.equipMentSystem.deviceManger(ars);
    }

    addEvents() {
        const { clear: moveClear } = this.core.raycast("mousemove",this.eventsArray,intersection => {
            if (intersection.length > 0) {
                const point = intersection[0].point;
                if (this.clearOutLine)
                    this.core.postprocessing.clearOutline(this.clearOutLine);
                this.core.postprocessing.addOutline(intersection[0].object,1);
                this.clearOutLine = intersection[0].object;
                this.openBoard(intersection[0].object.typeId,point);
            } else {
                this.closeBoard();
                if (this.clearOutLine) this.core.postprocessing.clearOutline(this.clearOutLine);
            }
        });
        this.removes.push(moveClear);
    }

    /** 显示巷道弹窗 */
    openBoard(id,position) {
        const item = this.get(id);
        const label = new TunnelCard(item);
        label.name = "board";
        label.typeName = "boardTitle";
        label.setInnerText("board");
        label.visible = true;
        item.object3d.add(label);
        label.position.copy(position);
        console.log(label);
    }

    /** 关闭巷道弹窗 */
    closeBoard() {
        const label = new TunnelCard();
        label.removeFromParent();
    }

    removeEvents() {
        this.removes.forEach(clear => clear());
        this.removes.length = 0;
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
        const position = this.camera.position;
        const target = this.controls.target;
        position.clampSphere(SPHERE_CAMERA);
        target.clampSphere(SPHERE_CONTROLS);
        position.y = position.y < 0 ? 0 : position.y;
        target.y = target.y < 0 ? 0 : target.y;
    };
    async onEnter() {

        this.addEvents();
        this.handleControls();

        this.onRenderQueue.set(ground,this.update);

        if (this !== this.core.currentSystem) return;

        this.setCameraState(true);

        this.onLoaded();
    }

    /**
     * @param {import("three/examples/jsm/loaders/GLTFLoader").GLTF} gltf
     * @param {import { HDGeometry } from './../../../lib/HDGeometry';
string} name
     */

    onLeave() {
        this.removeEvents();
        this.resetControls();
        this.clearMixers();
        this.setCameraState(false);
        this.onRenderQueue.delete(ground);
    }

    onLoaded() {
        // 当前系统模型未加载完成时切换其他系统,将不会给前端发送信息,由目标系统发送信息。
        if (this.scene !== this.core.scene) return;
        this.playActions();

        this.onRenderQueue.set(ground,this.update);
    }

    /**@param {Core3D} core  */
    update = core => {
        this.updateMixers(core.delta);

        this.elapseTime += core.delta;

        this.flowLights.forEach(flowLight => flowLight.update(this.elapseTime));
    };

    initLight() {
        const ambientLight = new THREE.AmbientLight(
            parseInt(DEFAULT.ambientLight.color),
            DEFAULT.ambientLight.intensity,
        ); // 线性SRG
        const directionalLight = new THREE.DirectionalLight(
            parseInt(DEFAULT.directionalLight.color),
            DEFAULT.directionalLight.intensity,
        );

        const DEFAULT_DIRECTIONAL_LIGHT = DEFAULT.directionalLight;
        const DEFAULT_SHADOW = DEFAULT_DIRECTIONAL_LIGHT.shadow;

        directionalLight.shadow.camera.near = 0;
        directionalLight.shadow.camera.far = 1200;
        directionalLight.shadow.camera.right = 500;
        directionalLight.shadow.camera.left = -500;
        directionalLight.shadow.camera.top = 500;
        directionalLight.shadow.camera.bottom = -500;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.blurSamples = DEFAULT_SHADOW.blurSamples;

        directionalLight.shadow.radius = DEFAULT_SHADOW.radius;
        directionalLight.shadow.bias = -0.0006;

        directionalLight.position.set(30,390,600);
        directionalLight.castShadow = DEFAULT_DIRECTIONAL_LIGHT.castShadow;

        this.ambientLight = ambientLight;
        this._add(this.ambientLight);

        this.directionalLight = directionalLight;
        this._add(this.directionalLight);
    }
    dispose() {
        
    }
}
