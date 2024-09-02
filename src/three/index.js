import { CoreExtensions } from "./core/CoreExtensions";
import {
    Subsystem,
    UnderGround,
} from "./subsystem";

import { updateStyle,updateTime } from "../shader/constant";
import { openMessage } from "../message/onMessage";
import { onLoaded } from "../message/postMessage";
import { getData } from "./data/format";
import { BoringMachineSubsystem } from "./subsystem/BoringMachine";
import { FanSubsystem } from "./subsystem/Fan";
import { AirDoor } from "./subsystem/airDoor";
import { AirWindow } from "./subsystem/AirWindow";
import { PartFanSubsystem } from "./subsystem/partFan";
import { AirStation } from "./subsystem/AirStation";
import * as THREE from "three";
import { AirWindowSingle } from "./subsystem/AirWindowSingle";

const timeUpdate = Symbol("timeUpdate");

export class Core3D extends CoreExtensions {
    constructor(domElement) {
        super(domElement);

        /**@type {Subsystem} currentSystem */
        this.currentSystem = null;
        this.currentSystemName = "";
        this.currentSystemInfo = {
            type: null,
            id: null,
            deviceInfo: null
        };
        this.firstLoad = true;
    }

    init() {
        // 添加CSS2DRenderer
        this.initCSS2DRenderer();
        this.initCSS3DRenderer();

        // 添加后处理
        this.initComposer();

        openMessage(this);
        this.beginRender();
    }

    beginRender() {
        if (this.renderEnabled) return;
        if (this.firstLoad) {
            this.setClass();
            this.firstLoad = false;
        } else {
            // this.currentSystem.onEnter();
        }
        this.setRenderState(true);
    }

    setClass() {
        this.main = new UnderGround(this);
        this.boringMachineSubsystem = new BoringMachineSubsystem(this);
        this.fanSubsystem = new FanSubsystem(this);
        this.airDoor = new AirDoor(this);
        this.airWindow = new AirWindow(this);
        this.airStation = new AirStation(this);
        this.airWindowSingle = new AirWindowSingle(this);
        this.partFanSubsystem = new PartFanSubsystem(this);
        this.onRenderQueue.set(timeUpdate,scope => updateTime(scope.delta));
    }

    /**
     * @description 各个系统模块切换
     * @param {string} systemType 系统标识符
     */
    async changeSystem(systemType,info) {
        /**@type {Subsystem} 目标系统 */
        this.currentSystemInfo = {
            type: null,
            id: null,
            deviceInfo: null
        };
        const targetSystem = this[systemType];

        /**@type {Subsystem} 当前系统 */
        const currentSystem = this.currentSystem;

        // 如果目标系统不存在,直接返回,判定目标系统加载完成。
        if (!targetSystem) {
            console.warn(`${systemType}子系统未初始化`);
            return;
        }

        if (currentSystem) {
            // 如果目标系统和当前系统相同，直接返回。
            // if (targetSystem === currentSystem) return; // 会有同场景数据变化情况

            // 当前系统执行离开事件。
            currentSystem.onLeave();
        }

        // 切换渲染的场景
        this.changeScene(targetSystem.scene);

        // 更改当前系统为目标系统
        this.currentSystem = targetSystem;
        this.currentSystemName = systemType;

        // 当前系统执行进入事件，返回Promise。
        await targetSystem.onEnter();
        if (!info.deviceInfo || info.type === 204) { // 容错再次获取一边 风窗可能会从单风窗变成多风窗再取一次
            info.deviceInfo = this.main.equipMentSystem.get(info.id,info.type) && this.main.equipMentSystem.get(info.id,info.type).infos.deviceInfo;
        }
        if (info && info.id !== null) {
            this.currentSystemInfo = {
                type: info.type,
                id: info.id,
                deviceInfo: info.deviceInfo
            };
            if (info.deviceInfo) {
                targetSystem.updateDataInfo(info.deviceInfo,"add");
            }

        }

        // openMessage(this);

        // 在模型加载完成。将格式化后的场景数据传输到前端。
        onLoaded(getData(this));
    }

    changeScene(scene) {
        this.scene = scene;
    }

    onMessageChange(info) {
        const { id,type,system,isSingleWindow } = info;
        let typeToName = { 201: "fanSubsystem",202: "partFanSubsystem",203: "airDoor",204: "airWindow",205: "airStation" };
        let toSystem = "main";
        let deviceInfo = null;
        if (system === "main") {
            toSystem = "main";
        } else {
            toSystem = typeToName[type];
            deviceInfo = this.main.equipMentSystem.get(id,type) && this.main.equipMentSystem.get(id,type).infos.deviceInfo;
            if (type === 204 && isSingleWindow) { // 单风窗的场景
                toSystem = "airWindowSingle";
            }
        }
        this.changeSystem(toSystem,{ type,id,deviceInfo });
    }
    /**
     * 处理用户数组的函数
     * @param {initialized[]} ars - 初始化巷道/更新巷道
    */
    initialized(ars) {
        this.main.initialized(ars);
    }

    /**
     * 处理用户数组的函数
     * @param {deviceManage[]} ars - 设备管理
    */
    deviceManage(ars) {
        this.main.deviceManage(ars);
    }

    spotDevice(obj) {
        this.main.spotDevice(obj);
    }
    spotTunnel(id) { // 拉近巷道距离
        this.main.spotTunnel(id);
    }

    /**
     *
     * @param {string} config -
     * 巷道风格
     * default:默认
     * direction：风向
     * volume：风量
     * speed：风速
     * resistance：阻力
    */
    switchTunnelStyle(config) {
        this.main.switchTunnelStyle(config);
    }

    switchTunnelResistance(config) {
        this.main.switchTunnelResistance(config);
    }
    /**
     *
     * @param {string} config
     * 更新巷道
     * updateWindSpeed:更新巷道风速
     * updateResistance：更新巷道阻力
     * updateVolume：更新巷道风量
    */
    updateTunnelConfig(data,config) {
        this.main.updateTunnelConfig(data,config);
    }

    switchFacility(config) {
        this.main.switchFacility(config);
    }

    updateSubSystemInfo(info,status) { // 当前子系统的展示 主扇/局扇/风门/风窗/测风
        if (status === "remove") {
            this.currentSystem.updateDataInfo(info,status); // 更新当前子系统的数据
        } else {
            this.currentSystem.updateDataInfo(info.deviceInfo,status); // 更新当前子系统的数据
        }
    }

    resetCamera() {
        this.currentSystem.resetCamera();
    }

    setTypeVisibleEx(config) {
        this.main.setTypeVisibleEx(config);
    }

    stopRender() {
        this.setRenderState(false);
        this.currentSystem.onLeave();
    }
}
