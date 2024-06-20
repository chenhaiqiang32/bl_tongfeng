import * as THREE from "three";
import { createSprite } from "./utils";
import MemoryManager from "../../../lib/memoryManager";
import { PersonCard } from "./utils";
import { createCSS2DObject,createDom } from "../../../lib/CSSObject";

const spriteScale = new THREE.Vector3(0.028,0.028,0.028);

// const SpriteMap = {
//     externalPerson: createSprite("/person/externalPerson.png",spriteScale),
//     insidePerson: createSprite("/person/insidePerson.png",spriteScale),
//     laborPerson: createSprite("/person/laborPerson.png",spriteScale),
// };
export class Device3D {
    constructor(device) {

        this.device = device;
        this.core = device.core;

        this.singleGroup = new THREE.Group();
        this.singleGroup.name = "singleGroup";
        this.pointerArr = [];

    }

    add(item) {
        if (item.sceneType === Orientation.SCENE_TYPE.INDOOR) {

            const buildingId = item.originId.slice(0,-3);

            if (!obj[buildingId]) obj[buildingId] = {};

            if (!obj[buildingId][item.originId]) obj[buildingId][item.originId] = new THREE.Group();

            obj[buildingId][item.originId].add(item.object3d);

        } else {

            obj.add(item.object3d);

        }
    }

    /**
     * 根据人员数据创建 3D 对象，包含精灵图，人物背景
     * @param {T2} data
     */
    create(data) {
        const object = new THREE.Object3D();
        object.name = data.id;
        // const sprit = SpriteMap[data.typeName].clone();
        // sprit.name = data.id;
        // object.add(sprit);
        const nameDom = createDom({ innerText: data.name,id: `person-sprite-${data.typeName}` });
        const container = createDom({ id: "person-sprite-container",children: [nameDom] },"click",() => {
        });
        const css2d = createCSS2DObject(container);
        object.add(css2d);

        if (data.id === this.orientation.followId) {

            object.position.copy(this.orientation.followModule.from);
            this.orientation.followModule.to.copy(data.position);

        } else {

            object.position.copy(data.position);

        }

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
        label.setInnerText(item.name);
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
