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
import MemoryManager from "../../../lib/memoryManager";
import { FlowLight } from "../../../lib/blMeshes";
import { getBoxAndSphere,getLengthFromVertices } from "../../../utils";
import { TunnelPicture } from "./tunnelPicture";
import { DeviceManger } from "./device";
import BoxModel from "../../../lib/boxModel";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";

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
        this.meshGroup = new THREE.Group();
        this.meshGroup.name = "tunnelGroup";
        this.scene.add(this.meshGroup);
        this.equipMentSystem = new DeviceManger(this); // 设备系统
        this.labelData = [];
        this.tweenControls = new TweenControls(this);
        this.tunnelPicture = new TunnelPicture(this);
        this.boxModelObj = new BoxModel(core);
        this.core = core;

        this.elapseTime = 0;

        this.init();

        /**双击事件检测对象 */
        this.eventsArray = [];
        this.removes = [];

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
        this.tunnelData.set(Number(id),value);
    }

    /**是否存在id数据 */
    has(id) {
        return this.tunnelData.has(Number(id));
    }

    /** 获取id数据 */
    get(id) {
        return this.tunnelData.get(Number(id));
    }

    /**删除id数据 */
    del(id) {
        if (!this.has(id)) return false;
        let object3d = this.get(id).object3d;
        MemoryManager.dispose(object3d);
        this.tunnelData.delete(Number(id));
    }

    onOBJProgress = (vertices,direction) => { // 流光
        let tunnelVertices = vertices;
        if (direction === 2) { // 巷道没风
            return false;
        }
        if (direction === 1) {
            tunnelVertices = vertices.reverse();
        }
        const flowLight = new FlowLight(tunnelVertices,{
            type: "tube",
            width: 2.5,
            segments: getLengthFromVertices(tunnelVertices) / 12,
        });
        flowLight.renderOrder = 0;
        this.flowLights.push(flowLight);
        this.add(flowLight);
    };
    init() {
        this.initLight();
        // this.weather = new Weather(this);
    }
    loadTexture(loader,url) {
        const texture = loader.load(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    initMaterial() {
        let loader = new THREE.TextureLoader();
        let texture = loader.load("/textures/uv.jpg");
        texture.colorSpace = THREE.SRGBColorSpace;

        texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.repeat.set(4,4);

        // texture.repeat.set(0.008,0.008);
        return texture;
    }
    /**
     * 处理用户数组的函数
     * @param {initialized[]} ars - 初始化巷道/更新巷道
    */
    initialized(ars) { // 生成巷道
        this.dispose();
        ars.forEach(child => {
            const { id,branchName,pList,direction,speed } = child;
            let points = pList.map(res => { return new THREE.Vector3(res.x,res.y,res.z); });
            this.initCurve(points,id);
            child.points = points;
            let geometry = new HDGeometry({ points });
            this.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.1,0.4,0.6),
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
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
            // let pictureMesh = this.tunnelPicture.init(points,id,direction,speed);
            child.position = labelPosition;
            object.add(mesh);
            // object.add(pictureMesh);
            child.object3d = object;
            this.set(id,child);
            this.eventsArray.push(mesh);
            this.meshGroup.add(object);
        });
        this.addEvents();
        this.limit();
    }
    limit() {
        const { center,radius } = getBoxAndSphere(this.meshGroup).sphere;
        const vec = new THREE.Vector3(radius,radius,radius).multiplyScalar(1.2);
        const position = center.clone().add(vec);
        this.boxModelObj.initModel(center,radius);

        // 根据计算数据，设置动画
        this.tweenControls && this.tweenControls.flyToDelay(position,center,1000);
        this.tweenControls.start();
        // 限制相机和控制器范围
        this.controls.maxPolarAngle = Math.PI / 2;
    }



    getCurve(id) { // 获取样条曲线
        return this.tunnelCure[id];
    }

    getPosition(id,length) {
        let curve = this.getCurve(id);
        if (!curve) {
            console.log(`巷道线${id}不存在`);
            return false;
        }
        let allLength = curve.getLength();
        let t = length / allLength;
        if (t > 1) t = 1;
        return curve.getPointAt(t);
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
    switchTunnelStyle(config) { // 切换巷道风格
        const { objectData,typeName } = config;
        const type = { default: "巷道名称",direction: "风向",volume: "风量",speed: "风速",resistance: "阻力" };

        // 恢复流光
        this.flowLights.forEach(child => {
            MemoryManager.dispose(child);
        });
        this.flowLights = [];

        // 清除巷道牌子
        this.labelManager.dispose();
        this.labelData = [];

        this.tunnelData.forEach((child,id) => {
            this.resetTunnelColor(id);
        });


        if (typeName === "direction") {
            this.tunnelData.forEach(child => {
                this.onOBJProgress(child.points,child.direction);
            });
            return false;
        }
        let tunnelType = typeName === "default" ? "branchName" : typeName;
        const hasConfig = ['volume','speed','resistance'];
        this.tunnelData.forEach(child => {
            let currentTunnelConfig = child[tunnelType]; // 当前巷道上的对应配置数据
            this.labelData.push({
                name: type[typeName] + ":" + currentTunnelConfig,
                position: child.position
            });
            if (hasConfig.includes(tunnelType)) { // 风量，风速，阻力显示巷道变色
                let tunnelObj = this.filteredObjects(objectData,currentTunnelConfig)[0];
                this.changeTunnelColor(child.id,tunnelObj.color);
            }
        });
        this.labelManager.init(this.labelData);
    }

    filteredObjects(k,b) { // 筛选出满足条件的对象
        let result = k.filter(obj => {
            const [min,max] = obj.range;
            return b >= min && b <= max;
        });
        return result;
    }
    changeTunnelColor(id,color) { // 修改巷道颜色
        let tunnelObject3d = this.get(id).object3d;
        tunnelObject3d.children[0].material.oldColor = tunnelObject3d.children[0].material.color.clone();
        tunnelObject3d.children[0].material.color.set(color);

    }
    resetTunnelColor(id) {
        let tunnelObject3d = this.get(id).object3d;
        if (tunnelObject3d.children[0].material.oldColor) {
            tunnelObject3d.children[0].material.color = tunnelObject3d.children[0].material.oldColor.clone();
            tunnelObject3d.children[0].material.oldColor = null;
        }
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
                this.openTunnelBoard(intersection[0].object.typeId,point);
            } else {
                this.closeTunnelBoard();
                if (this.clearOutLine) this.core.postprocessing.clearOutline(this.clearOutLine);
            }
        });
        this.removes.push(moveClear);
    }

    /** 显示巷道弹窗 */
    openTunnelBoard(id,position) {
        const item = this.get(id);
        const label = new TunnelCard(item);
        label.name = "board";
        label.typeName = "boardTitle";
        label.setInnerText(this.get(id));
        label.visible = true;
        item.object3d.add(label);
        position.y = position.y + 40;
        label.position.copy(position);
        console.log(label);
    }

    /** 关闭巷道弹窗 */
    closeTunnelBoard() {
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
        this.tunnelPicture.update();
        this.boxModelObj && this.boxModelObj.update(this.elapseTime);
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
        let tunnelCureData = Object.keys(this.tunnelCure);
        for (var i = tunnelCureData.length - 1; i >= 0; i--) {
            let key = tunnelCureData[i]; // 巷道id
            MemoryManager.dispose(this.tunnelCure[key]);
            this.tunnelCure[key] = null;
            this.del(key); // 删除巷道数据
        }
        this.tunnelPicture.dispose();
        this.tunnelCure = {};
        this.labelData = [];
        this.eventsArray = [];
        this.removeEvents();
        this.labelManager.dispose();
        if (this.clearOutLine) this.core.postprocessing.clearOutline(this.clearOutLine);

    }
}
