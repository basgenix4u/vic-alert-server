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

  const lat = parseFloat(d.lat);
  const lng = parseFloat(d.lng);
  if (lat && lng && lat !== 0 && lng !== 0) {
    deviceData.lat         = lat;
    deviceData.lng         = lng;
    deviceData.hasLocation = true;

    locationHistory.push({ lat, lng,
      time: deviceData.lastUpdate });
    if (locationHistory.length > 50)
      locationHistory.shift();
  }

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
<title>VIC Alert — Intelligent Safety Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
/* ══════════════════════════════════════════════════
   VIC ALERT SYSTEM — PREMIUM DASHBOARD v2.0
   Designer: Okechukwu Victor Nnaogo
   ══════════════════════════════════════════════════ */

:root {
  --bg-primary:    #06080d;
  --bg-secondary:  #0b0f19;
  --bg-tertiary:   #101624;
  --bg-card:       #0d1220;
  --bg-card-hover: #111827;
  --bg-elevated:   #141c2e;
  
  --accent-blue:    #3b82f6;
  --accent-cyan:    #06b6d4;
  --accent-purple:  #8b5cf6;
  --accent-pink:    #ec4899;
  --accent-indigo:  #6366f1;
  
  --safe:      #10b981;
  --safe-dim:  rgba(16,185,129,0.12);
  --caution:   #f59e0b;
  --caution-dim: rgba(245,158,11,0.12);
  --warning:   #f97316;
  --warning-dim: rgba(249,115,22,0.12);
  --danger:    #ef4444;
  --danger-dim: rgba(239,68,68,0.12);
  --critical:  #dc2626;
  --critical-dim: rgba(220,38,38,0.12);
  
  --text-primary:    #f1f5f9;
  --text-secondary:  #94a3b8;
  --text-tertiary:   #64748b;
  --text-quaternary: #475569;
  
  --border:         rgba(148,163,184,0.08);
  --border-light:   rgba(148,163,184,0.12);
  --border-accent:  rgba(59,130,246,0.25);
  
  --glass:          rgba(11,15,25,0.85);
  --glass-light:    rgba(255,255,255,0.03);
  --glass-lighter:  rgba(255,255,255,0.06);
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-xl: 0 16px 48px rgba(0,0,0,0.6);
  --shadow-glow-blue: 0 0 40px rgba(59,130,246,0.15);
  --shadow-glow-red: 0 0 40px rgba(239,68,68,0.2);
  --shadow-glow-green: 0 0 40px rgba(16,185,129,0.15);
}

* { margin:0; padding:0; box-sizing:border-box; }

html { 
  height: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  height: 100%;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 14px;
  overflow-x: hidden;
  line-height: 1.5;
}

/* ── Animated background ── */
body::before {
  content: '';
  position: fixed;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: 
    radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(6,182,212,0.04) 0%, transparent 50%);
  animation: bgShift 30s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
}

@keyframes bgShift {
  0%   { transform: translate(0, 0) rotate(0deg); }
  33%  { transform: translate(-2%, 1%) rotate(1deg); }
  66%  { transform: translate(1%, -1%) rotate(-0.5deg); }
  100% { transform: translate(-1%, 2%) rotate(0.5deg); }
}

/* Fine grain texture */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.8;
}

/* ══════════════════════════════════════════════
   TOP NAVIGATION BAR
   ══════════════════════════════════════════════ */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 1000;
  height: 64px;
  background: rgba(6,8,13,0.88);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  transition: all 0.3s ease;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.nav-logo-container {
  position: relative;
}

.nav-logo {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: white;
  letter-spacing: 1px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(239,68,68,0.3);
}

.nav-logo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%);
  border-radius: inherit;
}

.nav-logo-ring {
  position: absolute;
  inset: -2px;
  border: 2px solid rgba(239,68,68,0.3);
  border-radius: 12px;
  animation: logoRing 3s ease-in-out infinite;
}

@keyframes logoRing {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 0.6; transform: scale(1.05); }
}

.nav-text {
  display: flex;
  flex-direction: column;
}

.nav-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--text-primary);
  line-height: 1.1;
}

.nav-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
  letter-spacing: 0.5px;
  font-weight: 400;
  margin-top: 2px;
}

.nav-center {
  display: flex;
  align-items: center;
  gap: 6px;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.nav-tab {
  padding: 6px 16px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  user-select: none;
}

.nav-tab:hover {
  color: var(--text-secondary);
  background: var(--glass-lighter);
}

.nav-tab.active {
  color: var(--text-primary);
  background: var(--glass-lighter);
  border-color: var(--border-light);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--glass-light);
  border: 1px solid var(--border);
  padding: 7px 16px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s;
}

.status-badge.live {
  border-color: rgba(16,185,129,0.3);
  background: rgba(16,185,129,0.06);
}

.status-badge.offline {
  border-color: rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.06);
}

.pulse-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--safe);
  position: relative;
  flex-shrink: 0;
}

.pulse-dot::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px solid var(--safe);
  opacity: 0;
  animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.pulse-dot.offline {
  background: var(--danger);
}

.pulse-dot.offline::before {
  border-color: var(--danger);
  animation: none;
}

@keyframes pulseRing {
  0%   { transform: scale(0.8); opacity: 0.8; }
  80%, 100% { transform: scale(2.2); opacity: 0; }
}

.update-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-quaternary);
  padding: 6px 12px;
  background: var(--glass-light);
  border: 1px solid var(--border);
  border-radius: 100px;
}

/* ══════════════════════════════════════════════
   MAIN LAYOUT
   ══════════════════════════════════════════════ */
.layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  grid-template-rows: calc(100vh - 64px);
  margin-top: 64px;
  position: relative;
  z-index: 1;
}

/* ══════════════════════════════════════════════
   LEFT SIDEBAR
   ══════════════════════════════════════════════ */
.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(148,163,184,0.1) transparent;
}

.sidebar::-webkit-scrollbar { width: 5px; }
.sidebar::-webkit-scrollbar-track { background: transparent; }
.sidebar::-webkit-scrollbar-thumb { 
  background: rgba(148,163,184,0.15); 
  border-radius: 100px; 
}

/* ── Student Info Banner ── */
.student-banner {
  padding: 16px 20px;
  background: linear-gradient(135deg, 
    rgba(99,102,241,0.08) 0%, 
    rgba(139,92,246,0.05) 50%,
    rgba(59,130,246,0.08) 100%);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 14px;
}

.student-avatar {
  width: 44px; height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  font-family: 'Space Grotesk', sans-serif;
  position: relative;
  overflow: hidden;
}

.student-avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%);
}

.student-info {
  flex: 1;
  min-width: 0;
}

.student-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.student-matric {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--accent-indigo);
  margin-top: 2px;
  font-weight: 500;
}

.student-dept {
  font-size: 10px;
  color: var(--text-quaternary);
  margin-top: 1px;
}

.student-badge-chip {
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: rgba(99,102,241,0.12);
  color: var(--accent-indigo);
  border: 1px solid rgba(99,102,241,0.2);
  white-space: nowrap;
}

/* ── Section Structure ── */
.sidebar-section {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.sidebar-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.section-icon.blue { background: rgba(59,130,246,0.12); }
.section-icon.green { background: rgba(16,185,129,0.12); }
.section-icon.red { background: rgba(239,68,68,0.12); }
.section-icon.yellow { background: rgba(245,158,11,0.12); }
.section-icon.purple { background: rgba(139,92,246,0.12); }

.section-title-group {
  flex: 1;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.2;
}

.section-subtitle {
  font-size: 10px;
  color: var(--text-quaternary);
  margin-top: 1px;
}

.section-action {
  font-size: 10px;
  color: var(--text-quaternary);
  font-family: 'JetBrains Mono', monospace;
}

/* ══════════════════════════════════════════════
   DISTANCE DISPLAY — HERO SECTION
   ══════════════════════════════════════════════ */
.distance-section {
  padding: 24px 20px;
  background: linear-gradient(180deg,
    rgba(59,130,246,0.04) 0%,
    transparent 100%);
  border-bottom: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.distance-section::before {
  content: '';
  position: absolute;
  top: -60%; right: -20%;
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%);
  pointer-events: none;
}

.distance-top-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  position: relative;
}

.distance-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.distance-label {
  font-size: 11px;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  font-weight: 600;
}

.distance-live-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 100px;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.2);
  font-size: 9px;
  font-weight: 600;
  color: var(--safe);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.distance-live-dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--safe);
  animation: blink 1.5s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}

.distance-value-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.distance-number {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
  transition: color 0.4s ease;
  letter-spacing: -2px;
}

.distance-unit {
  font-size: 18px;
  color: var(--text-quaternary);
  font-weight: 400;
  margin-left: 2px;
}

.distance-gauge-container {
  position: relative;
}

/* Circular gauge */
.gauge-ring {
  width: 80px; height: 80px;
  position: relative;
}

.gauge-ring svg {
  width: 80px; height: 80px;
  transform: rotate(-90deg);
}

.gauge-track {
  fill: none;
  stroke: var(--glass-lighter);
  stroke-width: 5;
}

.gauge-fill {
  fill: none;
  stroke: var(--safe);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 201;
  stroke-dashoffset: 201;
  transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;
}

.gauge-center-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-secondary);
}

/* Progress bar */
.distance-bar-container {
  margin-bottom: 10px;
  position: relative;
}

.distance-bar-bg {
  height: 8px;
  background: rgba(148,163,184,0.06);
  border-radius: 100px;
  overflow: hidden;
  position: relative;
}

.distance-bar-fill {
  height: 100%;
  border-radius: 100px;
  background: linear-gradient(90deg, var(--safe), var(--safe));
  transition: width 0.5s cubic-bezier(0.4,0,0.2,1), background 0.4s ease;
  width: 0%;
  position: relative;
}

.distance-bar-fill::after {
  content: '';
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 30px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2));
  border-radius: 0 100px 100px 0;
}

.distance-bar-markers {
  display: flex;
  justify-content: space-between;
  padding: 6px 0 0;
}

.bar-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.bar-marker-line {
  width: 1px;
  height: 6px;
  background: var(--text-quaternary);
  opacity: 0.3;
}

.bar-marker-label {
  font-size: 9px;
  color: var(--text-quaternary);
  font-family: 'JetBrains Mono', monospace;
}

/* ══════════════════════════════════════════════
   ZONE STATUS CARD
   ══════════════════════════════════════════════ */
.zone-card {
  margin: 0;
  background: var(--glass-light);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.4s ease;
}

.zone-card-inner {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
}

.zone-icon-box {
  width: 52px; height: 52px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  background: var(--safe-dim);
  transition: background 0.4s;
  position: relative;
}

.zone-icon-pulse {
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 2px solid var(--safe);
  opacity: 0;
  animation: zonePulse 2.5s ease-in-out infinite;
}

@keyframes zonePulse {
  0%, 100% { opacity: 0; transform: scale(0.95); }
  50%      { opacity: 0.15; transform: scale(1.02); }
}

.zone-details { flex: 1; }

.zone-name-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1;
  color: var(--safe);
  transition: color 0.4s;
}

.zone-desc-text {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
  font-weight: 400;
}

.zone-pill-badge {
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  transition: all 0.4s;
  border: 1px solid transparent;
}

/* ══════════════════════════════════════════════
   SOS EMERGENCY CARD
   ══════════════════════════════════════════════ */
.sos-card {
  background: var(--glass-light);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.4s ease;
}

.sos-card.active {
  border-color: rgba(239,68,68,0.5);
  background: rgba(239,68,68,0.06);
  box-shadow: var(--shadow-glow-red);
  animation: sosBorderPulse 1.5s ease-in-out infinite;
}

@keyframes sosBorderPulse {
  0%, 100% { border-color: rgba(239,68,68,0.5); box-shadow: 0 0 40px rgba(239,68,68,0.15); }
  50%      { border-color: rgba(239,68,68,0.8); box-shadow: 0 0 60px rgba(239,68,68,0.25); }
}

.sos-card-header {
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

.sos-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--safe);
  transition: all 0.3s;
  flex-shrink: 0;
}

.sos-dot.active {
  background: var(--danger);
  box-shadow: 0 0 16px var(--danger);
  animation: sosGlow 1s infinite;
}

@keyframes sosGlow {
  0%, 100% { box-shadow: 0 0 16px var(--danger); }
  50%      { box-shadow: 0 0 32px var(--danger), 0 0 48px rgba(239,68,68,0.2); }
}

.sos-header-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.sos-count-badge {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  background: var(--glass-lighter);
  border: 1px solid var(--border);
  padding: 4px 10px;
  border-radius: 100px;
  color: var(--text-tertiary);
}

.sos-card-body {
  padding: 16px;
}

.sos-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sos-status-label {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--safe);
  letter-spacing: 0.5px;
  transition: color 0.3s;
}

.sos-status-label.alert {
  color: var(--danger);
}

.sos-time-stamp {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-quaternary);
}

.sos-action-row {
  margin-top: 12px;
}

.sos-map-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--accent-blue), #2563eb);
  color: white;
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(59,130,246,0.3);
}

.sos-map-link:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(59,130,246,0.4);
}

/* ══════════════════════════════════════════════
   WEATHER CARD
   ══════════════════════════════════════════════ */
.weather-card {
  background: var(--glass-light);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.weather-card-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.weather-loc-chip {
  font-size: 11px;
  color: var(--accent-cyan);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
}

.weather-card-body {
  padding: 16px;
}

.weather-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.weather-temp-group {
  display: flex;
  flex-direction: column;
}

.weather-temp-big {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 52px;
  font-weight: 700;
  line-height: 1;
  color: var(--text-primary);
  letter-spacing: -2px;
}

.weather-temp-unit {
  font-size: 20px;
  color: var(--text-quaternary);
  font-weight: 300;
}

.weather-condition-text {
  font-size: 14px;
  color: var(--text-tertiary);
  text-transform: capitalize;
  margin-top: 4px;
  font-weight: 400;
}

.weather-icon-display {
  font-size: 52px;
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
}

.weather-metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.weather-metric {
  background: var(--glass-lighter);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 12px;
  transition: all 0.2s;
}

.weather-metric:hover {
  border-color: var(--border-light);
  background: rgba(255,255,255,0.05);
}

.weather-metric-icon {
  font-size: 14px;
  margin-bottom: 4px;
}

.weather-metric-label {
  font-size: 10px;
  color: var(--text-quaternary);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 500;
}

.weather-metric-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 4px;
}

.weather-alert-bar {
  display: none;
  padding: 10px 14px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.weather-alert-bar.safe {
  display: flex;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.2);
  color: #6ee7b7;
}

.weather-alert-bar.danger {
  display: flex;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
  animation: alertBarPulse 2.5s infinite;
}

.weather-alert-bar.hidden {
  display: none;
}

@keyframes alertBarPulse {
  0%, 100% { border-color: rgba(239,68,68,0.3); }
  50%      { border-color: rgba(239,68,68,0.7); }
}

/* ══════════════════════════════════════════════
   SOS HISTORY
   ══════════════════════════════════════════════ */
.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-entry {
  background: var(--glass-light);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.history-entry::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: var(--danger);
  border-radius: 0 2px 2px 0;
}

.history-entry:hover {
  border-color: var(--border-light);
  background: var(--glass-lighter);
  transform: translateX(2px);
}

.history-entry-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 8px;
}

.history-entry-id {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--danger);
  letter-spacing: 0.5px;
}

.history-entry-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-quaternary);
}

.history-map-btn {
  padding: 6px 12px;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.25);
  color: var(--accent-blue);
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.history-map-btn:hover {
  background: rgba(59,130,246,0.2);
  border-color: rgba(59,130,246,0.4);
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--text-quaternary);
  font-size: 12px;
  border: 1px dashed var(--border-light);
  border-radius: var(--radius-md);
  background: var(--glass-light);
}

.empty-state-icon {
  font-size: 28px;
  margin-bottom: 8px;
  opacity: 0.5;
}

.empty-state-text {
  font-weight: 500;
}

/* ══════════════════════════════════════════════
   MAP PANEL
   ══════════════════════════════════════════════ */
.map-panel {
  position: relative;
  background: var(--bg-tertiary);
}

#map {
  width: 100%;
  height: 100%;
}

.map-float {
  position: absolute;
  z-index: 500;
  pointer-events: none;
}

.map-coords-card {
  top: 16px; left: 16px;
  background: rgba(6,8,13,0.9);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  pointer-events: auto;
  min-width: 200px;
}

.map-coords-label {
  font-size: 9px;
  color: var(--text-quaternary);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 6px;
}

.map-coords-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: var(--accent-cyan);
  font-weight: 500;
}

.map-sos-float {
  top: 16px; right: 16px;
  background: rgba(239,68,68,0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(239,68,68,0.4);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  display: none;
  pointer-events: auto;
}

.map-sos-float.active {
  display: block;
  animation: mapSosPulse 1.2s infinite;
}

@keyframes mapSosPulse {
  0%, 100% { opacity: 1; border-color: rgba(239,68,68,0.4); }
  50%      { opacity: 0.7; border-color: rgba(239,68,68,0.8); }
}

.map-sos-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--danger);
  display: flex;
  align-items: center;
  gap: 8px;
}

.map-sos-subtitle {
  font-size: 11px;
  color: rgba(239,68,68,0.7);
  margin-top: 4px;
}

/* Map info panel at bottom */
.map-info-strip {
  bottom: 16px; left: 16px; right: 16px;
  display: flex;
  gap: 10px;
  pointer-events: auto;
}

.map-info-chip {
  background: rgba(6,8,13,0.88);
  backdrop-filter: blur(16px);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-secondary);
}

.map-info-chip-icon {
  font-size: 14px;
}

.map-info-chip-val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
  color: var(--text-primary);
}

/* ══════════════════════════════════════════════
   CUSTOM MAP MARKER
   ══════════════════════════════════════════════ */
.vic-marker-v2 {
  width: 22px; height: 22px;
  background: var(--accent-blue);
  border: 3px solid white;
  border-radius: 50%;
  box-shadow: 
    0 0 0 4px rgba(59,130,246,0.25),
    0 2px 12px rgba(0,0,0,0.5);
  animation: markerBreathe 3s ease-in-out infinite;
  position: relative;
}

.vic-marker-v2::after {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  width: 6px; height: 6px;
  background: white;
  border-radius: 50%;
}

@keyframes markerBreathe {
  0%, 100% { box-shadow: 0 0 0 4px rgba(59,130,246,0.25), 0 2px 12px rgba(0,0,0,0.5); }
  50%      { box-shadow: 0 0 0 10px rgba(59,130,246,0.1), 0 2px 12px rgba(0,0,0,0.5); }
}

.vic-marker-v2.sos {
  background: var(--danger);
  box-shadow: 
    0 0 0 4px rgba(239,68,68,0.3),
    0 2px 12px rgba(0,0,0,0.5);
  animation: markerSOS 0.6s infinite;
}

@keyframes markerSOS {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 4px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.4); }
  50%      { transform: scale(1.3); box-shadow: 0 0 0 8px rgba(239,68,68,0.15), 0 0 40px rgba(239,68,68,0.3); }
}

/* Leaflet styling overrides */
.leaflet-container {
  background: #080c14;
  font-family: 'Inter', sans-serif;
}

.leaflet-control-zoom a {
  background: rgba(6,8,13,0.9) !important;
  backdrop-filter: blur(12px) !important;
  border-color: var(--border) !important;
  color: var(--text-secondary) !important;
  font-size: 16px !important;
  width: 34px !important;
  height: 34px !important;
  line-height: 34px !important;
  transition: all 0.2s !important;
}

.leaflet-control-zoom a:hover {
  background: rgba(15,22,36,0.95) !important;
  color: var(--text-primary) !important;
}

.leaflet-control-attribution {
  background: rgba(6,8,13,0.7) !important;
  color: rgba(148,163,184,0.3) !important;
  font-size: 9px !important;
  backdrop-filter: blur(8px) !important;
}

.leaflet-popup-content-wrapper {
  background: rgba(6,8,13,0.95) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--shadow-lg) !important;
  color: var(--text-primary) !important;
}

.leaflet-popup-tip {
  background: rgba(6,8,13,0.95) !important;
  border: 1px solid var(--border) !important;
}

/* ══════════════════════════════════════════════
   FOOTER INSIDE SIDEBAR
   ══════════════════════════════════════════════ */
.sidebar-footer {
  padding: 20px;
  text-align: center;
  border-top: 1px solid var(--border);
  background: var(--glass-light);
}

.footer-logo-text {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-quaternary);
  letter-spacing: 2px;
  margin-bottom: 4px;
}

.footer-tagline {
  font-size: 10px;
  color: var(--text-quaternary);
  letter-spacing: 0.5px;
}

.footer-credit {
  margin-top: 10px;
  font-size: 10px;
  color: var(--text-quaternary);
  font-style: italic;
}

.footer-credit strong {
  color: var(--text-tertiary);
  font-style: normal;
}

/* ══════════════════════════════════════════════
   ANIMATIONS
   ══════════════════════════════════════════════ */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.sidebar > * {
  animation: fadeInUp 0.5s ease both;
}

.sidebar > *:nth-child(1) { animation-delay: 0.05s; }
.sidebar > *:nth-child(2) { animation-delay: 0.1s; }
.sidebar > *:nth-child(3) { animation-delay: 0.15s; }
.sidebar > *:nth-child(4) { animation-delay: 0.2s; }
.sidebar > *:nth-child(5) { animation-delay: 0.25s; }
.sidebar > *:nth-child(6) { animation-delay: 0.3s; }
.sidebar > *:nth-child(7) { animation-delay: 0.35s; }

/* ══════════════════════════════════════════════
   RESPONSIVE
   ══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 55vh;
  }
  .sidebar {
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: 55vh;
  }
  .navbar { padding: 0 14px; }
  .nav-subtitle { display: none; }
  .nav-center { display: none; }
  .update-chip { display: none; }
  .distance-number { font-size: 48px; }
  .map-info-strip { flex-wrap: wrap; }
}

@media (max-width: 480px) {
  .student-banner { flex-wrap: wrap; gap: 10px; }
  .student-badge-chip { order: 3; }
  .nav-title { font-size: 15px; }
  .distance-number { font-size: 40px; }
  .weather-temp-big { font-size: 40px; }
  .gauge-ring { display: none; }
}
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════
     NAVIGATION BAR
     ══════════════════════════════════════════════ -->
<nav class="navbar">
  <div class="nav-brand">
    <div class="nav-logo-container">
      <div class="nav-logo">VIC</div>
      <div class="nav-logo-ring"></div>
    </div>
    <div class="nav-text">
      <div class="nav-title">VIC ALERT SYSTEM</div>
      <div class="nav-subtitle">IoT Safety Wearable for Visually Impaired Individuals</div>
    </div>
  </div>
  <div class="nav-center">
    <div class="nav-tab active">Dashboard</div>
    <div class="nav-tab">Analytics</div>
    <div class="nav-tab">Settings</div>
  </div>
  <div class="nav-right">
    <div class="status-badge" id="statusBadge">
      <span class="pulse-dot" id="statusDot"></span>
      <span id="statusText">Connecting</span>
    </div>
    <span class="update-chip" id="updateTime">--:--:--</span>
  </div>
</nav>

<!-- ══════════════════════════════════════════════
     MAIN LAYOUT
     ══════════════════════════════════════════════ -->
<div class="layout">

  <!-- ── LEFT SIDEBAR ── -->
  <aside class="sidebar">

    <!-- Student Info Banner -->
    <div class="student-banner">
      <div class="student-avatar">OV</div>
      <div class="student-info">
        <div class="student-name">Okechukwu Victor Nnaogo</div>
        <div class="student-matric">PAS/CSC/21/073</div>
        <div class="student-dept">Department of Computer Science</div>
      </div>
      <div class="student-badge-chip">Final Year Project</div>
    </div>

    <!-- ── Distance Section ── -->
    <div class="distance-section">
      <div class="distance-top-row">
        <div>
          <div class="distance-label-row">
            <span class="distance-label">Obstacle Distance</span>
            <span class="distance-live-tag">
              <span class="distance-live-dot"></span>
              Live
            </span>
          </div>
          <div class="distance-value-row">
            <span class="distance-number" id="distNum">—</span>
            <span class="distance-unit" id="distUnit">cm</span>
          </div>
        </div>
        <div class="distance-gauge-container">
          <div class="gauge-ring">
            <svg viewBox="0 0 72 72">
              <circle class="gauge-track" cx="36" cy="36" r="32"/>
              <circle class="gauge-fill" id="gaugeFill" cx="36" cy="36" r="32"/>
            </svg>
            <div class="gauge-center-text" id="gaugePct">0%</div>
          </div>
        </div>
      </div>
      <div class="distance-bar-container">
        <div class="distance-bar-bg">
          <div class="distance-bar-fill" id="distBar"></div>
        </div>
        <div class="distance-bar-markers">
          <div class="bar-marker">
            <div class="bar-marker-line"></div>
            <span class="bar-marker-label">0</span>
          </div>
          <div class="bar-marker">
            <div class="bar-marker-line"></div>
            <span class="bar-marker-label">50</span>
          </div>
          <div class="bar-marker">
            <div class="bar-marker-line"></div>
            <span class="bar-marker-label">100</span>
          </div>
          <div class="bar-marker">
            <div class="bar-marker-line"></div>
            <span class="bar-marker-label">150</span>
          </div>
          <div class="bar-marker">
            <div class="bar-marker-line"></div>
            <span class="bar-marker-label">200</span>
          </div>
          <div class="bar-marker">
            <div class="bar-marker-line"></div>
            <span class="bar-marker-label">300</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Zone Status ── -->
    <div class="sidebar-section">
      <div class="section-header">
        <div class="section-icon green">🛡</div>
        <div class="section-title-group">
          <div class="section-title">Safety Zone</div>
          <div class="section-subtitle">Current threat assessment</div>
        </div>
      </div>
      <div class="zone-card" id="zoneCard">
        <div class="zone-card-inner">
          <div class="zone-icon-box" id="zoneIconBox">
            <span id="zoneIcon">✅</span>
            <div class="zone-icon-pulse" id="zoneIconPulse"></div>
          </div>
          <div class="zone-details">
            <div class="zone-name-text" id="zoneName">SAFE</div>
            <div class="zone-desc-text" id="zoneDesc">No obstacles detected</div>
          </div>
          <div class="zone-pill-badge" id="zonePill" style="background:var(--safe);color:white">SAFE</div>
        </div>
      </div>
    </div>

    <!-- ── SOS Emergency ── -->
    <div class="sidebar-section">
      <div class="section-header">
        <div class="section-icon red">🚨</div>
        <div class="section-title-group">
          <div class="section-title">Emergency Status</div>
          <div class="section-subtitle">SOS alert monitoring</div>
        </div>
      </div>
      <div class="sos-card" id="sosCard">
        <div class="sos-card-header">
          <div class="sos-header-left">
            <div class="sos-dot" id="sosDot"></div>
            <span class="sos-header-label">SOS Monitor</span>
          </div>
          <span class="sos-count-badge" id="sosCountBadge">0 events</span>
        </div>
        <div class="sos-card-body">
          <div class="sos-status-row">
            <div class="sos-status-label" id="sosStatusLabel">System Normal</div>
          </div>
          <div class="sos-time-stamp" id="sosTimeStamp">Last SOS: Never</div>
          <div class="sos-action-row" id="sosActionRow"></div>
        </div>
      </div>
    </div>

    <!-- ── Weather ── -->
    <div class="sidebar-section">
      <div class="section-header">
        <div class="section-icon yellow">🌤</div>
        <div class="section-title-group">
          <div class="section-title">Weather Intelligence</div>
          <div class="section-subtitle">Environmental conditions</div>
        </div>
      </div>
      <div class="weather-card">
        <div class="weather-card-header">
          <span class="sos-header-label">Current Conditions</span>
          <span class="weather-loc-chip" id="weatherLoc">Lagos, NG</span>
        </div>
        <div class="weather-card-body">
          <div class="weather-top">
            <div class="weather-temp-group">
              <div>
                <span class="weather-temp-big" id="wTemp">—</span>
                <span class="weather-temp-unit">°C</span>
              </div>
              <div class="weather-condition-text" id="wDesc">Fetching...</div>
            </div>
            <div class="weather-icon-display" id="wIcon">🌤</div>
          </div>
          <div class="weather-metrics">
            <div class="weather-metric">
              <div class="weather-metric-icon">💧</div>
              <div class="weather-metric-label">Humidity</div>
              <div class="weather-metric-value" id="wHumidity">—%</div>
            </div>
            <div class="weather-metric">
              <div class="weather-metric-icon">💨</div>
              <div class="weather-metric-label">Wind Speed</div>
              <div class="weather-metric-value" id="wWind">— m/s</div>
            </div>
          </div>
          <div class="weather-alert-bar hidden" id="weatherAlertBar">
            <span>✓</span>
            <span>Conditions safe for travel</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── SOS History ── -->
    <div class="sidebar-section">
      <div class="section-header">
        <div class="section-icon purple">📋</div>
        <div class="section-title-group">
          <div class="section-title">Event History</div>
          <div class="section-subtitle">Recent SOS activations</div>
        </div>
        <div class="section-action" id="historyCount">0 total</div>
      </div>
      <div class="history-list" id="historyList">
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">No SOS events recorded yet</div>
        </div>
      </div>
    </div>

    <!-- ── Footer ── -->
    <div class="sidebar-footer">
      <div class="footer-logo-text">VIC ALERT</div>
      <div class="footer-tagline">Intelligent Safety System for the Visually Impaired</div>
      <div class="footer-credit">
        Designed &amp; Built by <strong>Okechukwu Victor Nnaogo</strong><br>
        <span style="font-size:9px;color:var(--text-quaternary)">PAS/CSC/21/073 — Final Year Project 2025</span>
      </div>
    </div>

  </aside>

  <!-- ── MAP PANEL ── -->
  <div class="map-panel">
    <div id="map"></div>

    <!-- Coordinates floating card -->
    <div class="map-float map-coords-card" id="coordsCard">
      <div class="map-coords-label">📍 Last Known Position</div>
      <div class="map-coords-value" id="coordsText">Waiting for GPS signal...</div>
    </div>

    <!-- SOS floating alert -->
    <div class="map-float map-sos-float" id="mapSosFloat">
      <div class="map-sos-title">
        <span>🚨</span> SOS ACTIVE
      </div>
      <div class="map-sos-subtitle">Emergency signal in progress</div>
    </div>

    <!-- Bottom info strip -->
    <div class="map-float map-info-strip" id="mapInfoStrip">
      <div class="map-info-chip">
        <span class="map-info-chip-icon">📡</span>
        <span>System:</span>
        <span class="map-info-chip-val" id="mapSysStatus">ACTIVE</span>
      </div>
      <div class="map-info-chip">
        <span class="map-info-chip-icon">🔋</span>
        <span>Zone:</span>
        <span class="map-info-chip-val" id="mapZoneStatus">SAFE</span>
      </div>
      <div class="map-info-chip">
        <span class="map-info-chip-icon">📏</span>
        <span>Distance:</span>
        <span class="map-info-chip-val" id="mapDistStatus">—</span>
      </div>
    </div>
  </div>

</div>

<script>
// ══════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════

const ZONE_CFG = {
  'SAFE':     { color:'#10b981', dim:'rgba(16,185,129,0.12)',  icon:'✅', desc:'No obstacles detected',    bar:'linear-gradient(90deg,#10b981,#34d399)' },
  'CAUTION':  { color:'#f59e0b', dim:'rgba(245,158,11,0.12)',  icon:'⚠️', desc:'Obstacle at 100–150 cm',  bar:'linear-gradient(90deg,#f59e0b,#fbbf24)' },
  'WARNING':  { color:'#f97316', dim:'rgba(249,115,22,0.12)',  icon:'⚡', desc:'Obstacle at 50–100 cm',   bar:'linear-gradient(90deg,#f97316,#fb923c)' },
  'DANGER':   { color:'#ef4444', dim:'rgba(239,68,68,0.12)',   icon:'🚨', desc:'Obstacle at 20–50 cm',    bar:'linear-gradient(90deg,#ef4444,#f87171)' },
  'CRITICAL': { color:'#dc2626', dim:'rgba(220,38,38,0.15)',   icon:'🔴', desc:'Obstacle under 20 cm!',   bar:'linear-gradient(90deg,#dc2626,#ef4444)' }
};

const WX_ICONS = { 2:'⛈️', 3:'🌧️', 5:'🌧️', 6:'❄️', 7:'🌫️', 8:'⛅' };

function wxIcon(id) {
  if (id === 800) return '☀️';
  if (id === 801) return '🌤️';
  if (id >= 802) return '☁️';
  return WX_ICONS[Math.floor(id/100)] || '🌤️';
}

// ══════════════════════════════════════════════
// LEAFLET MAP
// ══════════════════════════════════════════════

const map = L.map('map', {
  center: [6.5244, 3.3792],
  zoom: 15,
  zoomControl: true,
  attributionControl: true
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap &copy; CARTO',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

const markerIcon = L.divIcon({
  html: '<div class="vic-marker-v2"></div>',
  className: '',
  iconSize: [22,22],
  iconAnchor: [11,11]
});

const markerIconSOS = L.divIcon({
  html: '<div class="vic-marker-v2 sos"></div>',
  className: '',
  iconSize: [22,22],
  iconAnchor: [11,11]
});

let devMarker = null;
let trail = null;
let trailPts = [];
let initialSet = false;
let lastFetchTime = 0;

const sosLayerGroup = L.layerGroup().addTo(map);

function updateMapMarker(lat, lng, isSOS) {
  const icon = isSOS ? markerIconSOS : markerIcon;
  if (!devMarker) {
    devMarker = L.marker([lat, lng], { icon }).addTo(map);
  } else {
    devMarker.setLatLng([lat, lng]);
    devMarker.setIcon(icon);
  }

  if (!initialSet) {
    map.setView([lat, lng], 16);
    initialSet = true;
  }

  trailPts.push([lat, lng]);
  if (trailPts.length > 100) trailPts.shift();

  if (trail) map.removeLayer(trail);
  if (trailPts.length > 1) {
    trail = L.polyline(trailPts, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.5,
      dashArray: '8 6',
      lineCap: 'round'
    }).addTo(map);
  }

  document.getElementById('coordsText').textContent =
    lat.toFixed(6) + ', ' + lng.toFixed(6);
}

// ══════════════════════════════════════════════
// DOM HELPERS
// ══════════════════════════════════════════════

const $ = id => document.getElementById(id);

// ══════════════════════════════════════════════
// DATA FETCH LOOP
// ══════════════════════════════════════════════

async function fetchData() {
  try {
    const res = await fetch('/data');
    const d = await res.json();
    lastFetchTime = Date.now();

    // ── Status bar ──
    $('statusDot').classList.remove('offline');
    $('statusBadge').classList.add('live');
    $('statusBadge').classList.remove('offline');
    $('statusText').textContent = 'Live';
    $('updateTime').textContent = d.lastUpdate;

    // ── Distance ──
    const dist = parseFloat(d.distance);
    const isClear = dist >= 999;
    $('distNum').textContent = isClear ? 'CLEAR' : dist.toFixed(1);
    $('distUnit').textContent = isClear ? '' : 'cm';

    const pct = isClear ? 0 : Math.max(0, Math.min(100, (1 - dist / 300) * 100));
    const zone = d.zone || 'SAFE';
    const cfg = ZONE_CFG[zone] || ZONE_CFG['SAFE'];

    $('distBar').style.width = pct + '%';
    $('distBar').style.background = cfg.bar;
    $('distNum').style.color = isClear ? '#f1f5f9' : cfg.color;

    // Gauge
    const circumference = 2 * Math.PI * 32; // ~201
    const offset = circumference - (pct / 100) * circumference;
    $('gaugeFill').style.strokeDashoffset = offset;
    $('gaugeFill').style.stroke = cfg.color;
    $('gaugePct').textContent = Math.round(pct) + '%';
    $('gaugePct').style.color = cfg.color;

    // ── Zone ──
    $('zoneIcon').textContent = cfg.icon;
    $('zoneIconBox').style.background = cfg.dim;
    const pulse = $('zoneIconPulse');
    pulse.style.borderColor = cfg.color;
    $('zoneName').textContent = zone;
    $('zoneName').style.color = cfg.color;
    $('zoneDesc').textContent = cfg.desc;
    $('zonePill').textContent = zone;
    $('zonePill').style.background = cfg.color;
    $('zonePill').style.color = (zone === 'CAUTION') ? '#050810' : 'white';
    $('zonePill').style.borderColor = cfg.color;

    // Map info strip
    $('mapZoneStatus').textContent = zone;
    $('mapZoneStatus').style.color = cfg.color;
    $('mapDistStatus').textContent = isClear ? 'CLEAR' : dist.toFixed(0) + ' cm';
    $('mapSysStatus').textContent = d.systemStatus || 'ACTIVE';

    // ── SOS ──
    const sos = d.sosActive;
    const sosCard = $('sosCard');
    const sosDot = $('sosDot');
    const sosLabel = $('sosStatusLabel');
    const mapSos = $('mapSosFloat');

    if (sos) {
      sosCard.classList.add('active');
      sosDot.classList.add('active');
      sosLabel.textContent = '🚨 EMERGENCY ACTIVE';
      sosLabel.classList.add('alert');
      mapSos.classList.add('active');
      if (devMarker) devMarker.setIcon(markerIconSOS);
    } else {
      sosCard.classList.remove('active');
      sosDot.classList.remove('active');
      sosLabel.textContent = 'System Normal';
      sosLabel.classList.remove('alert');
      mapSos.classList.remove('active');
      if (devMarker) devMarker.setIcon(markerIcon);
    }

    $('sosCountBadge').textContent = d.sosCount + ' event' + (d.sosCount !== 1 ? 's' : '');
    $('sosTimeStamp').textContent = 'Last SOS: ' + (d.lastSosTime || 'Never');

    const actionRow = $('sosActionRow');
    if (d.mapsLink && d.mapsLink !== '') {
      actionRow.innerHTML =
        '<a class="sos-map-link" href="' + d.mapsLink + '" target="_blank">' +
        '<span>📍</span> Open Location in Maps</a>';
    } else {
      actionRow.innerHTML = '';
    }

    // ── Weather ──
    $('wTemp').textContent = d.temperature ? d.temperature.toFixed(1) : '—';
    $('wDesc').textContent = d.weather || 'Unknown';
    $('wIcon').textContent = wxIcon(d.weatherId || 800);
    $('wHumidity').textContent = (d.humidity || 0) + '%';
    $('wWind').textContent = (d.windSpeed || 0).toFixed(1) + ' m/s';

    const alertBar = $('weatherAlertBar');
    if (d.weatherAlert && d.weatherAlert !== 'None') {
      alertBar.innerHTML = '<span>⚠️</span><span>' + d.weatherAlert + '</span>';
      alertBar.className = 'weather-alert-bar danger';
    } else if (d.weather && d.weather !== 'Fetching...') {
      alertBar.innerHTML = '<span>✓</span><span>Conditions safe for travel</span>';
      alertBar.className = 'weather-alert-bar safe';
    } else {
      alertBar.className = 'weather-alert-bar hidden';
    }

    // ── Map ──
    const lat = parseFloat(d.lat);
    const lng = parseFloat(d.lng);
    if (d.hasLocation && lat && lng) {
      updateMapMarker(lat, lng, sos);
    }

    sosLayerGroup.clearLayers();
    if (d.sosHistory && d.sosHistory.length > 0) {
      d.sosHistory.forEach(ev => {
        if (ev.lat && ev.lng) {
          const cm = L.circleMarker([ev.lat, ev.lng], {
            radius: 7,
            fillColor: '#ef4444',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
          }).addTo(sosLayerGroup);
          cm.bindPopup(
            '<div style="font-family:Inter,sans-serif;padding:4px">' +
            '<b style="color:#ef4444;font-size:13px">SOS #' + ev.count + '</b><br>' +
            '<span style="font-size:11px;color:#94a3b8">' + ev.time + '</span></div>'
          );
        }
      });
    }

    // ── History List ──
    const hist = d.sosHistory || [];
    const histEl = $('historyList');
    $('historyCount').textContent = hist.length + ' total';

    if (hist.length === 0) {
      histEl.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-state-icon">📭</div>' +
        '<div class="empty-state-text">No SOS events recorded yet</div></div>';
    } else {
      histEl.innerHTML = hist.map(h => {
        const btn = h.location
          ? '<a class="history-map-btn" href="' + h.location + '" target="_blank"><span>📍</span> Map</a>'
          : '<span style="color:var(--text-quaternary);font-size:10px">No GPS</span>';
        return '<div class="history-entry">' +
          '<div class="history-entry-info">' +
          '<span class="history-entry-id">SOS #' + h.count + '</span>' +
          '<span class="history-entry-time">' + h.time + '</span>' +
          '</div>' + btn + '</div>';
      }).join('');
    }

  } catch(e) {
    $('statusDot').classList.add('offline');
    $('statusBadge').classList.remove('live');
    $('statusBadge').classList.add('offline');
    $('statusText').textContent = 'Offline';
  }
}

// Initial + polling
fetchData();
setInterval(fetchData, 3000);

// Offline detection
setInterval(() => {
  if (lastFetchTime > 0 && Date.now() - lastFetchTime > 15000) {
    $('statusDot').classList.add('offline');
    $('statusBadge').classList.remove('live');
    $('statusBadge').classList.add('offline');
    $('statusText').textContent = 'Device Offline';
  }
}, 5000);
<\/script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('VIC Alert Server running on port ' + PORT);
});
