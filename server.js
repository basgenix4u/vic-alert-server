const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Live data store ──────────────────────────────
let deviceData = {
  distance:     999,
  zone:         "SAFE",
  sosCount:     0,
  sosActive:    false,
  lastSosTime:  "Never",
  mapsLink:     "",
  weather:      "Fetching...",
  temperature:  0,
  weatherAlert: "None",
  systemStatus: "ACTIVE",
  lastUpdate:   "Never",
  ipAddress:    ""
};

let sosHistory = [];

// ── ESP32 sends data here ────────────────────────
app.post('/update', (req, res) => {
  const d = req.body;

  deviceData.distance     = parseFloat(d.distance)     || 999;
  deviceData.zone         = d.zone                     || "SAFE";
  deviceData.sosCount     = parseInt(d.sosCount)       || 0;
  deviceData.sosActive    = d.sosActive === "true";
  deviceData.mapsLink     = d.mapsLink                 || "";
  deviceData.weather      = d.weather                  || "Unknown";
  deviceData.temperature  = parseFloat(d.temperature)  || 0;
  deviceData.weatherAlert = d.weatherAlert             || "None";
  deviceData.systemStatus = d.systemStatus             || "ACTIVE";
  deviceData.ipAddress    = d.ipAddress                || "";
  deviceData.lastUpdate   = new Date().toLocaleTimeString(
                            'en-US', { hour12: true });

  if (d.sosActive === "true") {
    sosHistory.unshift({
      time:     deviceData.lastUpdate,
      location: deviceData.mapsLink,
      count:    deviceData.sosCount
    });
    if (sosHistory.length > 10) sosHistory.pop();
  }

  res.json({ status: "ok" });
});

// ── Dashboard data API ───────────────────────────
app.get('/data', (req, res) => {
  res.json({ ...deviceData, sosHistory });
});

// ── Beautiful web dashboard ──────────────────────
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>VIC Alert System — Live Dashboard</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #0a0a1a;
  color: #ffffff;
  min-height: 100vh;
}
.topbar {
  background: linear-gradient(135deg, #0d47a1, #1565c0);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0,0,0,0.4);
}
.topbar h1 {
  font-size: 18px;
  letter-spacing: 2px;
  color: #fff;
}
.topbar .subtitle {
  font-size: 11px;
  color: #90caf9;
  margin-top: 2px;
}
.status-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.1);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
}
.dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #4caf50;
  animation: blink 1.5s infinite;
}
.dot.offline { background: #f44336; animation: none; }
@keyframes blink {
  0%,100%{opacity:1} 50%{opacity:0.3}
}
.container {
  max-width: 700px;
  margin: 0 auto;
  padding: 16px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}
.card {
  background: #111128;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #1e1e4a;
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  right: 0; height: 3px;
  border-radius: 16px 16px 0 0;
}
.card.blue::before   { background: #2196f3; }
.card.green::before  { background: #4caf50; }
.card.orange::before { background: #ff9800; }
.card.red::before    { background: #f44336; }
.card.purple::before { background: #9c27b0; }
.card.yellow::before { background: #ffc107; }
.card.full { grid-column: span 2; }
.card-label {
  font-size: 10px;
  color: #666;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 12px;
}
.card-value {
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}
.card-unit {
  font-size: 12px;
  color: #555;
  margin-top: 6px;
}
.zone-badge {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
}
.sos-box {
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #1e1e4a;
  margin-bottom: 12px;
  text-align: center;
  transition: background 0.3s;
}
.sos-box.normal  { background: #0d2b0d; border-color: #1b5e20; }
.sos-box.alert   { background: #2b0d0d; border-color: #b71c1c;
                   animation: sosFlash 1s infinite; }
@keyframes sosFlash {
  0%,100%{opacity:1} 50%{opacity:0.7}
}
.sos-title {
  font-size: 11px; color: #888;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.sos-status {
  font-size: 22px;
  font-weight: 700;
}
.sos-detail {
  font-size: 12px;
  color: #aaa;
  margin-top: 6px;
}
.map-btn {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 24px;
  background: #1565c0;
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
}
.map-btn:hover { background: #1976d2; }
.weather-card {
  background: #111128;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #1e1e4a;
  margin-bottom: 12px;
}
.weather-card::before {
  content: '';
  display: block;
  height: 3px;
  background: #ffc107;
  border-radius: 8px;
  margin-bottom: 16px;
}
.weather-temp {
  font-size: 48px;
  font-weight: 700;
  color: #ffd54f;
}
.weather-desc {
  font-size: 14px;
  color: #888;
  margin-top: 4px;
  text-transform: capitalize;
}
.weather-alert-pill {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}
.alert-safe   { background: #1b5e20; color: #a5d6a7; }
.alert-danger { background: #b71c1c; color: #ffcdd2; }
.history-card {
  background: #111128;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #1e1e4a;
  margin-bottom: 12px;
}
.history-card .card-label {
  margin-bottom: 14px;
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #1e1e3a;
  font-size: 13px;
}
.history-item:last-child { border-bottom: none; }
.history-time { color: #aaa; }
.history-link {
  color: #64b5f6;
  text-decoration: none;
  font-size: 12px;
}
.no-history {
  color: #444;
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}
.update-bar {
  text-align: center;
  font-size: 11px;
  color: #333;
  padding: 8px;
  margin-bottom: 4px;
}
.footer {
  text-align: center;
  padding: 20px;
  font-size: 11px;
  color: #333;
  border-top: 1px solid #111;
  margin-top: 8px;
}
</style>
</head>
<body>

<div class="topbar">
  <div>
    <h1>VIC ALERT SYSTEM</h1>
    <div class="subtitle">
      IoT Wearable — Visually Impaired Individuals
    </div>
  </div>
  <div class="status-pill">
    <div class="dot" id="statusDot"></div>
    <span id="statusText">Connecting...</span>
  </div>
</div>

<div class="container">

  <div class="update-bar" id="updateBar">
    Last update: —
  </div>

  <!-- Distance and Zone -->
  <div class="grid">
    <div class="card blue">
      <div class="card-label">Obstacle Distance</div>
      <div class="card-value" id="distance">—</div>
      <div class="card-unit">centimetres</div>
    </div>
    <div class="card green">
      <div class="card-label">Alert Zone</div>
      <div style="margin-top:4px">
        <span class="zone-badge" id="zoneBadge">—</span>
      </div>
    </div>
  </div>

  <!-- SOS Status -->
  <div class="sos-box normal" id="sosBox">
    <div class="sos-title">Emergency Status</div>
    <div class="sos-status" id="sosStatus">System Normal</div>
    <div class="sos-detail" id="sosDetail">
      Total SOS activations: 0
    </div>
    <div class="sos-detail" id="lastSosTime"></div>
    <div id="mapsBtnContainer"></div>
  </div>

  <!-- Weather -->
  <div class="weather-card">
    <div style="display:flex;
                justify-content:space-between;
                align-items:flex-start">
      <div>
        <div class="card-label">
          Live Weather — Lagos, Nigeria
        </div>
        <div class="weather-temp" id="weatherTemp">—°C</div>
        <div class="weather-desc" id="weatherDesc">
          Fetching weather...
        </div>
      </div>
      <div>
        <span class="weather-alert-pill alert-safe"
              id="weatherAlert">
          Checking...
        </span>
      </div>
    </div>
  </div>

  <!-- System Info -->
  <div class="grid">
    <div class="card purple">
      <div class="card-label">System Status</div>
      <div class="card-value"
           style="font-size:18px"
           id="systemStatus">—</div>
    </div>
    <div class="card orange">
      <div class="card-label">SOS Count</div>
      <div class="card-value" id="sosCount">0</div>
      <div class="card-unit">total activations</div>
    </div>
  </div>

  <!-- SOS History -->
  <div class="history-card">
    <div class="card-label">SOS Event History</div>
    <div id="sosHistory">
      <div class="no-history">No SOS events yet</div>
    </div>
  </div>

</div>

<div class="footer">
  VIC Alert System v1.0 &nbsp;|&nbsp;
  Computer Science Department &nbsp;|&nbsp;
  IoT Wearable Assistive Device
</div>

<script>
const zoneColors = {
  'SAFE':     '#27ae60',
  'CAUTION':  '#f39c12',
  'WARNING':  '#e67e22',
  'DANGER':   '#e74c3c',
  'CRITICAL': '#c0392b',
  '** EMERGENCY **': '#8e44ad'
};

let lastUpdateTime = 0;

async function fetchData() {
  try {
    const res  = await fetch('/data');
    const data = await res.json();

    lastUpdateTime = Date.now();

    // Status dot
    document.getElementById('statusDot')
            .classList.remove('offline');
    document.getElementById('statusText')
            .textContent = 'Live';
    document.getElementById('updateBar')
            .textContent = 'Last update: ' + data.lastUpdate;

    // Distance
    const dist = parseFloat(data.distance);
    document.getElementById('distance').textContent =
      (dist >= 999) ? 'Clear' : dist.toFixed(1) + ' cm';

    // Zone
    const zone = data.zone || 'SAFE';
    const zb   = document.getElementById('zoneBadge');
    zb.textContent        = zone;
    zb.style.background   = zoneColors[zone] || '#27ae60';
    zb.style.color        = '#fff';
    zb.style.padding      = '8px 20px';
    zb.style.borderRadius = '25px';

    // SOS box
    const sosBox = document.getElementById('sosBox');
    const sosSt  = document.getElementById('sosStatus');
    if (data.sosActive) {
      sosBox.className  = 'sos-box alert';
      sosSt.textContent = '🚨 EMERGENCY ACTIVE';
      sosSt.style.color = '#ff5252';
    } else {
      sosBox.className  = 'sos-box normal';
      sosSt.textContent = 'System Normal';
      sosSt.style.color = '#69f0ae';
    }
    document.getElementById('sosDetail').textContent =
      'Total SOS activations: ' + data.sosCount;
    document.getElementById('lastSosTime').textContent =
      data.lastSosTime !== 'Never'
      ? 'Last: ' + data.lastSosTime : '';

    // Maps button
    const mc = document.getElementById('mapsBtnContainer');
    if (data.mapsLink && data.mapsLink !== '') {
      mc.innerHTML =
        '<a class="map-btn" href="' + data.mapsLink +
        '" target="_blank">Open Google Maps Location</a>';
    } else {
      mc.innerHTML = '';
    }

    // Weather
    document.getElementById('weatherTemp').textContent =
      data.temperature.toFixed(1) + '°C';
    document.getElementById('weatherDesc').textContent =
      data.weather;

    const wa = document.getElementById('weatherAlert');
    if (data.weatherAlert && data.weatherAlert !== 'None') {
      wa.textContent  = data.weatherAlert;
      wa.className    = 'weather-alert-pill alert-danger';
    } else {
      wa.textContent  = 'Weather Safe';
      wa.className    = 'weather-alert-pill alert-safe';
    }

    // System status
    document.getElementById('systemStatus').textContent =
      data.systemStatus;
    document.getElementById('sosCount').textContent =
      data.sosCount;

    // SOS History
    const hist    = data.sosHistory || [];
    const histDiv = document.getElementById('sosHistory');
    if (hist.length === 0) {
      histDiv.innerHTML =
        '<div class="no-history">No SOS events yet</div>';
    } else {
      histDiv.innerHTML = hist.map(h => {
        const locBtn = h.location
          ? '<a class="history-link" href="' +
            h.location +
            '" target="_blank">View Location</a>'
          : '<span style="color:#444">No location</span>';
        return '<div class="history-item">' +
          '<span class="history-time">SOS #' +
          h.count + ' — ' + h.time + '</span>' +
          locBtn + '</div>';
      }).join('');
    }

  } catch(e) {
    // Device offline
    const dot = document.getElementById('statusDot');
    dot.classList.add('offline');
    document.getElementById('statusText')
            .textContent = 'Offline';
  }
}

// Fetch data every 3 seconds
fetchData();
setInterval(fetchData, 3000);

// Check if device went offline
setInterval(() => {
  if (lastUpdateTime > 0 &&
      Date.now() - lastUpdateTime > 15000) {
    document.getElementById('statusDot')
            .classList.add('offline');
    document.getElementById('statusText')
            .textContent = 'Device Offline';
  }
}, 5000);
</script>
</body>
</html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('VIC Alert Server running on port ' + PORT);
  console.log('Dashboard: http://localhost:' + PORT);
});

