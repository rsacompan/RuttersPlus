const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require("electron");
const path = require("path");
const wifi = require("node-wifi");
const { exec } = require("child_process");

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

// Handle WiFi operations
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

// Shutdown/restart support
ipcMain.on("system-action", (event, action) => {
    const shutdownCmd =
        process.platform === "win32"
            ? "shutdown /s /t 0"
            : process.platform === "darwin"
            ? "sudo shutdown -h now"
            : "shutdown -h now";

    const restartCmd =
        process.platform === "win32"
            ? "shutdown /r /t 0"
            : process.platform === "darwin"
            ? "sudo shutdown -r now"
            : "shutdown -r now";

    if (action === "shutdown") {
        exec(shutdownCmd);
    } else if (action === "restart") {
        exec(restartCmd);
    }
});
