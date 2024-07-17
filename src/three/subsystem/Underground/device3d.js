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
        const { id,type,tunnelId,distance,deviceInfo } = data;
        const object = new THREE.Object3D();
        object.name = id;
        let currentPosition = this.underGround.getPosition(tunnelId,distance);
        if (!currentPosition) {
            console.log("巷道id" + id + "不存在");
            return false;
        }

        // css2dDom
        let container = this.device.deviceCode[type].dom();
        let domObj = this.device.deviceCode[type].domToValue;
        let domObjParts = this.device.deviceCode[type].domToValueParts;
        let domEvent = this.device.deviceCode[type].domEvent;
        let statusShow = this.device.deviceCode[type].statusValue;
        let toSystem = this.device.deviceCode[type].systemName;
        if (!container) {
            console.log("巷道id" + id + "dom不存在");
            return false;
        }

        for (let key in deviceInfo) {
            let value = deviceInfo[key];
            if (domObj[key]) { // 修改常规css3d展示dom数据
                let changeDom = container.getElementsByClassName(domObj[key])[0];
                changeDom.innerText = value; // dom元素赋值
                if (key === "status") { // 修改dom颜色
                    changeDom.innerText = statusShow[value + ""]; // dom元素赋值
                    value ? changeDom.classList.add("green") : changeDom.classList.add("red");
                }
            }
            if (key === "parts") { // 修改部件css3d展示dom数据
                value.forEach((child,index) => {
                    let currentDom = domObjParts[index];
                    for (let i in child) {
                        let val = child[i];
                        if (currentDom[i]) { // 存在要修改的dom
                            let changeDom = container.getElementsByClassName(currentDom[i])[0];
                            changeDom.innerText = val; // dom元素赋值
                            if (i === "status") { // 修改dom颜色
                                changeDom.innerText = val ? "开" : "关";
                                val ? changeDom.classList.add("green") : changeDom.classList.add("grey");
                            }
                        }
                    }
                });
            }
        }
        if (domEvent) {
            if (domEvent["定位"]) { // 定位
                let eventDom = container.getElementsByClassName(domEvent["定位"])[0];
                eventDom.addEventListener('click',() => {
                    // 这里写点击事件发生时想要执行的代码
                    alert(423423);
                });

            }
            if (domEvent["管控"]) { // 切换场景
                let eventDom = container.getElementsByClassName(domEvent["管控"])[0];
                eventDom.addEventListener('click',() => {
                    // 这里写点击事件发生时想要执行的代码
                    this.device.core.core.changeSystem(toSystem);
                });

            }
        }
        const css2d = createCSS2DObject(container);
        css2d.scale.set(0.001,0.001,0.001);
        css2d.center = new THREE.Vector2(0.5,1);
        let toPosition = currentPosition.clone();
        toPosition.y = toPosition.y + 20;
        let startPosition = currentPosition.clone();
        startPosition.y = startPosition.y + 5.6;
        css2d.position.copy(toPosition);
        css2d.visible = false;
        object.add(css2d);


        // sprite
        let spriteImg = `./icons/${type}_${deviceInfo.status ? 'onLine' : 'outLine'}.png`;
        const map = new THREE.TextureLoader().load(spriteImg);
        const material = new THREE.SpriteMaterial({ map: map,color: 0xffffff,depthTest: false,sizeAttenuation: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.04,0.04,0.04);
        sprite.center = new THREE.Vector2(0.5,0);
        sprite.renderOrder = 0;
        sprite.position.copy(startPosition);
        object.add(sprite);
        this.singleGroup.add(object);
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
