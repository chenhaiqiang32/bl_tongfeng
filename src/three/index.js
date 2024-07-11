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

const timeUpdate = Symbol("timeUpdate");

export class Core3D extends CoreExtensions {
    constructor(domElement) {
        super(domElement);

        /**@type {Subsystem} currentSystem */
        this.currentSystem = null;

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
            this.currentSystem.onEnter();
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
        this.partFanSubsystem = new PartFanSubsystem(this);
        this.changeSystem("main");
        this.onRenderQueue.set(timeUpdate,scope => updateTime(scope.delta));
    }

    /**
     * @description 各个系统模块切换
     * @param {string} systemType 系统标识符
     */
    async changeSystem(systemType) {
        /**@type {Subsystem} 目标系统 */
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
            if (targetSystem === currentSystem) return;

            // 当前系统执行离开事件。
            currentSystem.onLeave();
        }

        // 切换渲染的场景
        this.changeScene(targetSystem.scene);

        // 更改当前系统为目标系统
        this.currentSystem = targetSystem;

        // 当前系统执行进入事件，返回Promise。
        await targetSystem.onEnter();

        // openMessage(this);

        // 在模型加载完成。将格式化后的场景数据传输到前端。
        onLoaded(getData(this));
    }

    changeScene(scene) {
        this.scene = scene;
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

    /**
 * @typedef {Object} User
 * @property {string} name - 用户的姓名
 * @property {number} age - 用户的年龄
 * @property {string} [email] - 用户的电子邮件地址（可选）
 */

    /**
     * 处理用户列表的函数
     * @param {User[]} userList - 用户对象数组，每个对象包含姓名、年龄和可选的电子邮件
     */
    processUserList(userList) {
        userList.forEach(user => {
            console.log(`Processing user ${user.name}`);
            // 其他处理逻辑...
        });
    }
}
