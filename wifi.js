const wifi = require("node-wifi");

wifi.init({
    iface: null // Auto-selects the WiFi interface
});

// Scan for networks
async function scanNetworks() {
    try {
        const networks = await wifi.scan();
        console.log("Available Networks:", networks);
        return networks;
    } catch (error) {
        console.error("Error scanning networks:", error);
    }
}

// Connect to a network
async function connectToNetwork(ssid, password) {
    try {
        await wifi.connect({ ssid, password });
        console.log(`Connected to ${ssid}`);
    } catch (error) {
        console.error("Connection failed:", error);
    }
}

// Disconnect from WiFi
async function disconnectFromNetwork() {
    try {
        await wifi.disconnect();
        console.log("Disconnected from WiFi");
    } catch (error) {
        console.error("Disconnection failed:", error);
    }
}

module.exports = { scanNetworks, connectToNetwork, disconnectFromNetwork };
