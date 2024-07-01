import * as THREE from "three";
import MemoryManager from "../../../lib/memoryManager";
import { PersonCard } from "./utils";
import { createCSS2DObject,createCSS3DObject,createCSS3DSprite,createDom } from "../../../lib/CSSObject";

export class Device3D {
    constructor(device) {
        this.scene = device.scene;
        this.device = device;
        this.underGround = device.underGround;

        this.singleGroup = new THREE.Group();
        this.singleGroup.name = "singleGroup";
        this.pointerArr = [];
        this.scene.add(this.singleGroup);

    }

    // add(item) {
    //     if (item.sceneType === Orientation.SCENE_TYPE.INDOOR) {

    //         const buildingId = item.originId.slice(0,-3);

    //         if (!obj[buildingId]) obj[buildingId] = {};

    //         if (!obj[buildingId][item.originId]) obj[buildingId][item.originId] = new THREE.Group();

    //         obj[buildingId][item.originId].add(item.object3d);

    //     } else {

    //         obj.add(item.object3d);

    //     }
    // }

    /**
     * 设备属性
     * @param {deviceEdit} data
     */
    create(data) {
        const { id,type,tunnelId,distance } = data;
        const object = new THREE.Object3D();
        object.name = id;
        let currentPosition = this.underGround.getPosition(tunnelId,distance);
        if (!currentPosition) {
            console.log("巷道id" + id + "不存在");
            return false;
        }
        let container = this.device.deviceCode[type].dom;
        if (!container) {
            console.log("巷道id" + id + "dom不存在");
            return false;
        }

        let div = container.cloneNode(true);

        const css2d = createCSS3DSprite(div);
        css2d.scale.set(0.08,0.08,0.08);
        let toPosition = currentPosition.clone();
        toPosition.y = toPosition.y + 20;
        css2d.position.copy(toPosition);
        object.add(css2d);



        // 创建直线的材质
        const lineMaterial = new THREE.LineDashedMaterial(
            {
                color: 0xfffffff,
                linewidth: 1,
                scale: 1,
                dashSize: 3,
                gapSize: 12,
            }
        );

        // 创建直线的几何体，这里使用BufferGeometry
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            currentPosition,
            toPosition
        ]);

        // 创建直线对象
        const line = new THREE.Line(lineGeometry,lineMaterial);

        // 将直线添加到场景中
        this.singleGroup.add(line);



        const geometry = new THREE.BoxGeometry(1,1,1);
        const material = new THREE.MeshBasicMaterial({ color: 0xfffffff });
        const cube = new THREE.Mesh(geometry,material);
        cube.position.copy(currentPosition);
        this.singleGroup.add(cube);


        this.singleGroup.add(object);
        console.log(this.scene,'8888');
        return object;
    }

    /**
     * @param {T2} data
     */
    delete(data) {

        MemoryManager.dispose(data.object3d,true);

    }

    /**
     * @param {T2} data
     */
    updateData(data) {

        if (this.orientation.followId !== data.id) return data.object3d.position.copy(data.position);

        if (data.object3d.position.equals(data.position)) return;

        this.orientation.followModule.createPath(data);

    }

    setPointerArr() { // 变小手的数组
        this.singleGroup && this.singleGroup.children.forEach(child => {
            this.pointerArr.push(child);
        });
        if (this.core.sceneType === 1) { // 室外
            this.core.ground.pointerArr.forEach(child => {
                this.pointerArr.push(child);
            });
        }
    }

    setAllPersonVisible(value) {
        this.singleGroup.traverse(child => {
            child.visible = value;
        });

    }

    dispose = () => { // 销毁dom
        this.singleGroup.children.forEach(child => {
            child.removeFromParent();
            child.traverse(childT => {
                if (childT.element && childT.element.parentNode) {
                    childT.element.parentNode.removeChild(childT.element);
                }
            });
        });

    };

    /** 搜索人员 */
    openDialog(id) {
        const item = this.orientation.get(id);
        const label = new PersonCard(item);
        label.name = "board" + item.id;
        label.typeName = "boardTitle";
        // label.setInnerText(item.name);
        label.visible = true;
        item.object3d.add(label);
    }

    closeDialog() {
        const label = new PersonCard();
        label.removeFromParent();
        label.visible = false;
        if (this.orientation.followModule.singleBuildingLabel) {
            MemoryManager.dispose(this.orientation.followModule.singleBuildingLabel);
        }
    }

}
