import { Device3D } from "./device3d";
import * as THREE from "three";

export class DeviceManger {
    static DeviceType = {
        co2: 101, // 二氧化碳
        dust: 102, // 粉尘
        o2: 103, // 氧气
        temperature: 104, // 温度
        humidity: 105, // 湿度
        pressure: 106, // 差压
        speedSensor: 107, // 风速传感器
        ultrasonic: 108, // 超声波风速仪
        bidirectional: 109, // 双向风速传感器
        co: 110, // 一氧化碳
        ch4: 111, // 甲烷
        mainFan: 201, // 主扇
        localFan: 202, // 局扇
        airDoor: 203, // 风门
        airWindow: 204, // 风窗
        airStation: 205, // 测风站
        baseStation: 206, // 基站
        video: 207 // 视频
    };
    constructor(core) {
        this.scene = core.scene;
        this.underGround = core;
        this.deviceCode = {
            [DeviceManger.DeviceType.co2]: {
                name: "二氧化碳"
            },
            [DeviceManger.DeviceType.dust]: {
                name: "粉尘"
            },
            [DeviceManger.DeviceType.o2]: {
                name: "氧气"
            },
            [DeviceManger.DeviceType.temperature]: {
                name: "温度"
            },
            [DeviceManger.DeviceType.humidity]: {
                name: "湿度"
            },
            [DeviceManger.DeviceType.pressure]: {
                name: "差压"
            },
            [DeviceManger.DeviceType.speedSensor]: {
                name: "风速传感器"
            },
            [DeviceManger.DeviceType.ultrasonic]: {
                name: "超声波风速仪"
            },
            [DeviceManger.DeviceType.bidirectional]: {
                name: "双向风速传感器"
            },
            [DeviceManger.DeviceType.co]: {
                name: "一氧化碳"
            },
            [DeviceManger.DeviceType.ch4]: {
                name: "甲烷"
            },
            [DeviceManger.DeviceType.mainFan]: {
                name: "主扇",
                dom: document.getElementById("deviceFan"),
                changeDom: {
                    name: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomName'),
                    status: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomStatus'),
                    volume: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomVolume'),
                    pressure: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomPressure')
                },
            },
            [DeviceManger.DeviceType.localFan]: {
                name: "局扇",
                dom: document.getElementById("deviceFan"),
                changeDom: {
                    name: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomName'),
                    status: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomStatus'),
                    volume: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomVolume'),
                    pressure: document.getElementById("deviceFan").getElementsByClassName('IdentifyDomPressure')
                }
            },
            [DeviceManger.DeviceType.airDoor]: {
                name: "风门",
                dom: document.getElementById("deviceWindWindow"),
                changeDom: [ // dom中修改的字段
                    {},
                    {},
                    {},
                ]
            },
            [DeviceManger.DeviceType.airWindow]: {
                name: "风窗",
                dom: document.getElementById("deviceWindWindow")
            },
            [DeviceManger.DeviceType.airStation]: {
                name: "测风站",
                dom: document.getElementById("deviceWindStation")
            },
            [DeviceManger.DeviceType.baseStation]: {
                name: "基站",
            },
            [DeviceManger.DeviceType.video]: {
                name: "视频",
            }
        };
        this.sensorsCategory = { // 传感器的分类
            0: [101,102,103,104,105,106],
            1: ["tunnel"],
            2: [107,108,109],
            3: [110],
            4: [111]
        };
        this.device = new Map(); // 按照设备id存储的数据
        this.deviceTypeData = {}; // 按照 类别存储的设备数据
        this.device3d = new Device3D(this);
    }
    set(id,value) {
        this.device.set(id,value);
    }

    /**是否存在id数据 */
    has(id) {
        return this.device.has(id);
    }

    /** 获取id数据 */
    get(id) {
        return this.device.get(id);
    }

    /**删除id数据 */
    del(id) {
        this.device.delete(id);
    }
    /**
     * 处理deviceManage的函数
     * @param {deviceManage} ars - deviceManage对象，包含add、update、remove三个数组
    */
    deviceManger(ars) {
        const { add,update,remove } = ars;
        add.forEach(element => {
            const { id } = element;
            element.object3d = this.device3d.create(element);
            this.set(id,element);
        });
        update.forEach(element => {
            const { id,type } = element;
            this.set(id,element);
        });
        remove.forEach(element => {
            const { id,type } = element;
            this.del(id);
        });
    }

}
