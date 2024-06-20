import * as THREE from "three";
import { Observer } from "./Observer";
import { GbkOBJLoader } from "../../../lib/GbkOBJLoader";
import { openWebsocket } from "../../../message/websocket_bei";

class OrientationObserver extends Observer {
    constructor() {
        super();

        /**@type {Map<string,THREE.CatmullRomCurve3>} 巷道定位线数据集合 */
        this.tunnelMap = new Map();

        this.preloadTunnel();
    }

    /**
     * 接收数据的初始化操作
     * @param {DataType[]} data
     * @param {boolean} reset
     * @param {"Person"|"Car"} type
     */
    initData(data, reset, type) {
        /**
         process
         */
        this.notifyObserver();
    }

    /**预加载巷道线信息*/
    preloadTunnel() {
        new GbkOBJLoader().load("./models/orientation/dingwei.obj", obj => {
            if (Array.isArray(obj)) {
                obj.forEach(line => {
                    const vertices = line.vertices;
                    const curve = new THREE.CatmullRomCurve3(vertices, false, "catmullrom", 0);
                    this.tunnelMap.set(line.name, curve);
                    // this.testLine(curve, new THREE.Color(1, 1, 1));
                });
            }
            //开启websocket 连接
            openWebsocket(this.core);
        });
    }
}

export const orientationObserver = new OrientationObserver();
