export const onLoaded = () => {
    window.parent.postMessage({ cmd: "onLoaded" },"*");
};
export const postClickBoard = ({ id,type }) => {
    window.parent.postMessage(
        {
            // 调用前端弹窗
            cmd: "onClickObject",
            param: { id,type },
        },
        "*",
    );
}

