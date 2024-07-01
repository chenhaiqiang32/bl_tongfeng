import { element } from "three/examples/jsm/nodes/shadernode/ShaderNode";
import { Device3D } from "./device3d";
import * as THREE from "three";

export class DeviceManger {
    constructor(core) {
        this.scene = core.scene;
        this.deviceCode = {
            101: {
                name: "二氧化碳"
            },
            102: {
                name: "粉尘"
            },
            103: {
                name: "氧气"
            },
            104: {
                name: "温度"
            },
            105: {
                name: "湿度"
            },
            106: {
                name: "差压"
            },
            107: {
                name: "风速传感器"
            },
            108: {
                name: "超声波风速仪"
            },
            109: {
                name: "双向风速传感器"
            },
            110: {
                name: "一氧化碳"
            },
            111: {
                name: "甲烷"
            },
            201: {
                name: "主扇"
            },
            202: {
                name: "局扇"
            },
            203: {
                name: "风门"
            },
            204: {
                name: "风窗"
            },
            205: {
                name: "测风站"
            },
            206: {
                name: "基站"
            },
            207: {
                name: "视频"
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
            const { id,type } = element;
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
