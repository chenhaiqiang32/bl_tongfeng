import { Device3D } from "./device3d";

export class DeviceManger {
    constructor(core) {
        this.core = core;
        this.scene = core.scene;
        this.underGround = core;
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
                dom: null
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
        return this.device[type].get(id);
    }

    /**删除id数据 */
    del(id,type) {
        this.device[type].delete(id);
    }
    /**
     * 处理deviceManage的函数
     * @param {deviceManage} ars - deviceManage对象，包含add、update、remove三个数组
    */
    deviceManger(ars) {
        const { add,update,remove } = ars;
        add.forEach(element => {
            const { id,type } = element;
            element.object3d = this.device3d.create(element);
            this.set(id,element,type);
        });
        update.forEach(element => {
            const { id,type } = element;
            this.set(id,element,type);
        });
        remove.forEach(element => {
            const { id,type } = element;
            this.del(id,type);
        });
    }
    setTypeVisibleEx(arrays) { // 筛选
        const filter = (child,visible) => {
            this.device[child].forEach((value,key) => {
                value.object3d.children[0].visible = visible;
            });
        };
        let showObject = [];
        let hideObject = [];
        Object.keys(this.device).forEach(child => {
            if (arrays.includes(Number(child))) {
                showObject.push(child);
            } else {
                hideObject.push(child);
            }
        });
        showObject.forEach(child => {
            filter(child,true);
        });
        hideObject.forEach(child => {
            filter(child,false);
        });
    }

}
