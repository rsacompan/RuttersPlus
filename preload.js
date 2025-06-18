const { contextBridge, ipcRenderer } = require("electron");

// Utility API example
contextBridge.exposeInMainWorld("electronAPI", {
    logMessage: (message) => console.log(message),
});

// WiFi API
contextBridge.exposeInMainWorld("wifiAPI", {
    scan: () => ipcRenderer.invoke("scan-networks"),
    connect: (ssid, password) => ipcRenderer.invoke("connect-to-wifi", ssid, password),
    disconnect: () => ipcRenderer.invoke("disconnect-wifi")
});

// Allow shutdown/restart messages from any *.simplesystemssoftware.net subdomain or the main domain
window.addEventListener("message", (event) => {
    const allowedBase = ".simplesystemssoftware.net";
    // event.origin is of the form "https://sub.simplesystemssoftware.net"
    const url = new URL(event.origin);
    if (
        (
            url.hostname === "simplesystemssoftware.net" ||
            url.hostname.endsWith(allowedBase)
        ) &&
        event.data &&
        (event.data.action === "shutdown" || event.data.action === "restart")
    ) {
        ipcRenderer.send("system-action", event.data.action);
    }
});