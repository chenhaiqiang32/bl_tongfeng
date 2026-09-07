import * as THREE from "three";
import { Subsystem } from "../Subsystem";
import { Core3D } from "../..";
import { Weather, DAY, NIGHT, SCIENCE } from "../../components/weather";
import { HDGeometry } from "./../../../lib/HDGeometry";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TweenControls } from "../../../lib/tweenControls";

import DEFAULT from "../../../config/index.json";
import { LabelManager } from "../../components/label";
import { TunnelCard } from "./utils";
import MemoryManager from "../../../lib/memoryManager";
import { FlowLight, FlowLight2 } from "../../../lib/blMeshes";
import { getBoxAndSphere, getLengthFromVertices } from "../../../utils";
import { DeviceManger } from "./device";
import BoxModel from "../../../lib/boxModel";
import { loadingInstance } from "../../loader/loading";

export const ground = Symbol();

const position = new THREE.Vector3(-370.885379032486, 260.94104592491357, 257.39776480151085);
const target = new THREE.Vector3(...DEFAULT.controls.target);

// camera limit SPHERE
let SPHERE_CAMERA = new THREE.Sphere(new THREE.Vector3(), 2000);
let SPHERE_CONTROLS = new THREE.Sphere(new THREE.Vector3(), 1900);

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
        this.currentTunnelStyleData = {
            styleName: "",
            styleData: null,
        };
        this.postprocessing = core.postprocessing;
        this.meshGroup = new THREE.Group();
        this.meshGroup.name = "tunnelGroup";
        this.scene._add(this.meshGroup);
        this.labelData = [];
        this.tweenControls = new TweenControls(this);
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
        this.tunnelFlowBox = this.initTunnelFlowBox();
        this.tunnelFollowPicture = {};
        this.equipMentSystem = new DeviceManger(this); // 设备系统
        this.createLine = null;
    }
    /**
     * 设置id数据
     * @param {string} id
     * @param {T2} value
     */
    set(id, value) {
        this.tunnelData.set(Number(id), value);
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

    onOBJProgress = (vertices, direction, tunnelObj, speed) => {
        // 流光

        let tunnelVertices = vertices;
        let color = new THREE.Color(0.0235, 0.9647, 0.9333);
        let color2 = new THREE.Color(0.0196, 0.3373, 0.4824);
        if (direction === 2 || direction === 3) {
            // 巷道没风/用风

            tunnelObj.traverse(res => {
                if (res instanceof THREE.Mesh) {
                    res.oldMaterial = res.material.clone();
                    res.material.alphaTest = 0.8;
                    res.material.transparent = false;
                    res.renderOrder = 0;
                    res.material.color = new THREE.Color(0.4745, 0.6667, 0.902);
                }
            });

            return false;
        }
        if (direction === 1) {
            // 出风巷道
            color = new THREE.Color(0.1216, 0.8784, 0.0824);
            color2 = new THREE.Color(0.0196, 0.2353, 0.102);
        }
        const flowLight = new FlowLight2(tunnelVertices, {
            type: "tube",
            radius: 4.8,
            segments: getLengthFromVertices(tunnelVertices) / 200,
            color1: color,
            color2: color2,
            speed: speed || 0,
            opacity: 1.0,
        });
        tunnelObj.traverse(res => {
            if (res instanceof THREE.Mesh) {
                res.oldMaterial = res.material.clone();
                // res.material.onBeforeCompile = shader => {
                //     shaderModify(shader,{ shader: "fresnel",color: color2,shaderName: "level0" });
                // };
                res.material.alphaTest = 0.8;
                res.material.transparent = false;
                res.renderOrder = 0;
                res.material.color = color2;
            }
        });
        flowLight.renderOrder = 0;
        flowLight.position.y = flowLight.position.y + 2;
        this.flowLights.push(flowLight);
        this.add(flowLight);
    };
    init() {
        this.initLight();
        // this.weather = new Weather(this);
    }
    loadTexture(loader, url) {
        const texture = loader.load(url);
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    initMaterial() {
        let loader = new THREE.TextureLoader();
        let texture = loader.load("./textures/uv.jpg");
        texture.colorSpace = THREE.SRGBColorSpace;

        texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
        texture.repeat.set(4, 4);

        // texture.repeat.set(0.008,0.008);
        return texture;
    }
    /**
     * 处理用户数组的函数
     * @param {initialized[]} ars - 初始化巷道/更新巷道
     */
    initialized(ars) {
        // 生成巷道
        this.dispose();
        if (this.core.currentSystemName === "main") {
            loadingInstance.service(0);
            if (ars.length === 0) {
                loadingInstance.close();
            }
        }
        ars.forEach((child, index) => {
            const { id, branchName, pList, direction, speed } = child;
            pList.forEach(child => {
                const temp = child.y;
                child.y = child.z + Math.random() * 0.0001;
                child.z = temp + Math.random() * 0.0001; // 防止两个点在同个直线
                child.x = child.x * -1;
            });
            let points = pList.map(res => {
                return new THREE.Vector3(res.x, res.y, res.z);
            });
            this.initCurve(points, id, direction, speed);
            child.points = points;

            let geometry = new HDGeometry({ points }, index);

            this.material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0.1, 0.4, 0.6),
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
            const mesh = new THREE.Mesh(geometry, this.material); // 巷道模型
            mesh.typeId = id;
            let labelPosition = this.getCurve(id).getPointAt(0.5);
            child.position = labelPosition;
            object.add(mesh);
            child.object3d = object;
            this.set(id, child);
            this.eventsArray.push(mesh);
            this.meshGroup.add(object);
            if (this.equipMentSystem.noTunnelDevice[id]) {
                if (Object.values(this.equipMentSystem.noTunnelDevice[id]).length === 0) {
                    delete this.equipMentSystem.noTunnelDevice[id];
                }
                let alls = Object.keys(this.equipMentSystem.noTunnelDevice[id]);
                alls.forEach(key => {
                    let child = this.equipMentSystem.noTunnelDevice[id][key];
                    const { infos } = child;
                    child.hasTunnel = true;
                    this.equipMentSystem.deviceManger({ add: [], update: [infos], remove: [] });
                    delete this.equipMentSystem.noTunnelDevice[id][key];
                });
            }
            if (this.core.currentSystemName === "main") {
                loadingInstance.service(((100 * index) / ars.length).toFixed(2));
            }
        });
        if (this.core.currentSystemName === "main") {
            // 当前就在地面场景
            this.addEvents();
            this.limit();
        }
    }

    limit() {
        const { center, radius } = getBoxAndSphere(this.meshGroup).sphere;
        const { min } = getBoxAndSphere(this.meshGroup).box;
        this.boxModelObj.initModel(new THREE.Vector3(center.x, min.y, center.z), radius);

        this.resetCamera();
        // 限制相机和控制器范围
        this.controls.maxPolarAngle = Math.PI / 2;

        SPHERE_CAMERA = new THREE.Sphere(center, radius * 2.4);
        SPHERE_CONTROLS = new THREE.Sphere(center, radius * 2.4);
        this.handleControls();
    }
    resetCamera() {
        const { center, radius } = getBoxAndSphere(this.meshGroup).sphere;
        const vec = new THREE.Vector3(radius, radius, radius).multiplyScalar(1);
        const position = center.clone().add(vec);

        // 根据计算数据，设置动画
        this.tweenControls && this.tweenControls.flyToDelay(position, center, 200);
        setTimeout(() => {
            loadingInstance.close();
        }, 200);
        this.tweenControls.start();
    }

    getCurve(id) {
        // 获取样条曲线
        return this.tunnelCure[id];
    }

    getPosition(id, length) {
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

    switchTunnelResistance(config) {
        // 根据巷道阻力阈值切换不同风向的显示
        this.disposeStyle();
        const { code, color, threshold } = config;
        if (code === -1) return false; // -1 清除巷道变色
        this.tunnelData.forEach(child => {
            const { direction, resistance, id, isDifficult } = child;
            if (direction === code && isDifficult) {
                this.changeTunnelColor(id, color);
            }
        });
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
    switchTunnelStyle(config) {
        // 切换巷道风格
        const { objectData, typeName } = config;
        const typeToWei = { volume: " m³/min", speed: " m/s", resistance: "Pa" };
        const type = { default: "巷道名称", direction: "风向", volume: "风量", speed: "风速", resistance: "阻力" };

        this.disposeStyle();
        let tunnelType = typeName === "default" ? "branchName" : typeName;
        this.currentTunnelStyleData.styleName = tunnelType;
        this.currentTunnelStyleData.styleData = objectData;
        if (typeName === "direction") {
            this.tunnelData.forEach(child => {
                this.onOBJProgress(child.points, child.direction, child.object3d, child.speed);
            });
            return false;
        }

        const hasConfig = ["volume", "speed", "resistance"];
        this.tunnelData.forEach(child => {
            let currentTunnelConfig = child[tunnelType]; // 当前巷道上的对应配置数据
            if (tunnelType === "branchName" && !currentTunnelConfig) {
                // 没有巷道名字
                return false;
            }
            this.labelData.push({
                name: type[typeName] + ":" + currentTunnelConfig + (typeToWei[typeName] || ""),
                position: new THREE.Vector3(child.position.x, child.position.y + 4.8, child.position.z),
            });
            if (hasConfig.includes(tunnelType)) {
                // 风量，风速，阻力显示巷道变色
                let tunnelObj = this.filteredObjects(objectData, Math.abs(currentTunnelConfig))[0];
                if (!tunnelObj) return false;
                this.changeTunnelColor(child.id, tunnelObj.color);
            }
        });
        this.labelManager.init(this.labelData);

        this.updateVisibilityByCamera();
    }

    filteredObjects(k, b) {
        // 筛选出满足条件的对象
        let result = k.filter(obj => {
            const [min, max] = obj.range;
            return b >= min && b <= max;
        });
        return result;
    }
    changeTunnelColor(id, color) {
        // 修改巷道颜色
        let tunnelObject3d = this.get(id).object3d;
        tunnelObject3d.children[0].material.oldColor = tunnelObject3d.children[0].material.color.clone();
        tunnelObject3d.children[0].material.color.set(color);
    }
    resetTunnelColor(id) {
        let tunnelObject3d = this.get(id).object3d;
        tunnelObject3d.traverse(res => {
            if (res instanceof THREE.Mesh && res.oldMaterial) {
                res.material = res.oldMaterial;
                res.oldMaterial = null;
            }
        });
        if (tunnelObject3d.children[0].material.oldColor) {
            tunnelObject3d.children[0].material.color = tunnelObject3d.children[0].material.oldColor.clone();
            tunnelObject3d.children[0].material.oldColor = null;
        }
    }
    updateTunnelConfig(object, config) {
        object.forEach(child => {
            const { id, data } = child;
            let tunnel = this.get(id);
            tunnel[config] = data;
        });
        if (config === this.currentTunnelStyleData.styleName && this.core.currentSystemName === "main") {
            // 当前就在风格场景
            this.switchTunnelStyle({
                objectData: this.currentTunnelStyleData.styleData,
                typeName: config === "branchName" ? "default" : config,
            });
        }
    }

    initCurve(points, id, direction, speed) {
        // 生成样条曲线
        let tunnelPoints = points;
        if (direction === 1) {
            // 逆风
            tunnelPoints = points.reverse();
        }
        const curve = new THREE.CatmullRomCurve3(tunnelPoints);
        curve.curveType = "catmullrom";
        curve.tension = 0;
        this.tunnelCure[id] = curve;
        this.setTunnelFollow(id, curve, speed, direction);
    }
    setTunnelFollow(id, curve, speed, direction) {
        if (direction !== 2) {
            let Object3D = this.tunnelFlowBox.front.clone();
            if (direction === 1) {
                Object3D = this.tunnelFlowBox.back.clone();
            }
            this.tunnelFollowPicture[id] = {
                object3d: Object3D,
                time: 0,
                speed,
                direction,
                curve,
                id: id,
            };
            this.add(Object3D);
        }
    }

    initTunnelFlowBox() {
        let frontUrl = "./tunnelTexture/front/"; // 进风
        let backUrl = "./tunnelTexture/back/"; // 回风
        let arr = [frontUrl, backUrl];
        let obj = { front: null, back: null };
        arr.forEach((child, index) => {
            const geometry = new THREE.BoxGeometry(6.4, 7.2, 6.4);
            const materialRight = new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(`${child}right.png`),
                transparent: true,
                opacity: 1.0,
                side: THREE.DoubleSide,
            });
            const materialLeft = new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(`${child}left.png`),
                transparent: true,
                opacity: 1.0,
                side: THREE.DoubleSide,
            });
            const materialTop = new THREE.MeshBasicMaterial({
                map: new THREE.TextureLoader().load(`${child}down.png`),
                transparent: true,
                opacity: 1.0,
                side: THREE.DoubleSide,
            });
            const materialOther = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 });
            let tunnelFlowBox = new THREE.Mesh(geometry, [
                materialLeft,
                materialRight,
                materialTop,
                materialOther,
                materialOther,
                materialOther,
            ]); // 假设左右面是贴图，其他面透明
            let object3d = new THREE.Object3D();
            object3d.add(tunnelFlowBox);
            tunnelFlowBox.renderOrder = 10;
            tunnelFlowBox.position.z = 0; // 偏移长度为半个矩形的长度
            if (index === 0) {
                obj.front = object3d;
            } else {
                obj.back = object3d;
            }
        });
        return obj;
    }

    /**
     * 处理用户数组的函数
     * @param {deviceManage[]} ars - 初始化巷道/更新巷道
     */
    deviceManage(ars) {
        // 设备管理
        this.equipMentSystem.deviceManger(ars);
    }
    spotDevice(obj) {
        // 设备管理
        this.equipMentSystem.spotDevice(obj);
    }
    spotTunnel(id) {
        let device = this.get(id);
        if (device) {
            let position = device.position;
            this.tweenControls &&
                this.tweenControls.flyToDelay(
                    { x: position.x + 48, y: position.y + 48, z: position.z + 48 },
                    position,
                    1000,
                );
            this.tweenControls.start();
            this.openTunnelBoard(id, position);
        }
    }

    addEvents() {
        const { clear: moveClear } = this.core.raycast("mousemove", this.eventsArray, intersection => {
            if (intersection.length > 0) {
                const point = intersection[0].point;
                if (this.clearOutLine) this.core.postprocessing.clearOutline(this.clearOutLine);
                this.core.postprocessing.addOutline(intersection[0].object, 1);
                this.clearOutLine = intersection[0].object;
                this.openTunnelBoard(intersection[0].object.typeId, point);
            } else {
                this.closeTunnelBoard();
                if (this.clearOutLine) this.core.postprocessing.clearOutline(this.clearOutLine);
            }
        });
        this.removes.push(moveClear);

        this.addEventControlChange();
    }
    addEventControlChange() {
        this.controls.addEventListener("change", this.updateVisibilityByCamera);
    }

    removeControlChange() {
        this.controls.removeEventListener("change", this.updateVisibilityByCamera);
    }

    updateVisibilityByCamera = () => {
        // 根据相机位置，控制显示隐藏
        let camera = this.camera;
        let canShowObj = [];
        this.labelManager.dispose();
        this.labelData.forEach(child => {
            if (child.position) {
                // 计算物体与相机的距离
                var distance = camera.position.distanceTo(child.position);
                // 判断距离，并设置物体的可见性
                if (distance <= 880) {
                    canShowObj.push(child);
                }
            }
        });
        this.labelManager.init(canShowObj);
    };

    /** 显示巷道弹窗 */
    openTunnelBoard(id, position) {
        MemoryManager.dispose(this.createLine);
        const item = this.get(id);
        const label = new TunnelCard(item);
        label.name = "board";
        label.typeName = "boardTitle";
        label.setInnerText(this.get(id));
        label.visible = true;
        item.object3d.add(label);
        let endPosition = position.clone();
        label.position.copy(endPosition);
        label.center = new THREE.Vector2(-0.28, 1.12);
    }

    /** 关闭巷道弹窗 */
    closeTunnelBoard() {
        const label = new TunnelCard();
        MemoryManager.dispose(this.createLine);
        label.removeFromParent();
    }

    removeEvents() {
        this.removes.forEach(clear => clear());
        this.removes.length = 0;
    }

    handleControls() {
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
        const position = this.camera.position;
        const target = this.controls.target;
        position.clampSphere(SPHERE_CAMERA);
        target.clampSphere(SPHERE_CONTROLS);
        position.y = position.y < 0 ? 0 : position.y;
        target.y = target.y < 0 ? 0 : target.y;
    };
    async onEnter() {
        if (this !== this.core.currentSystem) return;
        // loadingInstance.service(0);
        this.onLoaded();
    }

    /**
     * @param {import("three/examples/jsm/loaders/GLTFLoader").GLTF} gltf
     * @param {import { HDGeometry } from './../../../lib/HDGeometry';
    string} name
     */

    onLeave() {
        this.removeEvents(); //  移除射线
        this.resetControls(); // 恢复控制器的默认效果
        this.onRenderQueue.delete(ground); // 移除更新事件
        this.postprocessing.clearBloom(this.flowLights);
        this.commonDispose();
    }

    onLoaded() {
        // 当前系统模型未加载完成时切换其他系统,将不会给前端发送信息,由目标系统发送信息。
        if (this.scene !== this.core.scene) return;
        if (Object.values(this.tunnelCure).length) {
            this.limit();
            this.addEvents();
        }
        this.postprocessing.addBloom(this.flowLights);
        this.onRenderQueue.set(ground, this.update);
        if (this.equipMentSystem) {
            this.equipMentSystem.onLoadedReset();
        }
    }
    tunnelFollowUpdate = () => {
        Object.values(this.tunnelFollowPicture).forEach(child => {
            // 更新t值以沿着曲线移动
            let { object3d, speed, direction, curve, id } = child;
            let addLength = 0;
            let t = (Math.abs(speed) * 0.01 + addLength) / curve.getLength();
            child.time = child.time + t;
            if (child.time > 1) {
                child.time = 0; // 当到达终点时重置t到起点(算上模型本身长度)
            }
            // 根据t值获取曲线上的点
            const point = curve.getPointAt(child.time);
            point.y = point.y + 2;
            // 可以根据需要获取曲线的切线来控制BoxGeometry的方向
            const tangent = curve.getTangentAt(child.time);
            // tangent.y = 0;
            object3d.position.copy(point);
            let lookAtVet = tangent.add(point);
            // 如果需要，可以根据切线设置BoxGeometry的方向
            object3d.lookAt(lookAtVet);
        });
    };
    /**@param {Core3D} core  */
    update = core => {
        this.updateMixers(core.delta);

        this.elapseTime += core.delta;

        this.flowLights.forEach(flowLight => flowLight.update(this.elapseTime));
        this.boxModelObj && this.boxModelObj.update(this.elapseTime);
        this.tunnelFollowUpdate();
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

        directionalLight.position.set(30, 390, 600);
        directionalLight.castShadow = DEFAULT_DIRECTIONAL_LIGHT.castShadow;

        this.ambientLight = ambientLight;
        this._add(this.ambientLight);

        this.directionalLight = directionalLight;
        this._add(this.directionalLight);
    }
    disposeStyle() {
        // 恢复流光
        this.flowLights.forEach(child => {
            MemoryManager.dispose(child);
        });
        this.flowLights = [];
        this.currentTunnelStyleData = {
            // 清除记录的巷道风格信息
            styleName: "",
            styleData: null,
        };
        // 清除巷道牌子
        this.labelManager.dispose();
        this.labelData = [];

        this.tunnelData.forEach((child, id) => {
            this.resetTunnelColor(id);
        });
    }
    dispose() {
        if (this.boxModelObj) this.boxModelObj.dispose(); // 销毁地面盒子效果
        let tunnelCureData = Object.keys(this.tunnelCure); // 巷道id数组
        for (var i = tunnelCureData.length - 1; i >= 0; i--) {
            let key = tunnelCureData[i]; // 巷道id
            MemoryManager.dispose(this.tunnelCure[key]); // 清除样条曲线
            if (this.tunnelFollowPicture[key]) {
                MemoryManager.dispose(this.tunnelFollowPicture[key].object3d); // 清除流动箭头
                this.tunnelFollowPicture[key].object3d = null;
                this.tunnelFollowPicture[key].time = 0;
            }
            this.tunnelCure[key] = null;
            this.del(key); // 删除巷道数据
        }
        this.eventsArray = []; // 射线循环数组滞空
        this.equipMentSystem.disposeEquip(); // 销毁设备
        this.tunnelCure = {}; // 样条曲线数据
        this.tunnelFollowPicture = {}; // 流动箭头
        this.commonDispose();
    }
    commonDispose() {
        // 离开页面和更新巷道都需要执行的方法
        this.disposeStyle(); // 重置风格样式
        this.removeEvents(); // 移除事件
        this.closeTunnelBoard();
        this.elapseTime = 0;
        this.equipMentSystem.disposeDom(); // 销毁设备的事件监听  从地图中剔除设备
        if (this.clearOutLine) this.core.postprocessing.clearOutline(this.clearOutLine); // 清除轮廓发光
    }
    switchFacility(array) {
        this.equipMentSystem.switchFacility(array);
    }
    setTypeVisibleEx(array) {
        this.equipMentSystem.setTypeVisibleEx(array);
    }
}
