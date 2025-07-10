const { contextBridge, ipcRenderer } = require("electron");

// Utility API
contextBridge.exposeInMainWorld("electronAPI", {
    logMessage: (message) => console.log(message),
});

// WiFi API
contextBridge.exposeInMainWorld("wifiAPI", {
    scan: () => ipcRenderer.invoke("scan-networks"),
    connect: (ssid, password) => ipcRenderer.invoke("connect-to-wifi", ssid, password),
    disconnect: () => ipcRenderer.invoke("disconnect-wifi")
});

// Volume API
contextBridge.exposeInMainWorld("volumeAPI", {
    setVolume: (level) => ipcRenderer.send("set-volume", level)
});

// ✅ Specs API
contextBridge.exposeInMainWorld("specsAPI", {
    getSystemInfo: () => ipcRenderer.invoke("get-system-info")
});

// 🔒 Secure external message handler with diagnostics
window.addEventListener("message", (event) => {
    console.log("📨 Raw message received:", event.origin, event.data);

    const allowedBase = ".simplesystemssoftware.net";
    const url = new URL(event.origin);
    const isTrustedOrigin =
        url.hostname === "simplesystemssoftware.net" ||
        url.hostname.endsWith(allowedBase);

    if (!event.data || !isTrustedOrigin) {
        console.warn("❌ Untrusted origin or missing data:", event.origin);
        return;
    }

    const { type, value, action, app } = event.data;

    if (action === "shutdown" || action === "restart") {
        console.log("🔌 System action requested:", action);
        ipcRenderer.send("system-action", action);
    }

    if (type === "volume-change" && typeof value === "number") {
        console.log("🔊 Volume change received:", value);
        ipcRenderer.send("set-volume", value);
    }

    if (type === "launch" && typeof app === "string") {
        console.log("🚀 App launch requested:", app);
        ipcRenderer.send("launch-app", app);
    }
});