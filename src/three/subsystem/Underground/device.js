import MemoryManager from "../../../lib/memoryManager";
import { Device3D } from "./device3d";
import { Camera } from 'three';

export class DeviceManger {
    constructor(core) {
        this.core = core;
        this.tweenControls = core.tweenControls;
        this.scene = core.scene;
        this.cameraNear = 480; // 相机显示距离
        this.underGround = core;
        this.showBoardDom = []; // 要显示弹窗的设备
        this.hideObjectIcon = []; // 筛选隐藏的图标
        this.showObjectById = { type: null,id: null }; // 需要单个显示的设备
        this.deviceCode = {
            101: {
                code: 101, // 二氧化碳、
                name: "二氧化碳",
                dom: () => { return document.getElementById("sensor").cloneNode(true); },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            102: {
                code: 102, // 粉尘
                name: "粉尘",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            103: {
                code: 103, // 氧气
                name: "氧气",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            104: {
                code: 104, // 温湿度
                name: "温湿度",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            105: {
                code: 105, // 声光
                name: "声光",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            106: {
                code: 106, // 差压
                name: "差压",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            107: {
                code: 107, // 风速传感器
                name: "风速传感器",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" },
            },
            108: {
                code: 108,  // 一氧化碳
                name: "一氧化碳",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" }
            },
            109: {
                code: 109,  // 甲烷
                name: "甲烷",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" }
            },
            110: {
                code: 110,  // 负压传感器
                name: "负压传感器",
                dom: () => {
                    return document.getElementById("sensor").cloneNode(true);
                },
                domToValue: { "name": "sensorName","point": "sensorPoint","hid": "HID","category": "deviceCategory","local": "devicePosition","data": "measureValue" },
                domColor: {},
                domEvent: { "定位": "changeToLocal" }
            },
            201: {
                code: 201, // 主扇
                name: "主扇",
                dom: () => {
                    return document.getElementById("deviceFan").cloneNode(true);
                },
                systemName: "fanSubsystem",
                domToValue: { "name": "IdentifyDomName","status": "IdentifyDomStatus","volume": "IdentifyDomVolume","pressure": "IdentifyDomPressure",},
                statusValue: { "true": "运行正常","false": "停止运行" },
                domToValueParts: [{ "name": "deviceFirstName","status": "deviceFirstStatus" },{ "name": "deviceSecondName","status": "deviceSecondStatus" }],
                domEvent: { "定位": "changeToLocal","管控": "changeSystem" }
            },
            202: {
                code: 202, // 局扇
                name: "局扇",
                dom: () => {
                    return document.getElementById("partFan").cloneNode(true);
                },
                systemName: "partFanSubsystem",
                domToValue: { "name": "partName","status": "partStatus","electric": "electricValue","voltage": "voltageValue" },
                statusValue: { "true": "运行正常","false": "停止运行" },
                domToValueParts: [{ "name": "deviceFirstName","status": "deviceFirstStatus" },{ "name": "deviceSecondName","status": "deviceSecondStatus" }],
                domEvent: { "定位": "changeToLocal","管控": "changeSystem" }
            },
            203: {
                code: 203,// 风门
                name: "风门",
                dom: () => {
                    return document.getElementById("deviceWindDoor").cloneNode(true);
                },
                systemName: "airDoor",
                domToValue: { "name": "doorName","status": "doorStatus",},
                statusValue: { "true": "连接正常","false": "连接异常" },
                domToValueParts: [{ "name": "deviceFirstName","status": "deviceFirstStatus" },{ "name": "deviceSecondName","status": "deviceSecondStatus" }],
                domEvent: { "定位": "changeToLocal","管控": "changeSystem" }
            },
            204: {
                code: 204, // 风窗
                name: "风窗",
                dom: () => {
                    return document.getElementById("deviceWindWindow").cloneNode(true);
                },
                systemName: "airWindow",
                domToValue: { "name": "windowName","status": "windowStatus" },
                statusValue: { "true": "连接正常","false": "连接异常" },
                domToValueParts: [{ "name": "deviceFirstName","angle": "windowFirstAngle" },{ "name": "deviceSecondName","angle": "windowSecondAngle" }],
                domEvent: { "定位": "changeToLocal","管控": "changeSystem" }
            },

            205: {
                code: 205, // 测风站
                name: "测风站",
                dom: () => {
                    return document.getElementById("deviceWindStation").cloneNode(true);
                },
                systemName: "airStation",
                domToValue: { "name": "measureName","status": "measureStatus","speed": "measureSpeed","methane": "measureCh4","co": "measureCo" },
                statusValue: { "true": "连接正常","false": "连接异常" },
                domEvent: { "定位": "changeToLocal","管控": "changeSystem" }
            },
            206: {
                code: 206,// 基站
                name: "基站",
                dom: () => {
                    return document.getElementById("station").cloneNode(true);
                },
                domToValue: { "name": "stationName","point": "stationPoint","hid": "hid","ip": "ip","local": "stationLocal","status": "stationStatus" },
                statusValue: { "true": "连接正常","false": "连接异常" },
                domEvent: { "定位": "changeToLocal" }
            },
            207: {
                code: 207, // 视频
                name: "视频",
                dom: () => {
                    return null;
                }
            }
        };
        this.device = {  // 按照设备类型和id存储的数据
        };
        this.device3d = new Device3D(this);
    }
    set(id,value,type) {
        if (!this.device[type]) {
            this.device[type] = new Map();
        }
        this.device[type].set(id,value);
    }

    /**是否存在id数据 */
    has(id,type) {
        return this.device[type].has(id);
    }

    /** 获取id数据 */
    get(id,type) {
        if (id === null || (!this.device[type])) return null;
        return this.device[type].get(id);
    }

    /**删除id数据 */
    del(id,type) {
        let object3d = this.device[type].get(id).object3d;
        MemoryManager.dispose(object3d);
        this.device[type].delete(id);
    }
    /**
     * 处理deviceManage的函数
     * @param {deviceManage} ars - deviceManage对象，包含add、update、remove三个数组
    */
    deviceManger(ars) {
        this.removeControlChange();
        this.addEvents();
        const { add,update,remove } = ars;
        add.forEach(element => {
            const { id,type } = element;
            const { obj3d,position } = this.device3d.create(element);
            if (!obj3d) return false;
            element.object3d = obj3d;
            element.position = position;
            this.set(id,element,type);
            this.needUpdateSubsystem(type,id,element,"add");
        });
        update.forEach(element => {
            const { id,type } = element;
            this.del(id,type);
            const { obj3d,position } = this.device3d.create(element);
            if (!obj3d) return false;
            element.object3d = obj3d;
            element.position = position;
            this.set(id,element,type);
            this.needUpdateSubsystem(type,id,element,"update");
        });
        remove.forEach(element => {
            const { id,type } = element;
            this.del(id,type);
            this.needUpdateSubsystem(type,id,element,"remove");
        });
        this.updateVisibilityByCamera();
    }
    onLoadedReset() { // 初始化的数据重置
        this.addEvents();
        this.updateVisibilityByCamera();
    }
    needUpdateSubsystem(type,id,info,statusName) { // 需要更新子系统的数据
        let currentSystemName = this.core.core.currentSystemName;
        let currentSystemInfo = this.core.core.currentSystemInfo;
        if (currentSystemInfo.type && currentSystemName && currentSystemName !== "main" && type === currentSystemInfo.type && id === currentSystemInfo.id) { // 在子系统
            // 当前设备处于子场景访问中
            this.core.core.updateSubSystemInfo(info,statusName);
        }
    }
    updateVisibilityByCamera = () => { // 根据相机位置，控制显示隐藏
        let camera = this.core.camera;
        let clickEquipType = this.showObjectById.type;
        let clickEquipId = this.showObjectById.id;
        Object.entries(this.device).forEach(([index,children]) => {
            children.forEach((child,key) => {
                let sprite = child.object3d.children[1];
                let dom = child.object3d.children[0]; // css2dDom

                // 计算物体与相机的距离
                var distance = camera.position.distanceTo(sprite.position);
                sprite.visible = true; // 默认显示
                dom.visible = false; // 默认隐藏
                if (this.hideObjectIcon.includes(Number(index))) { // 该类型的需要筛选隐藏,优先级是1
                    sprite.visible = false;
                    dom.visible = false;
                    return false;
                }

                if (this.showBoardDom.length !== 0) { // 切换了传感器或者设备
                    if (this.showBoardDom.includes(Number(index))) { // 该类型的都要隐藏domBoard
                        sprite.visible = true;
                        if (distance <= this.cameraNear) { // 相机范围内的dom显示
                            dom.visible = true;
                        }
                    } else {
                        sprite.visible = false;
                        dom.visible = false;
                    }
                    return false;
                }

                if (clickEquipType && clickEquipType === Number(index) && clickEquipId === key) { // 点了设备，优先级是2'
                    if (distance > this.cameraNear) { // 被选中的物体离开相机范围
                        this.showObjectById.type = null;
                        this.showObjectById.id = null;
                    }
                    if (distance <= this.cameraNear) { // 被选中的物体进入相机范围
                        dom.visible = true;
                    }
                    return false;
                }

            });
        });
    };
    addEvents() {
        this.core.controls.addEventListener('change',this.updateVisibilityByCamera);
    }
    removeControlChange() {
        this.core.controls.removeEventListener('change',this.updateVisibilityByCamera);
    }
    spotDevice(obj) { // 拉近设备视角
        const { id,type } = obj;
        let device = this.get(id,type);
        if (device) {
            let position = device.position;
            this.tweenControls && this.tweenControls.flyToDelay({ x: position.x + 48,y: position.y + 48,z: position.z + 48 },position,1000);
            this.tweenControls.start();
            setTimeout(() => {
                this.showObjectById.type = type;
                this.showObjectById.id = id;
                this.updateVisibilityByCamera();
            },1000);
        }
    }
    switchFacility(arrays) { // 切换设备
        this.showBoardDom.length = 0;
        Object.keys(this.device).forEach(child => {
            if (arrays.includes(Number(child))) {
                this.showBoardDom.push(Number(child));
            }
        });
        this.updateVisibilityByCamera();
    }
    setTypeVisibleEx(arrays) { // 筛选
        this.hideObjectIcon.length = 0;
        Object.keys(this.device).forEach(child => {
            if (!arrays.includes(Number(child))) {
                this.hideObjectIcon.push(Number(child));
            }
        });
        this.updateVisibilityByCamera();
    }
    disposeEquip() { // 销毁设备
        this.removeControlChange();
        // this.device3d.disposeEquip();
        let keys = Object.entries(this.device);

        [...keys].forEach(([key,value]) => {
            let values = this.device[key];
            values.forEach(child => {
                MemoryManager.dispose(child.object3d);
            });
        }
        );
        this.device = {};
        console.log(this.device3d);
    }
    disposeDom() {
        this.removeControlChange();
        this.device3d.removeDom();
    }
}
