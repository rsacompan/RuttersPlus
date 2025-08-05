const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const extract = require("extract-zip");
const { exec } = require("child_process");

const versionURL = "https://raw.githubusercontent.com/rsacompan/RuttersPlus/patch-channel/version.json";
const localVersionPath = path.join(app.getPath("userData"), "local-version.txt");

// 🔧 Helper to send logs to update.html
function logToWindow(mainWindow, message) {
    console.log(message); // Still log to console
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("update-log", message);
    }
}

// 🔧 Helper to send structured update data
function sendUpdateData(mainWindow, current, info) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send("update-data", {
            currentVersion: current,
            newVersion: info.version,
            patchNotes: info.notes || []
        });
    }
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            });
        }).on("error", reject);
    });
}

function downloadFile(url, destination, mainWindow) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        https.get(url, res => {
            res.pipe(file);
            file.on("finish", () => {
                file.close(() => {
                    logToWindow(mainWindow, `✅ Downloaded: ${destination}`);
                    resolve();
                });
            });
            file.on("error", err => {
                logToWindow(mainWindow, `❌ Error writing file: ${destination}`);
                reject(err);
            });
        }).on("error", err => {
            logToWindow(mainWindow, `❌ Error downloading file: ${url}`);
            reject(err);
        });
    });
}

async function applyPatch(info, mainWindow) {
    logToWindow(mainWindow, "🔧 Applying patch update...");

    const appDir = path.dirname(app.getAppPath());
    const patchList = info.patchFiles || [];

    for (const file of patchList) {
        const remote = `${info.patchSource}${file}`;
        const local = path.join(appDir, file);
        await downloadFile(remote, local, mainWindow);
    }

    try {
        fs.writeFileSync(localVersionPath, info.version);
        logToWindow(mainWindow, `📝 Saved patched version to local-version.txt: ${info.version}`);
    } catch (err) {
        logToWindow(mainWindow, `❌ Failed to write local version: ${err.message || err}`);
    }

    logToWindow(mainWindow, "✅ Patch update applied successfully.");
}

async function applyFull(zipUrl, mainWindow) {
    logToWindow(mainWindow, "📦 Applying full update...");
    const zipPath = path.join(app.getPath("userData"), "update.zip");
    const extractPath = path.join(app.getPath("userData"), "update-temp");

    await downloadFile(zipUrl, zipPath, mainWindow);
    await extract(zipPath, { dir: extractPath });

    const exePath = path.join(extractPath, "control-panel.exe");

    logToWindow(mainWindow, "🚀 Launching new version...");
    exec(`"${exePath}"`, () => {
        logToWindow(mainWindow, "✅ Update launched. Exiting current version.");
        app.quit();
    });
}

async function runUpdater(mainWindow) {
    try {
        const unpackedUpdateHTML = path.join(path.dirname(app.getAppPath()), "update.html");
        await mainWindow.loadFile(unpackedUpdateHTML);

        const info = await fetchJSON(versionURL);

        let current = app.getVersion();
        if (fs.existsSync(localVersionPath)) {
            const raw = fs.readFileSync(localVersionPath, "utf8").trim();
            if (raw) current = raw;
        }

        logToWindow(mainWindow, `📦 Current version: ${current}`);
        logToWindow(mainWindow, `🛰️ Remote version: ${info.version}`);

        sendUpdateData(mainWindow, current, info);

        if (info.version !== current) {
            logToWindow(mainWindow, `🔄 Update available: ${current} → ${info.version}`);

            if (info.installMode === "patch") {
                await applyPatch(info, mainWindow);
                logToWindow(mainWindow, "⏳ Waiting 20 seconds before relaunch...");
                await new Promise(resolve => setTimeout(resolve, 20000));
                app.relaunch();
                app.exit();

            } else if (info.installMode === "full") {
                await applyFull(info.zipUrl, mainWindow);

            } else {
                logToWindow(mainWindow, `⚠️ Unknown installMode in version.json: ${info.installMode}`);
                await new Promise(resolve => setTimeout(resolve, 20000));
                mainWindow.loadFile("index.html");
            }

        } else {
            logToWindow(mainWindow, "✅ App is up to date.");
            await new Promise(resolve => setTimeout(resolve, 20000));
            mainWindow.loadFile("index.html");
        }

    } catch (err) {
        logToWindow(mainWindow, `❌ Update process failed: ${err.message || err}`);
        mainWindow.loadFile("index.html");
    }
}

module.exports = { runUpdater };