const wifiList = document.getElementById('wifi-list');
const statusDiv = document.getElementById('status');

let passwordPromptSSID = null;

function setStatus(msg) {
  statusDiv.textContent = msg;
}

async function scanNetworks() {
  setStatus('Scanning...');
  try {
    const networks = await window.wifiAPI.scan();
    console.log("Networks found:", networks); // <-- Debug line
    renderWifiList(networks);
    setStatus('Scan complete.');
  } catch (e) {
    setStatus('Failed to scan networks: ' + e.message);
  }
}

function renderWifiList(networks) {
  wifiList.innerHTML = '';
  if (!networks || networks.length === 0) {
    wifiList.innerHTML = '<li>No networks found.</li>';
    return;
  }
  passwordPromptSSID = null;
  networks.forEach(network => {
    const li = document.createElement('li');
    li.className = 'wifi-item';

    const ssidDiv = document.createElement('span');
    ssidDiv.className = 'ssid-info';
    ssidDiv.textContent = network.ssid || '(hidden SSID)';
    const securityDiv = document.createElement('span');
    securityDiv.className = 'security';
    securityDiv.textContent = network.security || 'Open';

    li.appendChild(ssidDiv);
    li.appendChild(securityDiv);

    const connectBtn = document.createElement('button');
    connectBtn.className = 'connect-btn';
    connectBtn.textContent = 'Connect';
    connectBtn.onclick = () => handleConnectClick(network);
    li.appendChild(connectBtn);

    if (passwordPromptSSID === network.ssid && network.security && network.security.toLowerCase() !== 'open' && network.security.toLowerCase() !== 'none') {
      li.appendChild(createPasswordUI(network.ssid));
    }

    wifiList.appendChild(li);
  });
}

function handleConnectClick(network) {
  if (!network.security || network.security.toLowerCase() === 'open' || network.security.toLowerCase() === 'none') {
    connectToNetwork(network.ssid, '');
  } else {
    passwordPromptSSID = network.ssid;
    scanNetworks();
  }
}

function createPasswordUI(ssid) {
  const pwDiv = document.createElement('div');
  pwDiv.className = 'password-ui';

  const pwInput = document.createElement('input');
  pwInput.type = 'password';
  pwInput.placeholder = 'WiFi Password';
  pwInput.autocomplete = 'current-password';

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'pw-actions';

  const pwConnectBtn = document.createElement('button');
  pwConnectBtn.className = 'pw-connect';
  pwConnectBtn.textContent = 'Connect';
  pwConnectBtn.onclick = () => {
    connectToNetwork(ssid, pwInput.value);
  };

  const pwCancelBtn = document.createElement('button');
  pwCancelBtn.className = 'pw-cancel';
  pwCancelBtn.textContent = 'Cancel';
  pwCancelBtn.onclick = () => {
    passwordPromptSSID = null;
    scanNetworks();
  };

  actionsDiv.appendChild(pwConnectBtn);
  actionsDiv.appendChild(pwCancelBtn);
  pwDiv.appendChild(pwInput);
  pwDiv.appendChild(actionsDiv);

  return pwDiv;
}

async function connectToNetwork(ssid, password) {
  setStatus('Connecting...');
  const result = await window.wifiAPI.connect(ssid, password);
  setStatus(result.success ? `Connected to ${ssid}!` : `Failed to connect: ${result.error}`);
  if (result.success) {
    passwordPromptSSID = null;
    setTimeout(scanNetworks, 1500);
  }
}

document.addEventListener('DOMContentLoaded', scanNetworks);