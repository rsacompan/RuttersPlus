const { app } = require("electron");
const path = require("path");
const fs = require("fs");
const https = require("https");
const extract = require("extract-zip");
const { exec } = require("child_process");

const versionURL = "https://raw.githubusercontent.com/rsacompan/RuttersPlus/patch-channel/version.json";
const localVersionPath = path.join(app.getPath("userData"), "local-version.txt");

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
                    console.error("❌ Failed to parse version.json:", err);
                    reject(err);
                }
            });
        }).on("error", err => {
            console.error("❌ Failed to fetch version.json:", err);
            reject(err);
        });
    });
}

function downloadFile(url, destination) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destination);
        https.get(url, res => {
            res.pipe(file);
            file.on("finish", () => {
                file.close(() => {
                    console.log(`✅ Downloaded: ${destination}`);
                    resolve();
                });
            });
            file.on("error", err => {
                console.error(`❌ Error writing file: ${destination}`, err);
                reject(err);
            });
        }).on("error", err => {
            console.error(`❌ Error downloading file: ${url}`, err);
            reject(err);
        });
    });
}

async function applyPatch(info) {
    console.log("🔧 Applying patch update...");

    const appDir = path.dirname(app.getAppPath()); // Unpacked app folder
    const patchList = info.patchFiles || [];

    for (const file of patchList) {
        const remote = `${info.patchSource}${file}`;
        const local = path.join(appDir, file);
        await downloadFile(remote, local);
    }

    try {
        fs.writeFileSync(localVersionPath, info.version);
        console.log(`📝 Saved patched version to local-version.txt: ${info.version}`);
    } catch (err) {
        console.error("❌ Failed to write local version:", err.message || err);
    }

    console.log("✅ Patch update applied successfully.");
}

async function applyFull(zipUrl) {
    console.log("📦 Applying full update...");
    const zipPath = path.join(app.getPath("userData"), "update.zip");
    const extractPath = path.join(app.getPath("userData"), "update-temp");

    await downloadFile(zipUrl, zipPath);
    await extract(zipPath, { dir: extractPath });

    const exePath = path.join(extractPath, "control-panel.exe");

    console.log("🚀 Launching new version...");
    exec(`"${exePath}"`, () => {
        console.log("✅ Update launched. Exiting current version.");
        app.quit();
    });
}

async function runUpdater(mainWindow) {
    try {
        mainWindow.loadFile("update.html");

        const info = await fetchJSON(versionURL);

        let current = app.getVersion();
        if (fs.existsSync(localVersionPath)) {
            const raw = fs.readFileSync(localVersionPath, "utf8").trim();
            if (raw) current = raw;
        }

        console.log("📦 Current version:", current);
        console.log("🛰️ Remote version:", info.version);

        if (info.version !== current) {
            console.log(`🔄 Update available: ${current} → ${info.version}`);

            if (info.installMode === "patch") {
                await applyPatch(info);
                console.log("⏳ Waiting 20 seconds before relaunch...");
                await new Promise(resolve => setTimeout(resolve, 20000));
                app.relaunch();
                app.exit();

            } else if (info.installMode === "full") {
                await applyFull(info.zipUrl);

            } else {
                console.warn("⚠️ Unknown installMode in version.json:", info.installMode);
                await new Promise(resolve => setTimeout(resolve, 20000));
                mainWindow.loadFile("index.html");
            }

        } else {
            console.log("✅ App is up to date.");
            await new Promise(resolve => setTimeout(resolve, 20000));
            mainWindow.loadFile("index.html");
        }

    } catch (err) {
        console.error("❌ Update process failed:", err.message || err);
        mainWindow.loadFile("index.html");
    }
}

module.exports = { runUpdater };