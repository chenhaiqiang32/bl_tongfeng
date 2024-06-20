import * as THREE from "three";

export default class MemoryManager {
    resources;
    constructor() {
        this.resources = new Set();
    }
    /**
     * @description 收集内存引用
     * @param {*} resource
     */
    track(resource) {
        if (!resource) {
            return resource;
        }
        // handle children and when material is an array of materials or
        // uniform is array of textures
        if (Array.isArray(resource)) {
            resource.forEach(resource => this.track(resource));
            return resource;
        }

        if ("dispose" in resource || resource instanceof THREE.Object3D) {
            this.resources.add(resource);
        }

        if (resource instanceof THREE.Object3D) {
            resource.traverse(res => {
                // if (res.isCSS2DObject) {
                this.resources.add(res);
                // }
                res.material && this.track(res.material);
                res.geometry && this.track(res.geometry);
                res.skeleton && this.track(res.skeleton);
                res.element && this.track(res.element);
            });
        } else if (resource instanceof THREE.Material) {
            // We have to check if there are any textures on the material
            for (const value of Object.values(resource)) {
                if (value instanceof THREE.Texture) {
                    this.track(value);
                }
            }
            // We also have to check if any uniforms reference textures or arrays of textures
            if ("uniforms" in resource) {
                for (const value of Object.values(resource.uniforms)) {
                    if (value) {
                        const uniformValue = value.value;
                        if (uniformValue instanceof THREE.Texture || Array.isArray(uniformValue)) {
                            this.track(uniformValue);
                        }
                    }
                }
            }
        }
        return resource;
    }

    untrack(resource) {
        this.resources.delete(resource);
    }

    /**
     * @description 释放内存
     * @param { boolean } removeFromParent 是否从父节点移除，默认为true
     */
    dispose(removeFromParent = true) {
        for (const resource of this.resources) {
            if (resource instanceof THREE.Object3D && removeFromParent) {
                if (resource.parent) {
                    resource.parent.remove(resource);
                }
            }
            if ("dispose" in resource) {
                resource.dispose();
            }
        }
        this.clear();
    }

    /**
     *@description 清除引用，如不需要再次调用时 dispose时， 请调用此方法
     */
    clear() {
        this.resources.clear();
    }
}

function dispose(object) {
    if (typeof object.dispose === "function") {
        object.dispose();
    }
    if (typeof object.removeFromParent === "function") {
        object.removeFromParent();
    } else if (object.parent && typeof object.parent.remove === "function") {
        object.parent.remove(object);
    }
}

export function deepDispose(resource) {
    if (!resource) return;
    // handle children and when material is an array of materials or
    // uniform is array of textures
    if (Array.isArray(resource)) {
        resource.forEach(deepDispose);
        return;
    }

    if ("dispose" in resource || resource instanceof THREE.Object3D) {
        dispose(resource);
    }

    if (resource instanceof THREE.Object3D) {
        resource.traverse(res => {
            dispose(res);

            res.material && deepDispose(res.material);
            res.geometry && deepDispose(res.geometry);
            res.skeleton && deepDispose(res.skeleton);
            res.element && deepDispose(res.element);
        });
    } else if (resource instanceof THREE.Material) {
        // We have to check if there are any textures on the material
        for (const value of Object.values(resource)) {
            if (value instanceof THREE.Texture) {
                deepDispose(value);
            }
        }
        // We also have to check if any uniforms reference textures or arrays of textures
        if ("uniforms" in resource) {
            for (const value of Object.values(resource.uniforms)) {
                if (value) {
                    const uniformValue = value.value;
                    if (uniformValue instanceof THREE.Texture || Array.isArray(uniformValue)) {
                        deepDispose(uniformValue);
                    }
                }
            }
        }
    }
}
