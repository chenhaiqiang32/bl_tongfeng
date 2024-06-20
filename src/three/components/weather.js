import * as THREE from "three";
import TWEEN from "three/examples/jsm/libs/tween.module";
import { Rain, Snow } from "../../lib/blMeshes";
import { Stars } from "../../lib/stars";
import { Core3D } from "..";
import { Postprocessing } from "./postprocessing";
import { loadTexture } from "../../utils/texture";

import DEFAULT from "../../config/index.json";

export const symbolWeather = Symbol();

const LEVEL = {
    1: DEFAULT.weather.level.small,
    2: DEFAULT.weather.level.middle,
    3: DEFAULT.weather.level.heavy,
};

// 以二进制数列表现天气风格类型

// weather
export const SUNNY = 0;
export const SNOW = 1;
export const RAIN = 2;

// lightingPattern
export const DAY = 4;
export const NIGHT = 8;
export const SCIENCE = 16;

const AMBIENT = "AmbientLight";
const DIRECTIONAL = "DirectionalLight";

const SUNNY_DAY = SUNNY | DAY;
const SUNNY_NIGHT = SUNNY | NIGHT;
const SNOW_DAY = SNOW | DAY;
const SNOW_NIGHT = SNOW | NIGHT;
const RAIN_DAY = RAIN | DAY;
const RAIN_NIGHT = RAIN | NIGHT;

const SunnyTexture = loadTexture(DEFAULT.background.sunnyTexture);
const NightCloudyTexture = loadTexture(DEFAULT.background.sunnyTexture);
const NightTexture = loadTexture(DEFAULT.background.nightTexture);
const CloudyTexture = loadTexture(DEFAULT.background.cloudyTexture);

const TexturesMap = {
    [SUNNY_DAY]: SunnyTexture,
    [SUNNY_NIGHT]: NightTexture,
    [SNOW_DAY]: CloudyTexture,
    [SNOW_NIGHT]: NightCloudyTexture,
    [RAIN_DAY]: CloudyTexture,
    [RAIN_NIGHT]: NightCloudyTexture,
    [SCIENCE]: null,
};

const LightIntensityMap = {
    [SUNNY_DAY]: { [AMBIENT]: 0.55, [DIRECTIONAL]: 3 },
    [SUNNY_NIGHT]: { [AMBIENT]: 0.4, [DIRECTIONAL]: 0.3 },
    [SNOW_DAY]: { [AMBIENT]: 0.45, [DIRECTIONAL]: 0.3 },
    [SNOW_NIGHT]: { [AMBIENT]: 0.3, [DIRECTIONAL]: 0.15 },
    [RAIN_DAY]: { [AMBIENT]: 0.35, [DIRECTIONAL]: 0.1 },
    [RAIN_NIGHT]: { [AMBIENT]: 0.2, [DIRECTIONAL]: 0.15 },
    [SCIENCE]: { [AMBIENT]: 0.05, [DIRECTIONAL]: 0.25 },
};

const LightColorMap = {
    [DAY]: { [AMBIENT]: 0xffffff, [DIRECTIONAL]: 0xffffff, saturation: 0.18, contrast: 0.2 },
    [NIGHT]: { [AMBIENT]: 0xffffff, [DIRECTIONAL]: 0x79a7ff, saturation: 0.15, contrast: 0.2 },
    [SCIENCE]: { [AMBIENT]: 0xffffff, [DIRECTIONAL]: 0xffffff, saturation: 0, contrast: 0 },
};

export class Weather {
    /** @param {Core3D} core */
    constructor(core) {
        /**@type {THREE.Scene} */
        this.scene = core.scene;

        /**@type {THREE.DirectionalLight} */
        this.directionalLight = core.directionalLight;

        /**@type {THREE.AmbientLight} */
        this.ambientLight = core.ambientLight;

        /**@type {Postprocessing} */
        this.postprocessing = core.postprocessing;

        /**@type {DAY|NIGHT|SCIENCE} */
        this.lightingPattern = DAY;

        this.onRenderQueue = core.onRenderQueue;

        this.rain = null;
        this.snow = null;

        this.box = new THREE.Box3(
            new THREE.Vector3(...DEFAULT.weather.range.min),
            new THREE.Vector3(...DEFAULT.weather.range.max),
        );

        this.thunderA = null;
        this.thunderB = null;

        this.weather = SUNNY;

        this.level = 3;

        this.scene.background = SunnyTexture;

        this.setToRenderQueue();
    }

    /**
     * 设置天气范围
     * @param {THREE.Box3} box
     */
    setRange(box) {
        this.box.copy(box);
    }

    deleteFromRenderQueue() {
        this.onRenderQueue.delete(symbolWeather);
    }

    setToRenderQueue() {
        this.onRenderQueue.set(symbolWeather, this.update);
    }

    /**
     * 设置天气
     * @param {SUNNY|SNOW|RAIN} weather
     * @param {Number} level
     */
    setWeather(weather, level = 3) {
        // 如果待设置天气与当前天气相同，直接返回
        if (this.equalWeather(weather, level)) return;

        // 科幻风没有天气
        if (this.lightingPattern === SCIENCE) return;

        // 释放资源
        this.dispose();

        // 更新天气数据
        this.weather = weather;
        this.level = level;

        // 天气种类
        this.setBackground();

        this.changeLightIntensity(this.ambientLight);
        this.changeLightIntensity(this.directionalLight);

        this.setShadow();

        if (weather === SNOW) {
            this.setSnowWeather(this.level);
        } else if (weather === SUNNY) {
            // nothing
        } else if (weather === RAIN) {
            this.setRainWeather(this.level);
        } else {
            console.error("不存在的天气");
        }
    }

    /**
     * 判断是否相同天气类型和大小
     * @param {SUNNY|SNOW|RAIN} weather
     * @param {Number} level
     */
    equalWeather(weather, level) {
        return this.weather === weather && this.level === level;
    }

    /**
     * 设置雪天
     * @param {number} level
     */
    setSnowWeather(level) {
        const count = LEVEL[level];
        this.snow = new Snow(this.box, { count, speed: DEFAULT.weather.snow.speed, size: DEFAULT.weather.snow.size });
        this.scene.add(this.snow);
    }
    /**
     * 设置雨天
     * @param {number} level
     */
    setRainWeather(level) {
        if (level === 3) this.createThunder();

        const count = LEVEL[level];
        this.rain = new Rain(this.box, { count, speed: 1, size: 1 });
        this.scene.add(this.rain);
    }

    setStars() {
        const count = 2000;
        const range = new THREE.Box3(
            new THREE.Vector3(...DEFAULT.weather.stars.range.min),
            new THREE.Vector3(...DEFAULT.weather.stars.range.max),
        );
        this.stars = new Stars(count, range);
        this.scene.add(this.stars);
    }

    /**获取天气*/
    getWeatherBit() {
        return this.lightingPattern === SCIENCE ? SCIENCE : this.weather | this.lightingPattern;
    }

    /**
     * 获取当前天气中的灯光强度
     * @param {THREE.Light} light
     */
    getLightIntensity(light) {
        return LightIntensityMap[this.getWeatherBit()][light.type];
    }

    /**设置当天天气风格下的背景贴图 */
    setBackground() {
        this.scene.background = TexturesMap[this.getWeatherBit()];
    }

    /**
     * 设置当前天气中的灯光颜色
     * @param {THREE.Light} light
     */
    setLightColor(light) {
        light.color.set(LightColorMap[this.lightingPattern][light.type]);
    }

    /**设置当前天气风格下的阴影 */
    setShadow() {
        const weatherBit = this.getWeatherBit();
        this.directionalLight.castShadow = !(weatherBit & RAIN || weatherBit & NIGHT);
    }

    /**
     * 日夜景切换
     * @param {DAY|NIGHT|SCIENCE} lightingPattern
     */
    updateLightingPattern(lightingPattern) {
        // 目标设置与当前设置相同则直接返回
        if (this.lightingPattern === lightingPattern) return;
        this.lightingPattern = lightingPattern;

        // 释放资源
        this.dispose();

        // 设置阴影
        this.setShadow();

        if (lightingPattern !== SCIENCE) {
            // 如果不是科技风,设置当前天气
            if (this.weather === RAIN) {
                this.setRainWeather(this.level);
            } else if (this.weather === SNOW) {
                this.setSnowWeather(this.level);
            }
        } else {
            // 科技风为满天星辰
            this.setStars();
        }

        // 设置背景图
        this.setBackground();

        // 设置光照强度
        this.changeLightIntensity(this.ambientLight);
        this.changeLightIntensity(this.directionalLight);

        // 设置光照颜色
        this.setLightColor(this.ambientLight);
        this.setLightColor(this.directionalLight);

        // 设置对比度和饱和度
        this.postprocessing.hueSaturationEffect.saturation = LightColorMap[lightingPattern].saturation;
        this.postprocessing.brightnessContrastEffect.contrast = LightColorMap[lightingPattern].contrast;
    }

    /**
     * 根据当前天气风格改变灯光强度
     * @param {THREE.Light} light
     */
    changeLightIntensity(light) {
        new TWEEN.Tween(light).to({ intensity: this.getLightIntensity(light) }, 1000).start();
    }

    createThunder() {
        const light = this.ambientLight;
        this.cleanThunder();
        this.thunderA = new TWEEN.Tween(light)
            .to({ intensity: 3 }, 200)
            .repeat(2)
            .yoyo()
            .onComplete(() => {
                this.resetThunder();
            });
        this.thunderB = new TWEEN.Tween(light).to({ intensity: this.getLightIntensity(light) }, 300).onComplete(() => {
            this.resetThunder();
        });
        this.timer = setTimeout(() => {
            if (this.thunderA) {
                this.thunderA.start();
            }
            clearTimeout(this.timer);
            this.timer = null;
        }, 5000);
    }

    resetThunder() {
        const light = this.ambientLight;
        new TWEEN.Tween(light).to({ intensity: LightIntensityMap[this.getWeatherBit()][light.type] }, 1000).start();
        const num = Math.ceil(Math.random() * 10 + 20) * 1000;
        this.timer = setTimeout(() => {
            const d = Math.random();
            if (d > 0.5) {
                this.thunderB && this.thunderB.start();
            } else {
                this.thunderA && this.thunderA.start();
            }
            clearTimeout(this.timer);
            this.timer = null;
        }, num);
    }

    cleanThunder() {
        if (this.thunderA) {
            this.thunderA.stop();
            this.thunderA = null;
            this.thunderB.stop();
            this.thunderB = null;
        }
    }

    /**@param {core} core */
    update = core => {
        this.rain && this.rain.update(core.delta, core.camera.position);
        this.snow && this.snow.update();
        this.stars && this.stars.update();
    };
    dispose() {
        this.cleanThunder();

        this.rain && this.rain.deleteSelf();
        this.rain = null;

        this.snow && this.snow.deleteSelf();
        this.snow = null;

        this.stars && this.stars.deleteSelf();
        this.stars = null;
    }
}
