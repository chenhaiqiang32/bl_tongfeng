import MemoryManager from "../../../lib/memoryManager";
import * as THREE from "three";

export class TunnelPicture {
    constructor() {
        this.k = 0.001; // 速度控制因子，可以根据需要调整
        this.picture = {}; // 巷道动图
    }
    init(vertices,id,direction,speed) {
        let tunnelVertices = vertices;
        if (direction === 2) { // 巷道没风
            return false;
        }
        if (direction === 1) { // 逆风
            tunnelVertices = vertices.reverse();
        }
        let directions = {};
        vertices.forEach((child,index) => {
            if (index < vertices.length - 1) {
                let cLineLength = Math.floor(child.distanceTo(vertices[index + 1])); // 当前线段长度
                if (index === 0) {
                    directions[cLineLength] = { total: [child,vertices[index + 1]],current: cLineLength };
                } else {
                    let oldLength = 0;
                    Object.values(directions).forEach(child => {
                        oldLength = oldLength + Number(child.current);
                    });
                    directions[cLineLength + oldLength] = { total: [child,vertices[index + 1]],current: cLineLength };
                }
            }
        });
        const curve = new THREE.CatmullRomCurve3(tunnelVertices);
        curve.curveType = "catmullrom";
        curve.tension = 0;


        if (!this.picture[id]) {
            this.picture[id] = {
                t: 0,
                speed,
                object3d: this.setObject3d(curve),
                curve,
                directions
            };
        }
        return this.picture[id].object3d;
    }
    getToWord(pointX,pointY) {
        // 获取朝向
        var orientation = new THREE.Matrix4();
        var up = new THREE.Vector3(0,0,1);
        orientation.lookAt(pointX,pointY,up);
        orientation.multiply(
            new THREE.Matrix4().set(1,0,0,0,0,0,1,0,0,-1,0,0,0,0,0,1)
        );
        return orientation;
    }
    setObject3d(curve) {
        const geometry = new THREE.BoxGeometry(3,3,3);
        const materialLeftRight = new THREE.MeshBasicMaterial({
            map: new THREE.TextureLoader().load("/shadowTop.png"),
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide,
            depthTest: false
        });
        const materialOther = new THREE.MeshBasicMaterial({ transparent: true,opacity: 0.0,depthTest: false });
        let Object3D = new THREE.Mesh(geometry,[
            materialOther,
            materialOther,
            materialOther,
            materialOther,
            materialLeftRight,
            materialOther,
        ]); // 假设左右面是贴图，其他面透明
        Object3D.position.copy(curve.getPointAt(0));
        return Object3D;
    }
    dispose() {
        Object.values(this.picture).forEach(child => {
            MemoryManager.dispose(child.object3d);
            MemoryManager.dispose(child.curve);
            delete child.t;
            delete child.speed;
            delete child.object3d;
            delete child.curve;
            delete child.directions;
            child = {};
        });
        this.picture = {};
    };
    update() {
        Object.entries(this.picture).forEach(([index,child]) => {
            // 更新t值以沿着曲线移动
            child.t += this.k * child.speed;
            if (child.t > 1) {
                child.t = 0; // 当到达终点时重置t到起点
            }
            let allLength = child.curve.getLength();
            let currentLength = allLength * child.t; // 当前点位距离
            let getArray = Object.keys(child.directions).filter(res => {
                if (currentLength <= Number(res)) {
                    return res;
                }
            })[0];
            if (!getArray) {
                getArray = Object.keys(child.directions)[Object.keys(child.directions).length - 1];
            }
            let currentDirection = child.directions[getArray];

            // 计算方向向量
            var direction = new THREE.Vector3().subVectors(currentDirection.total[1],currentDirection.total[0]).normalize();
            // 计算旋转
            var quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction); // 假设物体C的初始朝向是Z轴正方向
            quaternion.y = 0;
            child.object3d.quaternion.copy(quaternion);
            // 根据t值获取曲线上的点
            const point = child.curve.getPointAt(child.t);
            child.object3d.position.copy(point);
        });
    }

}
