const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("volumeBridge", {
    sendVolume: (level) => ipcRenderer.send("set-volume", level)
});

window.addEventListener("message", (event) => {
    if (event.data.type === "volume-change") {
        ipcRenderer.send("set-volume", event.data.value);
    }
});