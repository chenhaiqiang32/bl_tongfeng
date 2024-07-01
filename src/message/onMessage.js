
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
                case "updateResistance": {
                    Core3D.updateTunnelConfig(event.data.param,"resistance");
                    break;
                }
                case "updateVolume": {
                    Core3D.updateTunnelConfig(event.data.param,"volume");
                    break;
                }
            }
        }
    };
};
