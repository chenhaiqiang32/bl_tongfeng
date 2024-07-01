import * as THREE from "three";
import { singleInstance } from "../../../utils";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";

export function createSprite(imgSrc,scale = new THREE.Vector3(1,1,1),center = new THREE.Vector2(0.5,0.5)) {

    const map = new THREE.TextureLoader().load(imgSrc);
    const material = new THREE.SpriteMaterial({
        map,
        sizeAttenuation: false,
        depthTest: false,
        // depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.copy(scale);
    sprite.center.copy(center);

    return sprite;
}


class _PersonCard extends CSS2DObject {

    constructor(item,fun) {
        let labelEle = document.createElement("div");
        let labelTop = document.createElement("div");
        let labelBottom = document.createElement("div");
        let labelBottomDown = document.createElement("div");
        let labelEleOut = document.createElement("div");
        labelEleOut.append(labelEle);
        labelEleOut.append(labelTop);
        labelEleOut.append(labelBottom);
        labelEleOut.append(labelBottomDown);
        labelEleOut.draggable = false;
        labelTop.className = "beilu_three_Board_text_person_top";
        labelBottom.className = "beilu_three_Board_text_person_bottom";
        labelEleOut.className = "beilu_three_Board_text_person";
        labelBottomDown.className = "beilu_three_Board_text_person_bottom_down";

        labelEle.innerText = item.name;

        if (fun) {
            labelEle.onclick = () => {
                fun();
            };
        }

        super(labelEleOut);

        this.name = "board" + item.id;

    }

    setInnerText(str) {
        this.element.innerText = str;
    }

}

class _AlarmPersonCard extends CSS2DObject {

    constructor() {
        let labelEle = document.createElement("div");
        let labelTop = document.createElement("div");
        let labelBottom = document.createElement("div");
        let labelBottomDown = document.createElement("div");
        let labelEleOut = document.createElement("div");
        labelEleOut.append(labelEle);
        labelEleOut.append(labelTop);
        labelEleOut.append(labelBottom);
        labelEleOut.append(labelBottomDown);
        labelEleOut.draggable = false;
        labelTop.className = "beilu_three_Board_text_person_top";
        labelBottom.className = "beilu_three_Board_text_person_bottom";
        labelEleOut.className = "red_three_Board_text_person";
        labelBottomDown.className = "beilu_three_Board_text_person_bottom_down";

        super(labelEleOut);

    }

    setInnerText(str) {
        this.element.innerText = str;
    }

}

class _TunnelCard extends CSS2DObject {
    constructor() {
        let labelEleOut = document.getElementById("deviceTunnel");

        super(labelEleOut);

    }
    /**
      * 处理用户数组的函数
      * @param {initialized} ars - 巷道数据
     */
    setInnerText(ars) {
        const { branchName,volume,speed,resistance,length,crossSectional } = ars;
        let labelEleOut = this.element;
        let targetElements = labelEleOut.getElementsByClassName("tunnelName"); // 巷道名称
        // 遍历这些子元素，并修改它们的文本内容
        targetElements[0].innerText = branchName;

        let volumeValue = labelEleOut.getElementsByClassName("volume"); // 风量
        // 遍历这些子元素，并修改它们的文本内容
        volumeValue[0].innerText = volume;

        let speedValue = labelEleOut.getElementsByClassName("speed"); // 风速
        // 遍历这些子元素，并修改它们的文本内容
        speedValue[0].innerText = speed;

        let resistanceValue = labelEleOut.getElementsByClassName("resistance"); // 阻力
        // 遍历这些子元素，并修改它们的文本内容
        resistanceValue[0].innerText = resistance;

        let lengthValue = labelEleOut.getElementsByClassName("length"); // 长度
        // 遍历这些子元素，并修改它们的文本内容
        lengthValue[0].innerText = length;

        let crossSectionalValue = labelEleOut.getElementsByClassName("crossSectional"); // 断面积
        // 遍历这些子元素，并修改它们的文本内容
        crossSectionalValue[0].innerText = crossSectional;
    }

}

export const PersonCard = singleInstance(_PersonCard);
export const AlarmPersonCard = singleInstance(_AlarmPersonCard);
export const TunnelCard = singleInstance(_TunnelCard);
