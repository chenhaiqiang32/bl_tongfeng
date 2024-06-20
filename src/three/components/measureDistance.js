import * as THREE from "three";
import { Core3D } from "..";
import { Subsystem } from "../subsystem/Subsystem";
import { createCSS2DObject, createDom } from "../../lib/CSSObject";
import { DrawLineHelper } from "./../../lib/drawLineHelper";

const mousedown = new THREE.Vector2();
const mouseup = new THREE.Vector2();
export class MeasureDistance {
    /**
     * @param {Subsystem} subsystem
     */
    constructor(subsystem) {
        /**@type {Core3D} */
        this.core = subsystem.core;
        this.scene = subsystem.scene;
        this.subsystem = subsystem;

        /**射线拾取对象 */
        this.raycastObject = null;

        this.hitPoint = null;
        this.helper = new DrawLineHelper(this.scene);
    }

    setRaycastObject(object) {
        this.raycastObject = object;
    }

    start() {
        this.helper.active = true;
        this.mousedownControls = this.core.addEventListener("mousedown");
        this.mouseupControls = this.core.addEventListener("mouseup");
        this.keyupControls = this.core.addEventListener("keyup");

        this.mousedownControls.add(this.onmousedown);
        this.mouseupControls.add(this.onmouseup);
        this.keyupControls.add(this.onkeyup);

        this.raycastControls = this.core.raycast("mousemove", this.raycastObject, this.raycastOnmousemove);
    }
    removeListener() {
        if (this.helper.active === true) {
            this.helper.active = false;
            this.mousedownControls.clear();
            this.mouseupControls.clear();
            this.keyupControls.clear();
            this.raycastControls.clear();
        }
    }
    end() {
        this.removeListener();
        this.helper.dispose();
        this.label && this.label.deleteSelf();
        this.label = null;
    }

    onmousedown = event => {
        this.getMouse(event, mousedown);
    };

    onmouseup = event => {
        this.getMouse(event, mouseup);
        if (!mousedown.equals(mouseup)) {
            return;
        }
        if (event.button === 2) {
            this.removeListener();
            this.helper.active = false;
            const lastPoint = this.helper.points[this.helper.points.length - 1];
            this.setLabelPosition(lastPoint);
            this.label && (this.label.element.innerText = this.helper.getLength(2));
            return;
        }
        if (this.hitPoint) {
            this.helper.addPoint(this.hitPoint);
            this.label && (this.label.visible = !(this.helper.count === 0));
        }
    };

    onkeyup = event => {
        if (event.key === "Escape") {
            this.helper.deletePoint();
            this.label.visible = !(this.helper.count === 0);
            this.updateLabel();
        }
    };

    getMouse = (event, vector) => {
        const { left, top, width, height } = this.core.domElement.getBoundingClientRect();
        vector.x = ((event.clientX - left) / width) * 2 - 1;
        vector.y = -((event.clientY - top) / height) * 2 + 1;
    };

    raycastOnmousemove = intersections => {
        if (intersections.length) {
            this.hitPoint = intersections[0].point;
            this.helper.updateMoveLine(this.hitPoint);
            if (!this.label && this.helper.count > 0) {
                this.createLabel();
            } else if (this.label) {
                this.updateLabel();
            }
        } else {
            this.hitPoint = null;
        }
    };

    createLabel() {
        const dom = createDom({
            innerText: 0 + "m",
            className: "area-label",
        });
        this.label = createCSS2DObject(dom);
        this.scene.add(this.label);
    }

    updateLabel() {
        const element = this.label.element;
        if (element) {
            const length = this.helper.getTotalLength(2);
            element.innerText = length + "m";
            this.setLabelPosition(this.hitPoint);
        }
    }

    setLabelPosition(position, y = 10) {
        this.label.position.set(position.x, position.y + y, position.z);
    }
}
