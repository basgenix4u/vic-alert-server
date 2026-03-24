const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Live data store ──────────────────────────────
let deviceData = {
  distance:      999,
  zone:          "SAFE",
  sosCount:      0,
  sosActive:     false,
  lastSosTime:   "Never",
  mapsLink:      "",
  weather:       "Fetching...",
  temperature:   0,
  humidity:      0,
  windSpeed:     0,
  weatherId:     800,
  weatherAlert:  "None",
  systemStatus:  "ACTIVE",
  lastUpdate:    "Never",
  ipAddress:     "",
  lat:           0,
  lng:           0,
  hasLocation:   false
};

let sosHistory = [];
let locationHistory = [];

// ── ESP32 sends data here ────────────────────────
app.post('/update', (req, res) => {
  const d = req.body;

  deviceData.distance     = parseFloat(d.distance)    || 999;
  deviceData.zone         = d.zone                    || "SAFE";
  deviceData.sosCount     = parseInt(d.sosCount)      || 0;
  deviceData.sosActive    = d.sosActive === "true";
  deviceData.mapsLink     = d.mapsLink                || "";
  deviceData.weather      = d.weather                 || "Unknown";
  deviceData.temperature  = parseFloat(d.temperature) || 0;
  deviceData.humidity     = parseFloat(d.humidity)    || 0;
  deviceData.windSpeed    = parseFloat(d.windSpeed)   || 0;
  deviceData.weatherId    = parseInt(d.weatherId)     || 800;
  deviceData.weatherAlert = d.weatherAlert            || "None";
  deviceData.systemStatus = d.systemStatus            || "ACTIVE";
  deviceData.ipAddress    = d.ipAddress               || "";
  deviceData.lastUpdate   = new Date().toLocaleTimeString(
                            'en-US', { hour12: true,
                            hour: '2-digit', minute: '2-digit',
                            second: '2-digit' });

  // Location
  const lat = parseFloat(d.lat);
  const lng = parseFloat(d.lng);
  if (lat && lng && lat !== 0 && lng !== 0) {
    deviceData.lat         = lat;
    deviceData.lng         = lng;
    deviceData.hasLocation = true;

    // Keep last 50 location points for trail
    locationHistory.push({ lat, lng,
      time: deviceData.lastUpdate });
    if (locationHistory.length > 50)
      locationHistory.shift();
  }

  // SOS history
  if (d.sosActive === "true") {
    sosHistory.unshift({
      time:     deviceData.lastUpdate,
      location: deviceData.mapsLink,
      lat:      deviceData.lat,
      lng:      deviceData.lng,
      count:    deviceData.sosCount
    });
    if (sosHistory.length > 20) sosHistory.pop();
  }

  res.json({ status: "ok" });
});

// ── Data API ─────────────────────────────────────
app.get('/data', (req, res) => {
  res.json({ ...deviceData, sosHistory, locationHistory });
});

// ── Dashboard ────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VIC Alert — Live Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
:root {
  --red:     #ed1c24;
  --white:   #fdfffc;
  --blue:    #235789;
  --yellow:  #f1d302;
  --dark:    #050810;
  --dark2:   #0a0f1e;
  --dark3:   #0f1628;
  --card:    #111827;
  --border:  rgba(35,87,137,0.3);
  --text:    #fdfffc;
  --muted:   rgba(253,255,252,0.45);
  --safe:    #00c853;
  --caution: #f1d302;
  --warning: #ff6d00;
  --danger:  #ed1c24;
  --critical:#8b0000;
}

* { margin:0; padding:0; box-sizing:border-box; }

html, body {
  height: 100%;
  background: var(--dark);
  color: var(--text);
  font-family: 'DM Sans', sans-serif;
  font-size: 14px;
  overflow-x: hidden;
}

/* ── Noise texture overlay ── */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

/* ── Top Navigation Bar ── */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  background: rgba(5,8,16,0.92);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 60px;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-logo {
  width: 36px; height: 36px;
  background: var(--red);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 20px;
  color: var(--white);
  letter-spacing: 1px;
  flex-shrink: 0;
}

.nav-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 20px;
  letter-spacing: 3px;
  color: var(--white);
}

.nav-subtitle {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.status-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(253,255,252,0.06);
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.pulse-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--safe);
  position: relative;
}

.pulse-dot::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: var(--safe);
  opacity: 0.3;
  animation: ripple 2s infinite;
}

.pulse-dot.offline {
  background: var(--red);
}

.pulse-dot.offline::after {
  background: var(--red);
  animation: none;
}

@keyframes ripple {
  0%   { transform: scale(1);   opacity: 0.4; }
  100% { transform: scale(2.5); opacity: 0; }
}

.update-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--muted);
}

/* ── Main Layout ── */
.layout {
  display: grid;
  grid-template-columns: 380px 1fr;
  grid-template-rows: 100vh;
  padding-top: 60px;
  position: relative;
  z-index: 1;
}

/* ── Left Sidebar ── */
.sidebar {
  background: var(--dark2);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
  padding-bottom: 24px;
}

/* ── Right Panel (Map) ── */
.map-panel {
  position: relative;
  background: var(--dark3);
}

#map {
  width: 100%;
  height: 100%;
}

/* Map overlay elements */
.map-overlay {
  position: absolute;
  z-index: 500;
  pointer-events: none;
}

.map-badge {
  top: 16px; left: 16px;
  background: rgba(5,8,16,0.88);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px 16px;
  pointer-events: auto;
}

.map-badge-label {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.map-badge-coords {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--yellow);
}

.map-sos-overlay {
  top: 16px; right: 16px;
  background: rgba(237,28,36,0.15);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(237,28,36,0.5);
  border-radius: 12px;
  padding: 12px 16px;
  display: none;
  pointer-events: auto;
}

.map-sos-overlay.active {
  display: block;
  animation: sosPulseOverlay 1s infinite;
}

@keyframes sosPulseOverlay {
  0%,100% { opacity: 1; }
  50%     { opacity: 0.6; }
}

.map-sos-text {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 18px;
  letter-spacing: 2px;
  color: var(--red);
}

.map-sos-sub {
  font-size: 11px;
  color: rgba(237,28,36,0.8);
  margin-top: 2px;
}

/* ── Section headers ── */
.section {
  padding: 20px 20px 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-label {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 500;
}

.section-line {
  flex: 1;
  height: 1px;
  background: var(--border);
  margin-left: 12px;
}

/* ── Distance Hero ── */
.distance-hero {
  padding: 20px;
  background: linear-gradient(135deg,
    rgba(35,87,137,0.15) 0%,
    rgba(5,8,16,0) 100%);
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.distance-hero::before {
  content: '';
  position: absolute;
  top: -40px; right: -40px;
  width: 150px; height: 150px;
  background: radial-gradient(circle,
    rgba(35,87,137,0.2) 0%,
    transparent 70%);
  pointer-events: none;
}

.dist-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 16px;
}

.dist-number {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 72px;
  line-height: 1;
  color: var(--white);
  transition: color 0.4s;
}

.dist-unit {
  font-size: 16px;
  color: var(--muted);
  margin-bottom: 10px;
  font-weight: 300;
}

/* Distance bar */
.dist-bar-track {
  height: 6px;
  background: rgba(253,255,252,0.08);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 8px;
}

.dist-bar-fill {
  height: 100%;
  border-radius: 100px;
  background: var(--safe);
  transition: width 0.4s ease, background 0.4s ease;
  width: 0%;
}

.dist-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--muted);
  font-family: 'JetBrains Mono', monospace;
}

/* ── Zone Badge ── */
.zone-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.zone-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zone-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  background: var(--safe);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  transition: background 0.4s;
}

.zone-info {
  flex: 1;
}

.zone-name {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 28px;
  letter-spacing: 2px;
  line-height: 1;
  color: var(--white);
  transition: color 0.4s;
}

.zone-desc {
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
}

.zone-pill {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: var(--safe);
  color: var(--dark);
  transition: background 0.4s;
}

/* ── SOS Panel ── */
.sos-panel {
  margin: 16px 20px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(253,255,252,0.03);
  overflow: hidden;
  transition: all 0.4s;
}

.sos-panel.sos-active {
  border-color: var(--red);
  background: rgba(237,28,36,0.08);
  animation: sosBorder 1s infinite;
}

@keyframes sosBorder {
  0%,100% { border-color: var(--red); }
  50%     { border-color: rgba(237,28,36,0.3); }
}

.sos-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.sos-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sos-indicator {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--safe);
  transition: background 0.3s;
}

.sos-indicator.active {
  background: var(--red);
  box-shadow: 0 0 12px var(--red);
  animation: sosGlow 0.8s infinite;
}

@keyframes sosGlow {
  0%,100% { box-shadow: 0 0 12px var(--red); }
  50%     { box-shadow: 0 0 24px var(--red), 0 0 40px rgba(237,28,36,0.3); }
}

.sos-header-title {
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}

.sos-count-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  background: rgba(253,255,252,0.06);
  border: 1px solid var(--border);
  padding: 3px 8px;
  border-radius: 100px;
  color: var(--muted);
}

.sos-body {
  padding: 14px 16px;
}

.sos-status-text {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 24px;
  letter-spacing: 2px;
  color: var(--safe);
  transition: color 0.3s;
}

.sos-status-text.alert {
  color: var(--red);
}

.sos-last {
  font-size: 11px;
  color: var(--muted);
  margin-top: 4px;
  font-family: 'JetBrains Mono', monospace;
}

.sos-map-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 14px;
  background: var(--blue);
  color: var(--white);
  border-radius: 8px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.2s;
}

.sos-map-btn:hover { background: #2d6fad; }

/* ── Weather Panel ── */
.weather-panel {
  margin: 0 20px 16px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: rgba(253,255,252,0.03);
  overflow: hidden;
}

.weather-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.weather-header-label {
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 500;
}

.weather-header-loc {
  font-size: 11px;
  color: var(--yellow);
  font-family: 'JetBrains Mono', monospace;
}

.weather-body {
  padding: 16px;
}

.weather-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
}

.weather-temp-big {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 56px;
  line-height: 1;
  color: var(--yellow);
}

.weather-temp-unit {
  font-size: 20px;
  color: var(--muted);
  font-weight: 300;
}

.weather-icon-big {
  font-size: 48px;
  line-height: 1;
}

.weather-desc-text {
  font-size: 13px;
  color: var(--muted);
  text-transform: capitalize;
  margin-top: 4px;
  font-weight: 300;
}

.weather-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.weather-stat {
  background: rgba(253,255,252,0.04);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
}

.weather-stat-label {
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.weather-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  color: var(--white);
  margin-top: 2px;
}

.weather-alert-banner {
  display: none;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
}

.weather-alert-banner.show-safe {
  display: block;
  background: rgba(0,200,83,0.1);
  border: 1px solid rgba(0,200,83,0.3);
  color: #69f0ae;
}

.weather-alert-banner.show-danger {
  display: block;
  background: rgba(237,28,36,0.1);
  border: 1px solid rgba(237,28,36,0.4);
  color: #ff8a80;
  animation: alertPulse 2s infinite;
}

@keyframes alertPulse {
  0%,100% { border-color: rgba(237,28,36,0.4); }
  50%     { border-color: rgba(237,28,36,0.9); }
}

/* ── SOS History ── */
.history-section {
  padding: 0 20px 20px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  background: rgba(253,255,252,0.03);
  border: 1px solid var(--border);
  border-left: 3px solid var(--red);
  border-radius: 0 8px 8px 0;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-item-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.history-item-num {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 16px;
  letter-spacing: 1px;
  color: var(--red);
}

.history-item-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--muted);
}

.history-loc-btn {
  padding: 5px 10px;
  background: rgba(35,87,137,0.3);
  border: 1px solid rgba(35,87,137,0.5);
  color: #64b5f6;
  border-radius: 6px;
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: background 0.2s;
}

.history-loc-btn:hover {
  background: rgba(35,87,137,0.6);
}

.no-events {
  text-align: center;
  padding: 20px;
  color: var(--muted);
  font-size: 12px;
  border: 1px dashed var(--border);
  border-radius: 8px;
}

/* ── Leaflet custom marker ── */
.vic-marker {
  width: 20px; height: 20px;
  background: var(--red);
  border: 3px solid var(--white);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(237,28,36,0.3),
              0 2px 8px rgba(0,0,0,0.5);
  animation: markerPulse 2s infinite;
}

@keyframes markerPulse {
  0%,100% { box-shadow: 0 0 0 4px rgba(237,28,36,0.3),
                        0 2px 8px rgba(0,0,0,0.5); }
  50%     { box-shadow: 0 0 0 10px rgba(237,28,36,0.1),
                        0 2px 8px rgba(0,0,0,0.5); }
}

.vic-marker.sos {
  background: var(--red);
  animation: sosMarker 0.5s infinite;
}

@keyframes sosMarker {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.4); }
}

/* Leaflet overrides */
.leaflet-container {
  background: #0d1117;
  font-family: 'DM Sans', sans-serif;
}

.leaflet-control-zoom a {
  background: var(--card) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

.leaflet-control-attribution {
  background: rgba(5,8,16,0.7) !important;
  color: rgba(253,255,252,0.3) !important;
  font-size: 9px !important;
}

/* ── Animations ── */
@keyframes fadeSlideIn {
  from { opacity:0; transform: translateY(8px); }
  to   { opacity:1; transform: translateY(0); }
}

.sidebar > * {
  animation: fadeSlideIn 0.5s ease both;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 60vh;
  }
  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: 55vh;
  }
  .navbar { padding: 0 14px; }
  .nav-subtitle { display: none; }
}
</style>
</head>
<body>

<!-- ── Navbar ── -->
<nav class="navbar">
  <div class="nav-brand">
    <div class="nav-logo">VIC</div>
    <div>
      <div class="nav-title">VIC ALERT SYSTEM</div>
      <div class="nav-subtitle">
        IoT Wearable — Visually Impaired Individuals
      </div>
    </div>
  </div>
  <div class="nav-right">
    <span class="status-chip">
      <span class="pulse-dot" id="statusDot"></span>
      <span id="statusText">Connecting</span>
    </span>
    <span class="update-time" id="updateTime">—</span>
  </div>
</nav>

<!-- ── Main Layout ── -->
<div class="layout">

  <!-- ── Left Sidebar ── -->
  <aside class="sidebar">

    <!-- Distance Hero -->
    <div class="distance-hero">
      <div class="section-head" style="margin-bottom:12px">
        <span class="section-label">Obstacle Detection</span>
      </div>
      <div class="dist-row">
        <span class="dist-number" id="distNum">—</span>
        <span class="dist-unit" id="distUnit">cm</span>
      </div>
      <div class="dist-bar-track">
        <div class="dist-bar-fill" id="distBar"></div>
      </div>
      <div class="dist-bar-labels">
        <span>0 cm</span>
        <span>150 cm</span>
        <span>300 cm</span>
      </div>
    </div>

    <!-- Zone -->
    <div class="zone-section">
      <div class="zone-display">
        <div class="zone-icon" id="zoneIcon">✅</div>
        <div class="zone-info">
          <div class="zone-name" id="zoneName">SAFE</div>
          <div class="zone-desc" id="zoneDesc">
            No obstacles detected
          </div>
        </div>
        <div class="zone-pill" id="zonePill">SAFE</div>
      </div>
    </div>

    <!-- SOS -->
    <div class="section" style="padding-bottom:0">
      <div class="sos-panel" id="sosPanel">
        <div class="sos-header">
          <div class="sos-header-left">
            <div class="sos-indicator" id="sosIndicator"></div>
            <span class="sos-header-title">
              Emergency Status
            </span>
          </div>
          <span class="sos-count-chip" id="sosCountChip">
            0 events
          </span>
        </div>
        <div class="sos-body">
          <div class="sos-status-text" id="sosStatusText">
            System Normal
          </div>
          <div class="sos-last" id="sosLastTime">
            Last SOS: Never
          </div>
          <div id="sosMapBtnContainer"></div>
        </div>
      </div>
    </div>

    <!-- Weather -->
    <div class="section" style="padding-bottom:0">
      <div class="section-head">
        <span class="section-label">Live Weather</span>
        <div class="section-line"></div>
      </div>
      <div class="weather-panel">
        <div class="weather-header">
          <span class="weather-header-label">
            Conditions
          </span>
          <span class="weather-header-loc" id="weatherLoc">
            Lagos, NG
          </span>
        </div>
        <div class="weather-body">
          <div class="weather-main">
            <div>
              <div>
                <span class="weather-temp-big" id="wTemp">
                  —
                </span>
                <span class="weather-temp-unit">°C</span>
              </div>
              <div class="weather-desc-text" id="wDesc">
                Fetching...
              </div>
            </div>
            <div class="weather-icon-big" id="wIcon">
              🌤
            </div>
          </div>
          <div class="weather-stats">
            <div class="weather-stat">
              <div class="weather-stat-label">Humidity</div>
              <div class="weather-stat-value"
                   id="wHumidity">—%</div>
            </div>
            <div class="weather-stat">
              <div class="weather-stat-label">Wind</div>
              <div class="weather-stat-value"
                   id="wWind">— m/s</div>
            </div>
          </div>
          <div class="weather-alert-banner"
               id="weatherAlertBanner">
            Weather conditions are safe
          </div>
        </div>
      </div>
    </div>

    <!-- SOS History -->
    <div class="history-section" style="margin-top:16px">
      <div class="section-head">
        <span class="section-label">SOS Event History</span>
        <div class="section-line"></div>
      </div>
      <div class="history-list" id="historyList">
        <div class="no-events">No SOS events recorded yet</div>
      </div>
    </div>

  </aside>

  <!-- ── Map Panel ── -->
  <div class="map-panel">
    <div id="map"></div>

    <!-- Coordinates overlay -->
    <div class="map-overlay map-badge" id="coordsBadge">
      <div class="map-badge-label">Last Known Position</div>
      <div class="map-badge-coords" id="coordsText">
        Waiting for GPS...
      </div>
    </div>

    <!-- SOS overlay on map -->
    <div class="map-overlay map-sos-overlay"
         id="mapSosOverlay">
      <div class="map-sos-text">🚨 SOS ACTIVE</div>
      <div class="map-sos-sub">Emergency in progress</div>
    </div>
  </div>

</div>

<script>
// ── Color palette ────────────────────────────────
const ZONE_CONFIG = {
  'SAFE':     { color:'#00c853', icon:'✅',
                desc:'No obstacles detected',   bar:'#00c853' },
  'CAUTION':  { color:'#f1d302', icon:'⚠️',
                desc:'Obstacle at 100–150 cm',  bar:'#f1d302' },
  'WARNING':  { color:'#ff6d00', icon:'⚡',
                desc:'Obstacle at 50–100 cm',   bar:'#ff6d00' },
  'DANGER':   { color:'#ed1c24', icon:'🚨',
                desc:'Obstacle at 20–50 cm',    bar:'#ed1c24' },
  'CRITICAL': { color:'#8b0000', icon:'🔴',
                desc:'Obstacle under 20 cm!',   bar:'#8b0000' }
};

const WEATHER_ICONS = {
  2: '⛈', 3: '🌧', 5: '🌧', 6: '❄️',
  7: '🌫', 8: '⛅', 80: '🌤'
};

function getWeatherIcon(id) {
  const key = Math.floor(id / 100);
  if (id === 800) return '☀️';
  if (id === 801) return '🌤';
  if (id >= 802) return '☁️';
  return WEATHER_ICONS[key] || '🌤';
}

// ── Leaflet Map Setup ────────────────────────────
const map = L.map('map', {
  center: [6.5244, 3.3792], // Lagos default
  zoom: 15,
  zoomControl: true,
  attributionControl: true
});

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    attribution: '© OpenStreetMap © CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  }
).addTo(map);

// Custom marker icon
const vicIcon = L.divIcon({
  html: '<div class="vic-marker"></div>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const vicIconSOS = L.divIcon({
  html: '<div class="vic-marker sos"></div>',
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

let deviceMarker   = null;
let locationTrail  = null;
let trailPoints    = [];
let hasSetInitial  = false;
let lastUpdateTime = 0;

// SOS markers layer
const sosMarkers = L.layerGroup().addTo(map);

function updateMarker(lat, lng, isSOS) {
  const icon = isSOS ? vicIconSOS : vicIcon;

  if (!deviceMarker) {
    deviceMarker = L.marker([lat, lng], { icon })
                    .addTo(map);
  } else {
    deviceMarker.setLatLng([lat, lng]);
    deviceMarker.setIcon(icon);
  }

  if (!hasSetInitial) {
    map.setView([lat, lng], 16);
    hasSetInitial = true;
  }

  // Update trail
  trailPoints.push([lat, lng]);
  if (trailPoints.length > 100) trailPoints.shift();

  if (locationTrail) {
    map.removeLayer(locationTrail);
  }

  if (trailPoints.length > 1) {
    locationTrail = L.polyline(trailPoints, {
      color:   '#235789',
      weight:  3,
      opacity: 0.6,
      dashArray: '6 4'
    }).addTo(map);
  }

  // Update coords badge
  document.getElementById('coordsText').textContent =
    lat.toFixed(6) + ', ' + lng.toFixed(6);
}

// ── DOM refs ─────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Main data fetch ──────────────────────────────
async function fetchData() {
  try {
    const res  = await fetch('/data');
    const data = await res.json();

    lastUpdateTime = Date.now();

    // Navbar status
    $('statusDot').classList.remove('offline');
    $('statusText').textContent = 'Live';
    $('updateTime').textContent = data.lastUpdate;

    // ── Distance ──────────────────────────────────
    const dist = parseFloat(data.distance);
    const isClear = dist >= 999;
    $('distNum').textContent = isClear ? 'CLEAR' :
                               dist.toFixed(1);
    $('distUnit').textContent = isClear ? '' : 'cm';

    const pct = isClear ? 0 :
                Math.max(0, Math.min(100,
                  (1 - dist/300) * 100));
    const zone = data.zone || 'SAFE';
    const cfg  = ZONE_CONFIG[zone] || ZONE_CONFIG['SAFE'];

    $('distBar').style.width      = pct + '%';
    $('distBar').style.background = cfg.bar;
    $('distNum').style.color      = isClear ?
                                    '#fdfffc' : cfg.color;

    // ── Zone ──────────────────────────────────────
    $('zoneIcon').textContent         = cfg.icon;
    $('zoneIcon').style.background    = cfg.color + '22';
    $('zoneName').textContent         = zone;
    $('zoneName').style.color         = cfg.color;
    $('zoneDesc').textContent         = cfg.desc;
    $('zonePill').textContent         = zone;
    $('zonePill').style.background    = cfg.color;
    $('zonePill').style.color         =
      (zone === 'CAUTION') ? '#050810' : '#fdfffc';

    // ── SOS ───────────────────────────────────────
    const sos = data.sosActive;
    const sosPanel = $('sosPanel');
    const sosInd   = $('sosIndicator');
    const sosTxt   = $('sosStatusText');
    const mapSosOv = $('mapSosOverlay');

    if (sos) {
      sosPanel.classList.add('sos-active');
      sosInd.classList.add('active');
      sosTxt.textContent = '🚨 EMERGENCY ACTIVE';
      sosTxt.classList.add('alert');
      mapSosOv.classList.add('active');
      if (deviceMarker) deviceMarker.setIcon(vicIconSOS);
    } else {
      sosPanel.classList.remove('sos-active');
      sosInd.classList.remove('active');
      sosTxt.textContent = 'System Normal';
      sosTxt.classList.remove('alert');
      mapSosOv.classList.remove('active');
      if (deviceMarker) deviceMarker.setIcon(vicIcon);
    }

    $('sosCountChip').textContent =
      data.sosCount + ' event' +
      (data.sosCount !== 1 ? 's' : '');
    $('sosLastTime').textContent =
      'Last SOS: ' + (data.lastSosTime || 'Never');

    // Maps button
    const mc = $('sosMapBtnContainer');
    if (data.mapsLink && data.mapsLink !== '') {
      mc.innerHTML =
        '<a class="sos-map-btn" href="' +
        data.mapsLink +
        '" target="_blank">📍 Open Location in Maps</a>';
    } else {
      mc.innerHTML = '';
    }

    // ── Weather ───────────────────────────────────
    $('wTemp').textContent    = data.temperature
                                ? data.temperature.toFixed(1)
                                : '—';
    $('wDesc').textContent    = data.weather || 'Unknown';
    $('wIcon').textContent    = getWeatherIcon(
                                  data.weatherId || 800);
    $('wHumidity').textContent = (data.humidity || 0) + '%';
    $('wWind').textContent     =
      (data.windSpeed || 0).toFixed(1) + ' m/s';

    const alertBanner = $('weatherAlertBanner');
    if (data.weatherAlert && data.weatherAlert !== 'None') {
      alertBanner.textContent = '⚠ ' + data.weatherAlert;
      alertBanner.className   =
        'weather-alert-banner show-danger';
    } else if (data.weather && data.weather !== 'Fetching...') {
      alertBanner.textContent = '✓ Conditions safe for travel';
      alertBanner.className   =
        'weather-alert-banner show-safe';
    }

    // ── Map location ──────────────────────────────
    const lat = parseFloat(data.lat);
    const lng = parseFloat(data.lng);
    if (data.hasLocation && lat && lng) {
      updateMarker(lat, lng, sos);
    }

    // SOS markers on map
    sosMarkers.clearLayers();
    if (data.sosHistory && data.sosHistory.length > 0) {
      data.sosHistory.forEach((ev, i) => {
        if (ev.lat && ev.lng) {
          const m = L.circleMarker([ev.lat, ev.lng], {
            radius:      8,
            fillColor:   '#ed1c24',
            color:       '#fdfffc',
            weight:      2,
            opacity:     1,
            fillOpacity: 0.8
          }).addTo(sosMarkers);
          m.bindPopup(
            '<b style="color:#ed1c24">SOS #' +
            ev.count + '</b><br>' +
            '<span style="font-size:11px">' +
            ev.time + '</span>'
          );
        }
      });
    }

    // ── SOS History List ──────────────────────────
    const hist    = data.sosHistory || [];
    const histDiv = $('historyList');
    if (hist.length === 0) {
      histDiv.innerHTML =
        '<div class="no-events">' +
        'No SOS events recorded yet</div>';
    } else {
      histDiv.innerHTML = hist.map(h => {
        const locBtn = h.location
          ? '<a class="history-loc-btn" href="' +
            h.location +
            '" target="_blank">View Map</a>'
          : '<span style="color:#333;font-size:11px">' +
            'No GPS</span>';
        return '<div class="history-item">' +
          '<div class="history-item-left">' +
          '<span class="history-item-num">SOS #' +
          h.count + '</span>' +
          '<span class="history-item-time">' +
          h.time + '</span>' +
          '</div>' + locBtn + '</div>';
      }).join('');
    }

  } catch(e) {
    $('statusDot').classList.add('offline');
    $('statusText').textContent = 'Offline';
  }
}

// Refresh every 3 seconds
fetchData();
setInterval(fetchData, 3000);

// Offline detector
setInterval(() => {
  if (lastUpdateTime > 0 &&
      Date.now() - lastUpdateTime > 15000) {
    $('statusDot').classList.add('offline');
    $('statusText').textContent = 'Device Offline';
  }
}, 5000);
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('VIC Alert Server on port ' + PORT);
});
