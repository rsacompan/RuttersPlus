const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require("electron");
const path = require("path");
const wifi = require("node-wifi");
const { exec } = require("child_process");
const loudness = require("loudness");

// Initialize WiFi module
wifi.init({ iface: null });

let mainWindow;

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        kiosk: true,
        icon: path.join(__dirname, "build", "RuttersLogo.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            webviewTag: true
        }
    });

    Menu.setApplicationMenu(null);
    mainWindow.loadFile("index.html");

    mainWindow.webContents.on("before-input-event", (event, input) => {
        if (
            input.key === "F11" ||
            input.key === "F5" ||
            (input.key === "R" && input.control) ||
            (input.key === "W" && input.control) ||
            (input.key === "F4" && input.alt)
        ) {
            event.preventDefault();
        }
    });
}
// ✅ System Info Handler
const os = require("os");

ipcMain.handle("get-system-info", async () => {
    const info = {
        os: `${os.type()} ${os.release()} (${os.platform()})`,
        arch: os.arch(),
        cpu: os.cpus()[0]?.model || "Unknown",
        cores: os.cpus().length,
        ram: `${(os.totalmem() / 1073741824).toFixed(2)} GB`,
        gpu: "Unavailable"
    };

    // Windows-specific GPU detection
    if (process.platform === "win32") {
        try {
            const { execSync } = require("child_process");
            const output = execSync("wmic path win32_VideoController get name").toString();
            const lines = output.trim().split("\n").filter(l => l.trim() && l.trim() !== "Name");
            info.gpu = lines.join(", ");
        } catch (err) {
            info.gpu = "Unavailable";
        }
    }

    return info;
});

app.whenReady().then(() => {
    createMainWindow();

    globalShortcut.register("Control+Alt+Q", () => {
        app.quit();
    });
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

// ✅ WiFi IPC handlers
ipcMain.handle("scan-networks", async () => {
    try {
        return await wifi.scan();
    } catch (error) {
        console.error("Error scanning networks:", error);
        return [];
    }
});

ipcMain.handle("connect-to-wifi", async (_, ssid, password) => {
    try {
        await wifi.connect({ ssid, password });
        return { success: true };
    } catch (error) {
        console.error("Connection failed:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle("disconnect-wifi", async () => {
    try {
        await wifi.disconnect();
        return { success: true };
    } catch (error) {
        console.error("Disconnection failed:", error);
        return { success: false, error: error.message };
    }
});

// ✅ Volume control
ipcMain.on("set-volume", async (_, level) => {
    console.log("Volume set request:", level);
    try {
        await loudness.setVolume(level);
        console.log(`Volume successfully set to ${level}%`);
    } catch (err) {
        console.error("Failed to set volume:", err);
    }
});

// ✅ Shutdown / Restart
ipcMain.on("system-action", (_, action) => {
    const shutdownCmd = process.platform === "win32" ? "shutdown /s /t 0" :
                        process.platform === "darwin" ? "sudo shutdown -h now" :
                        "shutdown -h now";

    const restartCmd = process.platform === "win32" ? "shutdown /r /t 0" :
                       process.platform === "darwin" ? "sudo shutdown -r now" :
                       "shutdown -r now";

    if (action === "shutdown") {
        exec(shutdownCmd);
    } else if (action === "restart") {
        exec(restartCmd);
    }
});

// ✅ Launch apps including Task Manager
ipcMain.on("launch-app", (_, app) => {
    let command;

    switch (app) {
        case "steam":
            command = process.platform === "win32"
                ? `"C:\\Program Files (x86)\\Steam\\Steam.exe"`
                : process.platform === "darwin"
                ? "open -a Steam"
                : "steam";
            break;

        case "terminal":
            command = process.platform === "win32"
                ? "start cmd"
                : process.platform === "darwin"
                ? "open -a Terminal"
                : "gnome-terminal";
            break;

        case "settings":
            command = process.platform === "win32"
                ? 'start "" ms-settings:'
                : process.platform === "darwin"
                ? "open -b com.apple.systempreferences"
                : "gnome-control-center";
            break;

        case "file-manager":
            command = process.platform === "win32"
                ? "explorer"
                : process.platform === "darwin"
                ? "open ."
                : "xdg-open ~";
            break;

        case "task-manager":
            command = process.platform === "win32"
                ? "start taskmgr"
                : process.platform === "darwin"
                ? 'open -a "Activity Monitor"'
                : "gnome-system-monitor";
            break;

        default:
            console.log("❌ Unknown app:", app);
            return;
    }

    exec(command, (error, stdout, stderr) => {
        console.log(`Launching "${app}" using: ${command}`);
        if (error) {
            console.error(`Failed to launch "${app}":`, error.message);
        } else {
            console.log(`✅ "${app}" launched.`);
        }
    });
});