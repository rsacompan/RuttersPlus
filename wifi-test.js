const wifi = require('node-wifi');
wifi.init({ iface: null });
wifi.scan()
  .then(networks => console.log('Networks:', networks))
  .catch(err => console.error('Scan error:', err));