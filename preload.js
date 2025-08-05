const { contextBridge, ipcRenderer, app } = require("electron");
const fs = require("fs");
const path = require("path");
const https = require("https");

// 🔍 Logging API
contextBridge.exposeInMainWorld("electronAPI", {
  logMessage: (message) => console.log(message),

  // 🆕 Update screen support
  onUpdateData: (callback) => ipcRenderer.on("update-data", callback),
  onUpdateLog: (callback) => ipcRenderer.on("update-log", callback),
  sendNoUpdateRedirect: () => ipcRenderer.send("no-update-redirect")
});

// 📶 WiFi API
contextBridge.exposeInMainWorld("wifiAPI", {
  scan: () => ipcRenderer.invoke("scan-networks"),
  connect: (ssid, password) => ipcRenderer.invoke("connect-to-wifi", ssid, password),
  disconnect: () => ipcRenderer.invoke("disconnect-wifi")
});

// 🔊 Volume API
contextBridge.exposeInMainWorld("volumeAPI", {
  setVolume: (level) => ipcRenderer.send("set-volume", level)
});

// 🖥️ System Specs API
contextBridge.exposeInMainWorld("specsAPI", {
  getSystemInfo: () => ipcRenderer.invoke("get-system-info")
});

// 📦 Version Status API for update.html
contextBridge.exposeInMainWorld("versionUI", {
  loadStatus: () => {
    return new Promise((resolve) => {
      const localPath = path.join(app.getPath("userData"), "local-version.txt");
      const localVersion = fs.existsSync(localPath)
        ? fs.readFileSync(localPath, "utf8").trim()
        : app.getVersion();

      https.get("https://raw.githubusercontent.com/rsacompan/RuttersPlus/patch-channel/version.json", (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            const info = JSON.parse(data);
            const updateNeeded = info.version !== localVersion;
            resolve({
              current: localVersion,
              remote: info.version,
              updateNeeded
            });
          } catch {
            resolve({
              current: localVersion,
              remote: "unavailable",
              updateNeeded: false
            });
          }
        });
      }).on("error", () => {
        resolve({
          current: localVersion,
          remote: "unavailable",
          updateNeeded: false
        });
      });
    });
  }
});

// 🔒 Secure external message handler
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

  const { type, value, action, app: appName } = event.data;

  if (action === "shutdown" || action === "restart") {
    console.log("🔌 System action requested:", action);
    ipcRenderer.send("system-action", action);
  }

  if (type === "volume-change" && typeof value === "number") {
    console.log("🔊 Volume change received:", value);
    ipcRenderer.send("set-volume", value);
  }

  if (type === "launch" && typeof appName === "string") {
    console.log("🚀 App launch requested:", appName);
    ipcRenderer.send("launch-app", appName);
  }
});