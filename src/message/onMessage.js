
import { Core3D } from "../three";
export const openMessage = Core3D => {
    window.onmessage = event => {
        if (event.data && event.data.cmd) {
            switch (event.data.cmd) {
                case "initialized": {
                    Core3D.initialized(event.data.param);
                    break;
                }
                case "deviceManage": {
                    Core3D.deviceManage(event.data.param);
                    break;
                }
                case "switchTunnelStyle": {
                    Core3D.switchTunnelStyle(event.data.param);
                    break;
                }
                case "updateWindSpeed": {
                    Core3D.updateTunnelConfig(event.data.param,"speed");
                    break;
                }
                case "updateWindDirection": {
                    Core3D.updateTunnelConfig(event.data.param,"direction");
                    break;
                }
                case "updateTunnelName": {
                    Core3D.updateTunnelConfig(event.data.param,"branchName");
                    break;
                }
                case "updateResistance": {
                    Core3D.updateTunnelConfig(event.data.param,"resistance");
                    break;
                }
                case "updateVolume": {
                    Core3D.updateTunnelConfig(event.data.param,"volume");
                    break;
                }
                case "changeScene": {
                    Core3D.onMessageChange(event.data.param);
                    break;
                }
                case "switchFacility": {
                    Core3D.switchFacility(event.data.param);
                    break;
                }
                case "setTypeVisibleEx": {
                    Core3D.setTypeVisibleEx(event.data.param);
                    break;
                }
                case "spotDevice": { // 拉近设备距离
                    Core3D.spotDevice(event.data.param);
                    break;
                }
                case "spotTunnel": { // 拉近巷道距离
                    Core3D.spotTunnel(event.data.param);
                    break;
                }
                case "resetCamera": { // 拉近巷道距离
                    Core3D.resetCamera(event.data.param);
                    break;
                }
                case "close": {
                    Core3D.stopRender();
                    break;
                }
                case "open": {
                    Core3D.beginRender();
                    break;
                }
            }
        }
    };
};
