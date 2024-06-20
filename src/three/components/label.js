import * as THREE from "three";
import { Subsystem } from "../subsystem";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer";
import { LabelEntity } from "../../lib/LabelEntity";

const labelData = [
    {
        position: new THREE.Vector3(-92,40,112),
        name: "压风机房",
        system: "pressureFanSubsystem",
    },
    {
        position: new THREE.Vector3(-1568,238,-21),
        name: "通风机房",
        system: "fanSubsystem",
    },
];

export class LabelManager {
    /**@param {Subsystem} system  */
    constructor(system) {
        this.scene = system.scene;
        this.camera = system.camera;

        this.labelGroup = new THREE.Group();
    }

    init(data = labelData) {
        data.forEach(item => {
            this.insertLabel(item);
        });
        this.scene.add(this.labelGroup);
    }

    insertLabel(data) {
        const mesh = new LabelEntity(data.name);
        mesh.addEventListener("click",() => { });
        mesh.position.copy(data.position);
        this.labelGroup.add(mesh);
    }

    dispose() {
        while (this.labelGroup.children.length) {
            /**@type {LabelEntity} */
            const label = this.labelGroup.children.pop();
            label.domElement.remove();
            label.removeFromParent();
        }
    }

    changeVisible(group,f) {
        group.traverse(child => {
            if (child instanceof CSS2DObject) {
                child.visible = f;
            }
        });
        this.iconVisible = f;
    }

}
