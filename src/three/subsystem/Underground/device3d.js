import * as THREE from "three";
import MemoryManager from "../../../lib/memoryManager";
import { PersonCard } from "./utils";
import { createCSS2DObject,createCSS3DObject,createCSS3DSprite,createDom } from "../../../lib/CSSObject";
import { onClickCallBack,postChangeScene } from "../../../message/postMessage";

export class Device3D {
    constructor(device) {
        this.scene = device.scene;
        this.device = device;
        this.underGround = device.underGround;

        this.singleGroup = new THREE.Group();
        this.singleGroup.name = "singleGroup";
        this.removes = [];
        this.scene._add(this.singleGroup);
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
        let hasTunnel = true; // 是否绑定巷道
        let currentPosition = this.underGround.getPosition(tunnelId,distance);
        if (!currentPosition) {
            currentPosition = new THREE.Vector3(0,0,0);
            console.log("巷道id" + id + "不存在");
            // return false;
            hasTunnel = false;
        }
        let startPosition = currentPosition.clone();
        // css2dDom
        let container = this.device.deviceCode[type].dom();
        let domObj = this.device.deviceCode[type].domToValue;
        let domObjParts = this.device.deviceCode[type].domToValueParts;
        let domEvent = this.device.deviceCode[type].domEvent;
        let statusShow = this.device.deviceCode[type].statusValue;
        let domValue = {
            domObjContent: { // 主体部分dom
            },
            domDeviceImg: null, // 图片dom,
            domParts: { // 底部 parts部分dom
                0: {},
                1: {}
            },
            domIcon: null, // 设备图标dom
            windowDomSecond: null // 风窗第二个部分dom
        };
        let toSystem = this.device.deviceCode[type].systemName;
        if (container) {
            for (let key in deviceInfo) {
                let value = deviceInfo[key];
                if (domObj[key]) { // 修改常规css3d展示dom数据
                    let changeDom = container.getElementsByClassName(domObj[key])[0];
                    this.changeDomObj(changeDom,value,type,key); //
                    domValue.domObjContent[key] = changeDom; // 存储dom
                }
                if (key === "parts") { // 修改部件css3d展示dom数据
                    let domBgImg = container.getElementsByClassName("deviceImgDom");
                    let windowDomSecond = container.getElementsByClassName("secondWindowHas")[0]; // 单风窗只显示一个
                    if (domBgImg && domBgImg.length > 0) { // 图片dom
                        this.changeDomDeviceImg(domBgImg[0],type,value,windowDomSecond);
                        domValue.domDeviceImg = domBgImg[0];
                        domValue.windowDomSecond = windowDomSecond;
                    }
                    value.forEach((child,index) => {
                        let currentDom = domObjParts[index];
                        for (let i in child) {
                            let val = child[i];
                            if (currentDom[i]) { // 存在要修改的dom
                                let changeDom = container.getElementsByClassName(currentDom[i])[0];
                                this.changeDomParts(changeDom,val,type,i);
                                domValue.domParts[index][i] = changeDom;
                            }
                        }
                    });
                }
            }
            let closeDom = container.getElementsByClassName("closeDialog")[0]; // 关闭dom
            if (closeDom) {
                closeDom.addEventListener('click',() => {
                    // 这里写点击事件发生时想要执行的代码
                    this.device.closeDialog({ id,type });
                });
            }
        }
        if (domEvent) {
            if (domEvent["定位"]) { // 定位
                let eventDom = container.getElementsByClassName(domEvent["定位"])[0];
                eventDom.addEventListener('click',() => {
                    // 这里写点击事件发生时想要执行的代码
                    this.device.spotDevice({ id,type });
                });

            }
            if (domEvent["管控"]) { // 切换场景
                let eventDom = container.getElementsByClassName(domEvent["管控"])[0];
                eventDom.addEventListener('click',() => {
                    // 这里写点击事件发生时想要执行的代码
                    postChangeScene(id,type);
                    // this.device.core.core.changeSystem(toSystem,{ type,id,deviceInfo });
                });

            }
        }
        if (container) {
            const css2d = createCSS2DObject(container);
            css2d.center = new THREE.Vector2(-0.28,1.2);
            startPosition.y = startPosition.y + 5.6;
            css2d.position.copy(startPosition);
            css2d.visible = false;
            css2d.category = "iconTitle";
            css2d.renderOrder = 12;
            object.add(css2d);
        }

        if (!container) {
            let div = document.createElement("div");
            div.style.display = "none";
            const css2d = createCSS2DObject(div);
            css2d.center = new THREE.Vector2(-0.28,1.2);
            let startPosition = currentPosition.clone();
            startPosition.y = startPosition.y + 5.6;
            css2d.position.copy(startPosition);
            css2d.visible = false;
            css2d.category = "iconTitle";
            object.add(css2d);
        }


        // iconDom
        let dom = document.getElementById("serviceImg").cloneNode(true);
        let domSrc = dom.getElementsByClassName("serviceImgUrl")[0];
        this.changeDomIcon(domSrc,type,deviceInfo.status);
        domValue.domIcon = domSrc;
        let iconCss2d = createCSS2DObject(dom);
        iconCss2d.scale.set(0.012,0.012,0.012);
        iconCss2d.center = new THREE.Vector2(0.5,1);
        iconCss2d.renderOrder = -1;
        iconCss2d.position.copy(startPosition);
        iconCss2d.category = "iconImg";
        iconCss2d.typeName = type;
        iconCss2d.typeId = id;
        dom.onclick = () => {
            if (type === 207) {
                onClickCallBack(1,{ id,type }); // 点击到了相机
            }
            this.device.spotDevice({ id,type });
        };
        object.add(iconCss2d);
        this.singleGroup.add(object);
        return { obj3d: object,position: startPosition,doms: domValue,hasTunnel };
    }
    changeDomObj(changeDom,value,type,key) { // 修改dom数组，并且根据状态更改颜色
        // changeDom 当前要修改的dom元素
        // value 要修改成的结果
        // type 设备编码
        // key 数据deviceInfo的所有字段
        let statusShow = this.device.deviceCode[type].statusValue; // 当前设备状态数组
        changeDom.title = value;
        changeDom.innerText = value; // dom元素赋值
        if (key === "status") { // 修改dom颜色
            changeDom.innerText = statusShow[value + ""]; // 状态字段下显示的文字
            value ? this.changeColor('red','green',changeDom) : this.changeColor('green','red',changeDom); // 状态字段下，true显示绿色，false显示红色
        }
    }
    changeColor(fromColor,toColor,changeDom) {
        if (!changeDom.classList.contains(toColor)) {
            changeDom.classList.add(toColor);
        }
        if (changeDom.classList.contains(fromColor)) {
            // 如果有，就移除'red'类
            changeDom.classList.remove(fromColor);
        }
    }
    getImgUrl(type,value) {  // 获取图片地址
        const partsChangeBg = [201,202,203,204];
        const partsChangeObj = {
            201: {
                "00": "./bgDom/fan_first0_second0.png",
                "11": "./bgDom/fan_first1_second1.png",
                "01": "./bgDom/fan_first0_second1.png",
                "10": "./bgDom/fan_first1_second0.png"
            },
            202: {
                "00": "./bgDom/parfan_first0_second0.png",
                "11": "./bgDom/parfan_first1_second1.png",
                "01": "./bgDom/parfan_first0_second1.png",
                "10": "./bgDom/parfan_first1_second0.png",
            },
            203: {
                "00": "./bgDom/door_first0_second0.png",
                "11": "./bgDom/door_first1_second1.png",
                "01": "./bgDom/door_first0_second1.png",
                "10": "./bgDom/door_first1_second0.png"
            },
            204: {
                "00": "./bgDom/window_first0_second0.png",
                "11": "./bgDom/window_first1_second1.png",
                "01": "./bgDom/window_first0_second1.png",
                "10": "./bgDom/window_first1_second0.png",
                "1": "./bgDom/window_1.png",
                "0": "./bgDom/window_0.png"
            }
        };

        if (partsChangeBg.includes(type)) {
            let key = "";
            if (type === 201 || type === 202) { // 主风机局部风机
                if (!value[0].status && !value[1].status) {
                    key = "00";
                }
                if (value[0].status && value[1].status) {
                    key = "11";
                }
                if (!value[0].status && value[1].status) {
                    key = "01";
                }
                if (value[0].status && !value[1].status) {
                    key = "10";
                }
            }
            if (type === 203) { // 风门
                if (value[0].status === 2 && value[1].status === 2) {
                    key = "00";
                }
                if (value[0].status !== 2 && value[1].status !== 2) {
                    key = "11";
                }
                if (value[0].status === 2 && value[1].status !== 2) {
                    key = "01";
                }
                if (value[0].status !== 2 && value[1].status === 2) {
                    key = "10";
                }
            }
            if (type === 204) { // 风窗
                if (value.length === 2) {
                    if (value[0].angle === "0" && value[1].angle === "0") {
                        key = "00";
                    }
                    if (value[0].angle !== "0" && value[1].angle !== "0") {
                        key = "11";
                    }
                    if (value[0].angle === "0" && value[1].angle !== "0") {
                        key = "01";
                    }
                    if (value[0].angle !== "0" && value[1].angle === "0") {
                        key = "10";
                    }
                }
                if (value.length === 1) {
                    if (value[0].angle === "0") {
                        key = "0";
                    }
                    if (value[0].angle !== "0") {
                        key = "1";
                    }
                }
            }
            return partsChangeObj[type][key];
        }

    }
    changeDomDeviceImg(domBgImg,type,value,windowSecondDom) { // key parts 修改dom显示设备图片
        // domBgImg 图片dom
        // type 设备类型
        // value 数值
        let imgUrl = this.getImgUrl(type,value);
        domBgImg.src = imgUrl;
        if (type === 204) { // 风窗
            if (value.length === 1) {
                windowSecondDom.style.display = "none";
            }
        }
    }
    changeDomParts(changeDom,val,type,key) { // 修改底部状态部分dom 底部 part 部分内容
        // changeDom 需要改的dom
        // val 当前的值
        // 字段名称
        // type 商品类型
        changeDom.innerText = val; // dom元素赋值
        changeDom.title = val;
        if (key === "status") { // 修改dom颜色
            if (type === 203) { // 风门
                let typeToValue = { 0: "打开",1: "未开到位",2: "关闭",3: "未关到位",4: "打开中",5: "关闭中" };
                changeDom.innerText = typeToValue[val];
                // val == 2 ? changeDom.classList.add("green") : changeDom.classList.add("grey");
            } else {
                changeDom.innerText = val ? "开" : "关";
                // val ? changeDom.classList.add("green") : changeDom.classList.add("grey");
            }
            changeDom.classList.add("green");
        }
    }
    changeDomIcon(domSrc,type,status) { // 地图图标dom
        let spriteImg = `./icon/${type}_${status ? 'online' : 'outline'}.png`;
        domSrc.src = spriteImg;
    }
    vectorsEqual(v1,v2) {
        return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
    }

    update(object,element) {
        // object 本地数据
        // element 传入数据
        const { position,object3d,infos,doms } = object;
        const { id,type,tunnelId,distance,deviceInfo } = element;
        let currentPosition = this.underGround.getPosition(tunnelId,distance);
        if (!currentPosition) {
            console.log('更新设备的时候，巷道没有加载');
        }
        if (currentPosition) {
            currentPosition.y = currentPosition.y + 5.6;
            if (!this.vectorsEqual(currentPosition,position)) { // 位置不等
                object3d.traverse(child => {
                    if (child.category && child.category === "iconImg") { // 图标
                        child.position.copy(currentPosition);
                    }
                    if (child.category && child.category === "iconTitle") { // 牌子
                        child.position.copy(currentPosition);
                    }
                });
                object.position = currentPosition;
            }
        }
        for (let key in deviceInfo) {
            let value = deviceInfo[key]; // 最新的值
            let oldValue = infos.deviceInfo[key]; // 旧的数据
            if (key !== "parts") { // 不是部件
                if (value !== oldValue) { //  数据变了
                    if (doms.domObjContent[key])
                        this.changeDomObj(doms.domObjContent[key],value,type,key);
                    if (value !== deviceInfo.status) // 修改图标
                        this.changeDomIcon(doms.domIcon,type,deviceInfo.status);
                }
            } else {
                let currentImgUrl = this.getImgUrl(type,value);
                let oldImgUrl = doms.domDeviceImg.getAttribute('src');
                if (currentImgUrl !== oldImgUrl) {
                    this.changeDomDeviceImg(doms.domDeviceImg,type,value,doms.windowDomSecond); // 修改图片deviceDom
                }

                value.forEach((child,index) => {
                    for (let i in child) {
                        let val = child[i]; // 当前数值
                        let oldVal = oldValue[index][i];
                        let currentDom = doms.domParts[index][i];
                        if (val !== oldVal) {
                            this.changeDomParts(currentDom,val,type,i);
                        }
                    }
                });
            }
        }


        object.infos = element;
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

    removeDom() {
        [...this.singleGroup.children].forEach(child => {
            child.traverse(childT => {
                if (childT.element && childT.element.parentNode) {
                    childT.element.parentNode.removeChild(childT.element);
                }
            });
        });
    }

}
