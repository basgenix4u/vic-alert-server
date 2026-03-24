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
  deviceData.lastUpdate   = new Date().toLocaleTimeString('en-US',{hour12:true,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const lat = parseFloat(d.lat);
  const lng = parseFloat(d.lng);
  if(lat && lng && lat!==0 && lng!==0){
    deviceData.lat=lat; deviceData.lng=lng; deviceData.hasLocation=true;
    locationHistory.push({lat,lng,time:deviceData.lastUpdate});
    if(locationHistory.length>50) locationHistory.shift();
  }
  if(d.sosActive==="true"){
    sosHistory.unshift({time:deviceData.lastUpdate,location:deviceData.mapsLink,lat:deviceData.lat,lng:deviceData.lng,count:deviceData.sosCount});
    if(sosHistory.length>20) sosHistory.pop();
  }
  res.json({status:"ok"});
});

app.get('/data',(req,res)=>{
  res.json({...deviceData,sosHistory,locationHistory});
});

// ── Dashboard ────────────────────────────────────
app.get('/',(req,res)=>{
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VIC Alert — Smart Safety Dashboard</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
/*═══════════════════════════════════════════════════════════
  VIC ALERT SYSTEM — PREMIUM CLEAN DASHBOARD
  By: Okechukwu Victor Nnaogo | PAS/CSC/21/073
═══════════════════════════════════════════════════════════*/

:root{
  /* Backgrounds */
  --bg-body:#f0f2f5;
  --bg-sidebar:#ffffff;
  --bg-card:#ffffff;
  --bg-card-alt:#f8f9fb;
  --bg-hover:#f3f4f6;
  --bg-input:#f5f6f8;

  /* Accent */
  --primary:#2563eb;
  --primary-light:#dbeafe;
  --primary-dark:#1d4ed8;

  /* Status */
  --safe:#059669;
  --safe-bg:#ecfdf5;
  --safe-border:#a7f3d0;
  --caution:#d97706;
  --caution-bg:#fffbeb;
  --caution-border:#fde68a;
  --warning:#ea580c;
  --warning-bg:#fff7ed;
  --warning-border:#fed7aa;
  --danger:#dc2626;
  --danger-bg:#fef2f2;
  --danger-border:#fecaca;
  --critical:#991b1b;
  --critical-bg:#fef2f2;
  --critical-border:#fca5a5;

  /* Text */
  --text-primary:#111827;
  --text-secondary:#4b5563;
  --text-tertiary:#6b7280;
  --text-muted:#9ca3af;
  --text-light:#d1d5db;

  /* Border */
  --border:#e5e7eb;
  --border-light:#f3f4f6;
  --border-focus:#93c5fd;

  /* Shadows */
  --shadow-xs:0 1px 2px rgba(0,0,0,0.04);
  --shadow-sm:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:0 4px 6px -1px rgba(0,0,0,0.06),0 2px 4px -2px rgba(0,0,0,0.04);
  --shadow-lg:0 10px 15px -3px rgba(0,0,0,0.06),0 4px 6px -4px rgba(0,0,0,0.04);
  --shadow-xl:0 20px 25px -5px rgba(0,0,0,0.06),0 8px 10px -6px rgba(0,0,0,0.04);

  /* Radius */
  --r-sm:6px;
  --r-md:10px;
  --r-lg:14px;
  --r-xl:18px;
  --r-full:9999px;
}

*{margin:0;padding:0;box-sizing:border-box;}
html{height:100%;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}

body{
  height:100%;
  background:var(--bg-body);
  color:var(--text-primary);
  font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:14px;
  line-height:1.6;
  overflow-x:hidden;
}

/*═══════════════════════════════════════
  TOP NAVBAR
═══════════════════════════════════════*/
.navbar{
  position:fixed;
  top:0;left:0;right:0;
  z-index:1000;
  height:62px;
  background:#ffffff;
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 20px;
  box-shadow:var(--shadow-xs);
}

.nav-left{
  display:flex;
  align-items:center;
  gap:14px;
}

.nav-logo-box{
  width:38px;height:38px;
  background:linear-gradient(135deg,#dc2626,#b91c1c);
  border-radius:10px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:'Space Grotesk',sans-serif;
  font-size:15px;
  font-weight:800;
  color:#fff;
  letter-spacing:0.5px;
  box-shadow:0 2px 8px rgba(220,38,38,0.25);
  flex-shrink:0;
}

.nav-info{display:flex;flex-direction:column;gap:0;}
.nav-name{
  font-family:'Space Grotesk',sans-serif;
  font-size:17px;
  font-weight:700;
  color:var(--text-primary);
  letter-spacing:0.3px;
  line-height:1.2;
}
.nav-desc{
  font-size:11px;
  color:var(--text-muted);
  font-weight:400;
  line-height:1.2;
}

.nav-divider{
  width:1px;
  height:30px;
  background:var(--border);
  margin:0 6px;
}

.nav-student{
  display:flex;
  flex-direction:column;
  gap:0;
}

.nav-student-name{
  font-size:12px;
  font-weight:600;
  color:var(--text-secondary);
  line-height:1.3;
}

.nav-student-id{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;
  color:var(--primary);
  font-weight:600;
  line-height:1.3;
}

.nav-right{
  display:flex;
  align-items:center;
  gap:10px;
}

.live-badge{
  display:flex;
  align-items:center;
  gap:7px;
  padding:6px 14px;
  border-radius:var(--r-full);
  font-size:12px;
  font-weight:600;
  transition:all 0.3s;
}

.live-badge.online{
  background:var(--safe-bg);
  color:var(--safe);
  border:1px solid var(--safe-border);
}

.live-badge.offline{
  background:var(--danger-bg);
  color:var(--danger);
  border:1px solid var(--danger-border);
}

.live-dot{
  width:7px;height:7px;
  border-radius:50%;
  flex-shrink:0;
  position:relative;
}

.live-dot.on{
  background:var(--safe);
}

.live-dot.on::after{
  content:'';
  position:absolute;
  inset:-3px;
  border-radius:50%;
  border:2px solid var(--safe);
  opacity:0;
  animation:livePing 2s cubic-bezier(0,0,0.2,1) infinite;
}

@keyframes livePing{
  0%{transform:scale(0.8);opacity:0.7;}
  75%,100%{transform:scale(2);opacity:0;}
}

.live-dot.off{
  background:var(--danger);
}

.clock-chip{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;
  font-weight:500;
  color:var(--text-muted);
  background:var(--bg-card-alt);
  border:1px solid var(--border);
  padding:5px 12px;
  border-radius:var(--r-full);
}

/*═══════════════════════════════════════
  MAIN LAYOUT
═══════════════════════════════════════*/
.main-layout{
  display:grid;
  grid-template-columns:400px 1fr;
  height:calc(100vh - 62px);
  margin-top:62px;
}

/*═══════════════════════════════════════
  LEFT SIDEBAR
═══════════════════════════════════════*/
.sidebar{
  background:var(--bg-sidebar);
  border-right:1px solid var(--border);
  overflow-y:auto;
  overflow-x:hidden;
}

.sidebar::-webkit-scrollbar{width:4px;}
.sidebar::-webkit-scrollbar-track{background:transparent;}
.sidebar::-webkit-scrollbar-thumb{background:var(--text-light);border-radius:var(--r-full);}

/* ── Panel blocks ── */
.panel{
  padding:20px;
  border-bottom:1px solid var(--border);
}

.panel:last-child{border-bottom:none;}

.panel-header{
  display:flex;
  align-items:center;
  gap:10px;
  margin-bottom:16px;
}

.panel-icon{
  width:32px;height:32px;
  border-radius:var(--r-md);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:15px;
  flex-shrink:0;
}

.panel-icon.blue{background:var(--primary-light);color:var(--primary);}
.panel-icon.green{background:var(--safe-bg);color:var(--safe);}
.panel-icon.red{background:var(--danger-bg);color:var(--danger);}
.panel-icon.amber{background:var(--caution-bg);color:var(--caution);}
.panel-icon.purple{background:#f3e8ff;color:#7c3aed;}

.panel-title-group{flex:1;}

.panel-title{
  font-size:13px;
  font-weight:700;
  color:var(--text-primary);
  line-height:1.2;
}

.panel-subtitle{
  font-size:10px;
  color:var(--text-muted);
  font-weight:400;
  margin-top:1px;
}

.panel-badge{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;
  font-weight:600;
  padding:3px 9px;
  border-radius:var(--r-full);
  background:var(--bg-card-alt);
  border:1px solid var(--border);
  color:var(--text-muted);
}

/*═══════════════════════════════════════
  PROJECT INFO BANNER
═══════════════════════════════════════*/
.project-banner{
  padding:18px 20px;
  background:linear-gradient(135deg,#eff6ff 0%,#f5f3ff 50%,#fdf2f8 100%);
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  gap:14px;
}

.project-avatar{
  width:48px;height:48px;
  border-radius:14px;
  background:linear-gradient(135deg,var(--primary),#7c3aed);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:17px;
  font-weight:800;
  color:#fff;
  font-family:'Space Grotesk',sans-serif;
  flex-shrink:0;
  box-shadow:0 4px 12px rgba(37,99,235,0.25);
  position:relative;
}

.project-avatar::after{
  content:'';
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:linear-gradient(135deg,rgba(255,255,255,0.25) 0%,transparent 50%);
}

.project-details{flex:1;min-width:0;}

.project-owner{
  font-size:15px;
  font-weight:700;
  color:var(--text-primary);
  line-height:1.3;
}

.project-id{
  font-family:'JetBrains Mono',monospace;
  font-size:12px;
  font-weight:600;
  color:var(--primary);
  margin-top:1px;
}

.project-dept{
  font-size:11px;
  color:var(--text-muted);
  margin-top:1px;
}

.project-tag{
  padding:5px 12px;
  border-radius:var(--r-full);
  font-size:10px;
  font-weight:700;
  letter-spacing:0.5px;
  text-transform:uppercase;
  background:#fff;
  color:var(--primary);
  border:1px solid var(--primary-light);
  box-shadow:var(--shadow-xs);
  white-space:nowrap;
}

/*═══════════════════════════════════════
  DISTANCE DISPLAY
═══════════════════════════════════════*/
.distance-panel{
  padding:24px 20px;
  border-bottom:1px solid var(--border);
  background:var(--bg-card);
}

.dist-label-row{
  display:flex;
  align-items:center;
  gap:8px;
  margin-bottom:6px;
}

.dist-label{
  font-size:11px;
  font-weight:600;
  color:var(--text-muted);
  text-transform:uppercase;
  letter-spacing:1.2px;
}

.dist-live{
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:2px 8px;
  border-radius:var(--r-full);
  background:var(--safe-bg);
  border:1px solid var(--safe-border);
  font-size:9px;
  font-weight:700;
  color:var(--safe);
  text-transform:uppercase;
  letter-spacing:0.3px;
}

.dist-live-dot{
  width:5px;height:5px;
  border-radius:50%;
  background:var(--safe);
  animation:blinkDot 1.5s infinite;
}

@keyframes blinkDot{
  0%,100%{opacity:1;}
  50%{opacity:0.25;}
}

.dist-hero-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:20px;
}

.dist-value-group{
  display:flex;
  align-items:baseline;
  gap:5px;
}

.dist-number{
  font-family:'Space Grotesk',sans-serif;
  font-size:60px;
  font-weight:700;
  line-height:1;
  color:var(--text-primary);
  letter-spacing:-2px;
  transition:color 0.4s;
}

.dist-cm{
  font-size:20px;
  font-weight:400;
  color:var(--text-muted);
}

/* Circular gauge */
.gauge-wrapper{
  width:72px;height:72px;
  position:relative;
  flex-shrink:0;
}

.gauge-wrapper svg{
  width:72px;height:72px;
  transform:rotate(-90deg);
}

.gauge-bg{
  fill:none;
  stroke:var(--border);
  stroke-width:6;
}

.gauge-value{
  fill:none;
  stroke:var(--safe);
  stroke-width:6;
  stroke-linecap:round;
  stroke-dasharray:188.5;
  stroke-dashoffset:188.5;
  transition:stroke-dashoffset 0.6s ease,stroke 0.4s;
}

.gauge-label{
  position:absolute;
  inset:0;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
}

.gauge-pct{
  font-family:'JetBrains Mono',monospace;
  font-size:15px;
  font-weight:700;
  color:var(--text-primary);
  line-height:1;
}

.gauge-word{
  font-size:7px;
  font-weight:600;
  color:var(--text-muted);
  text-transform:uppercase;
  letter-spacing:0.5px;
  margin-top:2px;
}

/* Bar */
.dist-bar-wrap{margin-bottom:8px;}

.dist-bar-track{
  height:10px;
  background:var(--bg-input);
  border-radius:var(--r-full);
  overflow:hidden;
  box-shadow:inset 0 1px 2px rgba(0,0,0,0.04);
}

.dist-bar-fill{
  height:100%;
  border-radius:var(--r-full);
  background:linear-gradient(90deg,var(--safe),#34d399);
  width:0%;
  transition:width 0.5s ease,background 0.4s;
  position:relative;
}

.dist-bar-fill::after{
  content:'';
  position:absolute;
  top:0;right:0;bottom:0;
  width:40%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.35));
  border-radius:inherit;
}

.dist-markers{
  display:flex;
  justify-content:space-between;
  padding-top:6px;
}

.dist-marker{
  font-size:9px;
  color:var(--text-light);
  font-family:'JetBrains Mono',monospace;
  font-weight:500;
}

/*═══════════════════════════════════════
  ZONE STATUS
═══════════════════════════════════════*/
.zone-card{
  background:var(--bg-card-alt);
  border:1.5px solid var(--border);
  border-radius:var(--r-lg);
  padding:16px;
  display:flex;
  align-items:center;
  gap:14px;
  transition:all 0.4s;
}

.zone-icon-wrap{
  width:52px;height:52px;
  border-radius:var(--r-md);
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  flex-shrink:0;
  transition:background 0.4s;
  background:var(--safe-bg);
}

.zone-text{flex:1;}

.zone-title{
  font-family:'Space Grotesk',sans-serif;
  font-size:22px;
  font-weight:700;
  line-height:1;
  letter-spacing:0.5px;
  transition:color 0.4s;
  color:var(--safe);
}

.zone-desc{
  font-size:12px;
  color:var(--text-tertiary);
  margin-top:4px;
  font-weight:400;
}

.zone-badge{
  padding:5px 14px;
  border-radius:var(--r-full);
  font-size:10px;
  font-weight:700;
  letter-spacing:1px;
  text-transform:uppercase;
  color:#fff;
  background:var(--safe);
  transition:background 0.4s;
  white-space:nowrap;
  box-shadow:var(--shadow-sm);
}

/*═══════════════════════════════════════
  SOS CARD
═══════════════════════════════════════*/
.sos-card{
  background:var(--bg-card-alt);
  border:1.5px solid var(--border);
  border-radius:var(--r-lg);
  overflow:hidden;
  transition:all 0.4s;
}

.sos-card.active{
  border-color:var(--danger-border);
  background:var(--danger-bg);
  box-shadow:0 0 0 3px rgba(220,38,38,0.08),var(--shadow-md);
  animation:sosBorderPulse 1.5s infinite;
}

@keyframes sosBorderPulse{
  0%,100%{border-color:var(--danger-border);}
  50%{border-color:var(--danger);}
}

.sos-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:12px 16px;
  border-bottom:1px solid var(--border);
}

.sos-top-left{
  display:flex;
  align-items:center;
  gap:9px;
}

.sos-indicator{
  width:9px;height:9px;
  border-radius:50%;
  background:var(--safe);
  flex-shrink:0;
  transition:all 0.3s;
}

.sos-indicator.active{
  background:var(--danger);
  box-shadow:0 0 10px var(--danger),0 0 20px rgba(220,38,38,0.2);
  animation:sosGlow 0.8s infinite;
}

@keyframes sosGlow{
  0%,100%{box-shadow:0 0 10px var(--danger);}
  50%{box-shadow:0 0 20px var(--danger),0 0 35px rgba(220,38,38,0.15);}
}

.sos-top-label{
  font-size:11px;
  font-weight:600;
  color:var(--text-tertiary);
  text-transform:uppercase;
  letter-spacing:0.8px;
}

.sos-events-chip{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;
  font-weight:600;
  padding:3px 9px;
  border-radius:var(--r-full);
  background:var(--bg-card);
  border:1px solid var(--border);
  color:var(--text-muted);
}

.sos-body{padding:16px;}

.sos-status{
  font-family:'Space Grotesk',sans-serif;
  font-size:18px;
  font-weight:700;
  color:var(--safe);
  transition:color 0.3s;
  margin-bottom:4px;
}

.sos-status.alert{color:var(--danger);}

.sos-time{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;
  color:var(--text-muted);
}

.sos-link{
  display:inline-flex;
  align-items:center;
  gap:6px;
  margin-top:12px;
  padding:9px 16px;
  background:var(--primary);
  color:#fff;
  border-radius:var(--r-sm);
  text-decoration:none;
  font-size:12px;
  font-weight:600;
  box-shadow:0 2px 8px rgba(37,99,235,0.25);
  transition:all 0.2s;
}

.sos-link:hover{
  background:var(--primary-dark);
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(37,99,235,0.3);
}

/*═══════════════════════════════════════
  WEATHER CARD
═══════════════════════════════════════*/
.weather-card{
  background:var(--bg-card-alt);
  border:1.5px solid var(--border);
  border-radius:var(--r-lg);
  overflow:hidden;
}

.weather-top-bar{
  padding:12px 16px;
  border-bottom:1px solid var(--border);
  display:flex;
  align-items:center;
  justify-content:space-between;
}

.weather-loc{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;
  font-weight:600;
  color:var(--primary);
}

.weather-body{padding:16px;}

.weather-hero{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  margin-bottom:16px;
}

.weather-temp-big{
  font-family:'Space Grotesk',sans-serif;
  font-size:48px;
  font-weight:700;
  line-height:1;
  color:var(--text-primary);
  letter-spacing:-1.5px;
}

.weather-temp-c{
  font-size:18px;
  color:var(--text-muted);
  font-weight:400;
}

.weather-sky{
  font-size:13px;
  color:var(--text-tertiary);
  text-transform:capitalize;
  margin-top:4px;
}

.weather-big-icon{
  font-size:52px;
  line-height:1;
  filter:drop-shadow(0 2px 6px rgba(0,0,0,0.08));
}

.weather-grid{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px;
  margin-bottom:14px;
}

.weather-stat{
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:var(--r-md);
  padding:12px;
  transition:all 0.2s;
}

.weather-stat:hover{
  border-color:var(--border-focus);
  box-shadow:var(--shadow-sm);
}

.weather-stat-icon{font-size:16px;margin-bottom:4px;}

.weather-stat-label{
  font-size:9px;
  font-weight:600;
  color:var(--text-muted);
  text-transform:uppercase;
  letter-spacing:1px;
}

.weather-stat-val{
  font-family:'JetBrains Mono',monospace;
  font-size:18px;
  font-weight:700;
  color:var(--text-primary);
  margin-top:3px;
}

.weather-alert{
  display:none;
  padding:10px 14px;
  border-radius:var(--r-sm);
  font-size:12px;
  font-weight:600;
  align-items:center;
  gap:8px;
}

.weather-alert.ok{
  display:flex;
  background:var(--safe-bg);
  border:1px solid var(--safe-border);
  color:var(--safe);
}

.weather-alert.bad{
  display:flex;
  background:var(--danger-bg);
  border:1px solid var(--danger-border);
  color:var(--danger);
  animation:alertPulse 2.5s infinite;
}

@keyframes alertPulse{
  0%,100%{border-color:var(--danger-border);}
  50%{border-color:var(--danger);}
}

/*═══════════════════════════════════════
  HISTORY
═══════════════════════════════════════*/
.history-entries{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.history-row{
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:var(--r-md);
  padding:12px 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  position:relative;
  transition:all 0.2s;
  overflow:hidden;
}

.history-row::before{
  content:'';
  position:absolute;
  left:0;top:0;bottom:0;
  width:3px;
  background:var(--danger);
  border-radius:0 3px 3px 0;
}

.history-row:hover{
  border-color:var(--border-focus);
  box-shadow:var(--shadow-sm);
  transform:translateX(3px);
}

.history-row-info{
  display:flex;
  flex-direction:column;
  gap:1px;
  padding-left:8px;
}

.history-row-id{
  font-family:'Space Grotesk',sans-serif;
  font-size:14px;
  font-weight:700;
  color:var(--danger);
}

.history-row-time{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;
  color:var(--text-muted);
}

.history-map-link{
  padding:6px 12px;
  background:var(--primary-light);
  color:var(--primary);
  border:1px solid rgba(37,99,235,0.15);
  border-radius:var(--r-sm);
  text-decoration:none;
  font-size:11px;
  font-weight:600;
  transition:all 0.2s;
  display:inline-flex;
  align-items:center;
  gap:4px;
}

.history-map-link:hover{
  background:rgba(37,99,235,0.12);
  border-color:rgba(37,99,235,0.3);
}

.empty-box{
  text-align:center;
  padding:28px;
  color:var(--text-muted);
  border:1.5px dashed var(--border);
  border-radius:var(--r-lg);
  background:var(--bg-card-alt);
}

.empty-box-icon{font-size:32px;margin-bottom:8px;opacity:0.6;}
.empty-box-text{font-size:13px;font-weight:500;color:var(--text-tertiary);}

/*═══════════════════════════════════════
  SIDEBAR FOOTER
═══════════════════════════════════════*/
.sidebar-foot{
  padding:20px;
  text-align:center;
  border-top:1px solid var(--border);
  background:var(--bg-card-alt);
}

.foot-brand{
  font-family:'Space Grotesk',sans-serif;
  font-size:14px;
  font-weight:700;
  color:var(--text-muted);
  letter-spacing:2px;
}

.foot-tag{
  font-size:10px;
  color:var(--text-muted);
  margin-top:2px;
}

.foot-credit{
  margin-top:10px;
  font-size:10px;
  color:var(--text-muted);
}

.foot-credit strong{
  color:var(--text-secondary);
}

/*═══════════════════════════════════════
  MAP PANEL
═══════════════════════════════════════*/
.map-container{
  position:relative;
  background:#f8f9fb;
}

#map{
  width:100%;
  height:100%;
}

.map-float-el{
  position:absolute;
  z-index:800;
  pointer-events:none;
}

.map-coords-box{
  top:16px;left:16px;
  background:rgba(255,255,255,0.95);
  backdrop-filter:blur(12px);
  border:1px solid var(--border);
  border-radius:var(--r-md);
  padding:14px 18px;
  pointer-events:auto;
  box-shadow:var(--shadow-md);
  min-width:220px;
}

.map-coords-heading{
  font-size:9px;
  font-weight:700;
  color:var(--text-muted);
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin-bottom:6px;
  display:flex;
  align-items:center;
  gap:6px;
}

.map-coords-val{
  font-family:'JetBrains Mono',monospace;
  font-size:13px;
  font-weight:600;
  color:var(--primary);
}

.map-sos-box{
  top:16px;right:16px;
  background:rgba(254,242,242,0.95);
  backdrop-filter:blur(12px);
  border:1.5px solid var(--danger-border);
  border-radius:var(--r-md);
  padding:14px 18px;
  display:none;
  pointer-events:auto;
  box-shadow:var(--shadow-md);
}

.map-sos-box.active{
  display:block;
  animation:mapSosBlink 1.2s infinite;
}

@keyframes mapSosBlink{
  0%,100%{opacity:1;border-color:var(--danger-border);}
  50%{opacity:0.75;border-color:var(--danger);}
}

.map-sos-label{
  font-family:'Space Grotesk',sans-serif;
  font-size:15px;
  font-weight:700;
  color:var(--danger);
  display:flex;
  align-items:center;
  gap:6px;
}

.map-sos-sub{
  font-size:11px;
  color:rgba(220,38,38,0.7);
  margin-top:3px;
}

/* Bottom info bar */
.map-bottom-bar{
  bottom:16px;left:16px;right:16px;
  display:flex;
  gap:10px;
  pointer-events:auto;
}

.map-chip{
  background:rgba(255,255,255,0.95);
  backdrop-filter:blur(12px);
  border:1px solid var(--border);
  border-radius:var(--r-sm);
  padding:10px 14px;
  display:flex;
  align-items:center;
  gap:8px;
  font-size:12px;
  color:var(--text-secondary);
  box-shadow:var(--shadow-sm);
  font-weight:500;
}

.map-chip-val{
  font-family:'JetBrains Mono',monospace;
  font-weight:700;
  color:var(--text-primary);
}

/*═══════════════════════════════════════
  MAP MARKER
═══════════════════════════════════════*/
.pin-marker{
  width:20px;height:20px;
  background:var(--primary);
  border:3px solid #fff;
  border-radius:50%;
  box-shadow:0 0 0 3px rgba(37,99,235,0.2),0 2px 10px rgba(0,0,0,0.15);
  animation:pinBreathe 3s ease-in-out infinite;
  position:relative;
}

.pin-marker::after{
  content:'';
  position:absolute;
  top:50%;left:50%;
  transform:translate(-50%,-50%);
  width:6px;height:6px;
  background:#fff;
  border-radius:50%;
}

@keyframes pinBreathe{
  0%,100%{box-shadow:0 0 0 3px rgba(37,99,235,0.2),0 2px 10px rgba(0,0,0,0.15);}
  50%{box-shadow:0 0 0 8px rgba(37,99,235,0.08),0 2px 10px rgba(0,0,0,0.15);}
}

.pin-marker.sos{
  background:var(--danger);
  box-shadow:0 0 0 3px rgba(220,38,38,0.25),0 2px 10px rgba(0,0,0,0.15);
  animation:pinSOS 0.6s infinite;
}

@keyframes pinSOS{
  0%,100%{transform:scale(1);box-shadow:0 0 0 3px rgba(220,38,38,0.25),0 0 18px rgba(220,38,38,0.2);}
  50%{transform:scale(1.35);box-shadow:0 0 0 8px rgba(220,38,38,0.1),0 0 30px rgba(220,38,38,0.15);}
}

/* Leaflet clean overrides */
.leaflet-container{
  background:#f8f9fb;
  font-family:'Plus Jakarta Sans',sans-serif;
}

.leaflet-control-zoom a{
  background:#fff !important;
  border-color:var(--border) !important;
  color:var(--text-secondary) !important;
  width:32px !important;
  height:32px !important;
  line-height:32px !important;
  font-size:16px !important;
  box-shadow:var(--shadow-sm) !important;
  transition:all 0.2s !important;
}

.leaflet-control-zoom a:hover{
  background:var(--bg-card-alt) !important;
  color:var(--text-primary) !important;
}

.leaflet-control-zoom{
  border:none !important;
  box-shadow:none !important;
}

.leaflet-control-attribution{
  background:rgba(255,255,255,0.85) !important;
  color:var(--text-muted) !important;
  font-size:9px !important;
}

.leaflet-popup-content-wrapper{
  background:#fff !important;
  border:1px solid var(--border) !important;
  border-radius:var(--r-md) !important;
  box-shadow:var(--shadow-lg) !important;
  color:var(--text-primary) !important;
}

.leaflet-popup-tip{
  background:#fff !important;
}

/*═══════════════════════════════════════
  ANIMATIONS
═══════════════════════════════════════*/
@keyframes slideUp{
  from{opacity:0;transform:translateY(10px);}
  to{opacity:1;transform:translateY(0);}
}

.sidebar>*{animation:slideUp 0.4s ease both;}
.sidebar>*:nth-child(1){animation-delay:0.03s;}
.sidebar>*:nth-child(2){animation-delay:0.06s;}
.sidebar>*:nth-child(3){animation-delay:0.09s;}
.sidebar>*:nth-child(4){animation-delay:0.12s;}
.sidebar>*:nth-child(5){animation-delay:0.15s;}
.sidebar>*:nth-child(6){animation-delay:0.18s;}
.sidebar>*:nth-child(7){animation-delay:0.21s;}
.sidebar>*:nth-child(8){animation-delay:0.24s;}

/*═══════════════════════════════════════
  RESPONSIVE
═══════════════════════════════════════*/
@media(max-width:900px){
  .main-layout{
    grid-template-columns:1fr;
    grid-template-rows:auto 50vh;
  }
  .sidebar{
    border-right:none;
    border-bottom:1px solid var(--border);
    max-height:55vh;
  }
  .nav-divider,.nav-student{display:none;}
  .dist-number{font-size:44px;}
  .map-bottom-bar{flex-wrap:wrap;}
}

@media(max-width:480px){
  .navbar{padding:0 12px;}
  .nav-name{font-size:14px;}
  .project-banner{flex-wrap:wrap;}
  .project-tag{order:3;margin-top:4px;}
  .dist-number{font-size:38px;}
  .gauge-wrapper{display:none;}
  .weather-temp-big{font-size:36px;}
  .clock-chip{display:none;}
}
</style>
</head>
<body>

<!-- ═══════ NAVBAR ═══════ -->
<nav class="navbar">
  <div class="nav-left">
    <div class="nav-logo-box">VIC</div>
    <div class="nav-info">
      <div class="nav-name">VIC ALERT SYSTEM</div>
      <div class="nav-desc">IoT Safety Wearable for the Visually Impaired</div>
    </div>
    <div class="nav-divider"></div>
    <div class="nav-student">
      <div class="nav-student-name">Okechukwu Victor Nnaogo</div>
      <div class="nav-student-id">PAS/CSC/21/073</div>
    </div>
  </div>
  <div class="nav-right">
    <div class="live-badge online" id="liveBadge">
      <span class="live-dot on" id="liveDot"></span>
      <span id="liveText">Connecting</span>
    </div>
    <span class="clock-chip" id="clockChip">--:--:--</span>
  </div>
</nav>

<!-- ═══════ MAIN LAYOUT ═══════ -->
<div class="main-layout">

  <!-- ── SIDEBAR ── -->
  <aside class="sidebar">

    <!-- Project Banner -->
    <div class="project-banner">
      <div class="project-avatar">OV</div>
      <div class="project-details">
        <div class="project-owner">Okechukwu Victor Nnaogo</div>
        <div class="project-id">PAS/CSC/21/073</div>
        <div class="project-dept">Department of Computer Science</div>
      </div>
      <div class="project-tag">Final Year Project</div>
    </div>

    <!-- Distance -->
    <div class="distance-panel">
      <div class="dist-label-row">
        <span class="dist-label">Obstacle Distance</span>
        <span class="dist-live"><span class="dist-live-dot"></span>LIVE</span>
      </div>
      <div class="dist-hero-row">
        <div class="dist-value-group">
          <span class="dist-number" id="distNum">—</span>
          <span class="dist-cm" id="distUnit">cm</span>
        </div>
        <div class="gauge-wrapper">
          <svg viewBox="0 0 72 72">
            <circle class="gauge-bg" cx="36" cy="36" r="30"/>
            <circle class="gauge-value" id="gaugeVal" cx="36" cy="36" r="30"/>
          </svg>
          <div class="gauge-label">
            <span class="gauge-pct" id="gaugePct">0%</span>
            <span class="gauge-word">proximity</span>
          </div>
        </div>
      </div>
      <div class="dist-bar-wrap">
        <div class="dist-bar-track">
          <div class="dist-bar-fill" id="distBar"></div>
        </div>
        <div class="dist-markers">
          <span class="dist-marker">0</span>
          <span class="dist-marker">50</span>
          <span class="dist-marker">100</span>
          <span class="dist-marker">150</span>
          <span class="dist-marker">200</span>
          <span class="dist-marker">300</span>
        </div>
      </div>
    </div>

    <!-- Zone -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-icon green">🛡️</div>
        <div class="panel-title-group">
          <div class="panel-title">Safety Zone</div>
          <div class="panel-subtitle">Current threat level assessment</div>
        </div>
      </div>
      <div class="zone-card" id="zoneCard">
        <div class="zone-icon-wrap" id="zoneIconWrap">
          <span id="zoneIcon">✅</span>
        </div>
        <div class="zone-text">
          <div class="zone-title" id="zoneTitle">SAFE</div>
          <div class="zone-desc" id="zoneDesc">No obstacles detected</div>
        </div>
        <div class="zone-badge" id="zoneBadge">SAFE</div>
      </div>
    </div>

    <!-- SOS -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-icon red">🚨</div>
        <div class="panel-title-group">
          <div class="panel-title">Emergency Status</div>
          <div class="panel-subtitle">SOS alert monitoring</div>
        </div>
      </div>
      <div class="sos-card" id="sosCard">
        <div class="sos-top">
          <div class="sos-top-left">
            <div class="sos-indicator" id="sosInd"></div>
            <span class="sos-top-label">SOS Monitor</span>
          </div>
          <span class="sos-events-chip" id="sosChip">0 events</span>
        </div>
        <div class="sos-body">
          <div class="sos-status" id="sosStatus">System Normal</div>
          <div class="sos-time" id="sosTime">Last SOS: Never</div>
          <div id="sosActions"></div>
        </div>
      </div>
    </div>

    <!-- Weather -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-icon amber">☀️</div>
        <div class="panel-title-group">
          <div class="panel-title">Weather Intelligence</div>
          <div class="panel-subtitle">Live environmental conditions</div>
        </div>
      </div>
      <div class="weather-card">
        <div class="weather-top-bar">
          <span class="sos-top-label">Current Conditions</span>
          <span class="weather-loc" id="wLoc">Lagos, NG</span>
        </div>
        <div class="weather-body">
          <div class="weather-hero">
            <div>
              <div>
                <span class="weather-temp-big" id="wTemp">—</span>
                <span class="weather-temp-c">°C</span>
              </div>
              <div class="weather-sky" id="wSky">Fetching...</div>
            </div>
            <div class="weather-big-icon" id="wBigIcon">🌤️</div>
          </div>
          <div class="weather-grid">
            <div class="weather-stat">
              <div class="weather-stat-icon">💧</div>
              <div class="weather-stat-label">Humidity</div>
              <div class="weather-stat-val" id="wHum">—%</div>
            </div>
            <div class="weather-stat">
              <div class="weather-stat-icon">💨</div>
              <div class="weather-stat-label">Wind Speed</div>
              <div class="weather-stat-val" id="wWind">— m/s</div>
            </div>
          </div>
          <div class="weather-alert" id="wAlert"></div>
        </div>
      </div>
    </div>

    <!-- History -->
    <div class="panel">
      <div class="panel-header">
        <div class="panel-icon purple">📋</div>
        <div class="panel-title-group">
          <div class="panel-title">SOS Event History</div>
          <div class="panel-subtitle">Recent emergency activations</div>
        </div>
        <div class="panel-badge" id="histTotal">0 total</div>
      </div>
      <div class="history-entries" id="histList">
        <div class="empty-box">
          <div class="empty-box-icon">📭</div>
          <div class="empty-box-text">No SOS events recorded yet</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="sidebar-foot">
      <div class="foot-brand">VIC ALERT</div>
      <div class="foot-tag">Smart Safety System for the Visually Impaired</div>
      <div class="foot-credit">
        Designed &amp; Built by <strong>Okechukwu Victor Nnaogo</strong><br>
        <span style="font-size:9px">PAS/CSC/21/073 · Computer Science · Final Year Project 2025</span>
      </div>
    </div>

  </aside>

  <!-- ── MAP ── -->
  <div class="map-container">
    <div id="map"></div>

    <div class="map-float-el map-coords-box" id="coordsBox">
      <div class="map-coords-heading">
        <span>📍</span> Last Known Position
      </div>
      <div class="map-coords-val" id="coordsVal">Waiting for GPS signal...</div>
    </div>

    <div class="map-float-el map-sos-box" id="mapSosBox">
      <div class="map-sos-label">🚨 SOS ACTIVE</div>
      <div class="map-sos-sub">Emergency signal in progress</div>
    </div>

    <div class="map-float-el map-bottom-bar" id="mapBar">
      <div class="map-chip">
        📡 System: <span class="map-chip-val" id="mSys">ACTIVE</span>
      </div>
      <div class="map-chip">
        🛡️ Zone: <span class="map-chip-val" id="mZone">SAFE</span>
      </div>
      <div class="map-chip">
        📏 Distance: <span class="map-chip-val" id="mDist">—</span>
      </div>
    </div>
  </div>

</div>

<script>
/*═══════════════════════════════════════
  ZONE CONFIGURATIONS
═══════════════════════════════════════*/
const ZONES={
  'SAFE':    {c:'#059669',bg:'#ecfdf5',bd:'#a7f3d0',icon:'✅',desc:'No obstacles detected',    grad:'linear-gradient(90deg,#059669,#34d399)'},
  'CAUTION': {c:'#d97706',bg:'#fffbeb',bd:'#fde68a',icon:'⚠️',desc:'Obstacle at 100–150 cm',  grad:'linear-gradient(90deg,#d97706,#fbbf24)'},
  'WARNING': {c:'#ea580c',bg:'#fff7ed',bd:'#fed7aa',icon:'⚡',desc:'Obstacle at 50–100 cm',   grad:'linear-gradient(90deg,#ea580c,#fb923c)'},
  'DANGER':  {c:'#dc2626',bg:'#fef2f2',bd:'#fecaca',icon:'🚨',desc:'Obstacle at 20–50 cm',    grad:'linear-gradient(90deg,#dc2626,#f87171)'},
  'CRITICAL':{c:'#991b1b',bg:'#fef2f2',bd:'#fca5a5',icon:'🔴',desc:'Obstacle under 20 cm!',   grad:'linear-gradient(90deg,#991b1b,#dc2626)'}
};

const WX={2:'⛈️',3:'🌧️',5:'🌧️',6:'❄️',7:'🌫️',8:'⛅'};
function wxI(id){
  if(id===800) return '☀️';
  if(id===801) return '🌤️';
  if(id>=802) return '☁️';
  return WX[Math.floor(id/100)]||'🌤️';
}

/*═══════════════════════════════════════
  LEAFLET MAP — CLEAN WHITE TILE
═══════════════════════════════════════*/
const map=L.map('map',{center:[6.5244,3.3792],zoom:15,zoomControl:true});

// ✅ CLEAN WHITE MAP TILES
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains:'abcd',
  maxZoom:20
}).addTo(map);

const pinNormal=L.divIcon({
  html:'<div class="pin-marker"></div>',
  className:'',
  iconSize:[20,20],
  iconAnchor:[10,10]
});

const pinSOS=L.divIcon({
  html:'<div class="pin-marker sos"></div>',
  className:'',
  iconSize:[20,20],
  iconAnchor:[10,10]
});

let marker=null,trail=null,trailPts=[],firstView=false,lastT=0;
const sosLayer=L.layerGroup().addTo(map);

function moveMarker(lat,lng,sos){
  const ic=sos?pinSOS:pinNormal;
  if(!marker){marker=L.marker([lat,lng],{icon:ic}).addTo(map);}
  else{marker.setLatLng([lat,lng]);marker.setIcon(ic);}
  if(!firstView){map.setView([lat,lng],16);firstView=true;}
  trailPts.push([lat,lng]);
  if(trailPts.length>100) trailPts.shift();
  if(trail) map.removeLayer(trail);
  if(trailPts.length>1){
    trail=L.polyline(trailPts,{color:'#2563eb',weight:3,opacity:0.45,dashArray:'8 6',lineCap:'round'}).addTo(map);
  }
  document.getElementById('coordsVal').textContent=lat.toFixed(6)+', '+lng.toFixed(6);
}

/*═══════════════════════════════════════
  DATA FETCH
═══════════════════════════════════════*/
const $=id=>document.getElementById(id);

async function pull(){
  try{
    const r=await fetch('/data');
    const d=await r.json();
    lastT=Date.now();

    // Status
    $('liveDot').className='live-dot on';
    $('liveBadge').className='live-badge online';
    $('liveText').textContent='Live';
    $('clockChip').textContent=d.lastUpdate;

    // Distance
    const dist=parseFloat(d.distance);
    const clear=dist>=999;
    $('distNum').textContent=clear?'CLEAR':dist.toFixed(1);
    $('distUnit').textContent=clear?'':'cm';

    const pct=clear?0:Math.max(0,Math.min(100,(1-dist/300)*100));
    const z=d.zone||'SAFE';
    const zc=ZONES[z]||ZONES['SAFE'];

    $('distBar').style.width=pct+'%';
    $('distBar').style.background=zc.grad;
    $('distNum').style.color=clear?'#111827':zc.c;

    // Gauge
    const circ=2*Math.PI*30;
    $('gaugeVal').style.strokeDashoffset=circ-(pct/100)*circ;
    $('gaugeVal').style.stroke=zc.c;
    $('gaugePct').textContent=Math.round(pct)+'%';
    $('gaugePct').style.color=zc.c;

    // Zone
    $('zoneIcon').textContent=zc.icon;
    $('zoneIconWrap').style.background=zc.bg;
    $('zoneTitle').textContent=z;
    $('zoneTitle').style.color=zc.c;
    $('zoneDesc').textContent=zc.desc;
    $('zoneBadge').textContent=z;
    $('zoneBadge').style.background=zc.c;
    $('zoneBadge').style.color=z==='CAUTION'?'#111827':'#fff';
    $('zoneCard').style.borderColor=zc.bd;
    $('zoneCard').style.background=zc.bg;

    // Map chips
    $('mZone').textContent=z;
    $('mZone').style.color=zc.c;
    $('mDist').textContent=clear?'CLEAR':dist.toFixed(0)+' cm';
    $('mSys').textContent=d.systemStatus||'ACTIVE';

    // SOS
    const sos=d.sosActive;
    if(sos){
      $('sosCard').classList.add('active');
      $('sosInd').classList.add('active');
      $('sosStatus').textContent='🚨 EMERGENCY ACTIVE';
      $('sosStatus').classList.add('alert');
      $('mapSosBox').classList.add('active');
      if(marker) marker.setIcon(pinSOS);
    }else{
      $('sosCard').classList.remove('active');
      $('sosInd').classList.remove('active');
      $('sosStatus').textContent='System Normal';
      $('sosStatus').classList.remove('alert');
      $('mapSosBox').classList.remove('active');
      if(marker) marker.setIcon(pinNormal);
    }

    $('sosChip').textContent=d.sosCount+' event'+(d.sosCount!==1?'s':'');
    $('sosTime').textContent='Last SOS: '+(d.lastSosTime||'Never');

    const act=$('sosActions');
    if(d.mapsLink&&d.mapsLink!==''){
      act.innerHTML='<a class="sos-link" href="'+d.mapsLink+'" target="_blank"><span>📍</span> Open in Maps</a>';
    }else{act.innerHTML='';}

    // Weather
    $('wTemp').textContent=d.temperature?d.temperature.toFixed(1):'—';
    $('wSky').textContent=d.weather||'Unknown';
    $('wBigIcon').textContent=wxI(d.weatherId||800);
    $('wHum').textContent=(d.humidity||0)+'%';
    $('wWind').textContent=(d.windSpeed||0).toFixed(1)+' m/s';

    const wa=$('wAlert');
    if(d.weatherAlert&&d.weatherAlert!=='None'){
      wa.innerHTML='<span>⚠️</span><span>'+d.weatherAlert+'</span>';
      wa.className='weather-alert bad';
    }else if(d.weather&&d.weather!=='Fetching...'){
      wa.innerHTML='<span>✅</span><span>Conditions safe for travel</span>';
      wa.className='weather-alert ok';
    }else{wa.className='weather-alert';}

    // Map
    const lat=parseFloat(d.lat),lng=parseFloat(d.lng);
    if(d.hasLocation&&lat&&lng) moveMarker(lat,lng,sos);

    sosLayer.clearLayers();
    if(d.sosHistory&&d.sosHistory.length>0){
      d.sosHistory.forEach(e=>{
        if(e.lat&&e.lng){
          const cm=L.circleMarker([e.lat,e.lng],{
            radius:7,fillColor:'#dc2626',color:'#fff',weight:2,opacity:1,fillOpacity:0.85
          }).addTo(sosLayer);
          cm.bindPopup('<div style="font-family:Plus Jakarta Sans,sans-serif;padding:4px"><b style="color:#dc2626;font-size:13px">SOS #'+e.count+'</b><br><span style="font-size:11px;color:#6b7280">'+e.time+'</span></div>');
        }
      });
    }

    // History
    const h=d.sosHistory||[];
    const hl=$('histList');
    $('histTotal').textContent=h.length+' total';

    if(h.length===0){
      hl.innerHTML='<div class="empty-box"><div class="empty-box-icon">📭</div><div class="empty-box-text">No SOS events recorded yet</div></div>';
    }else{
      hl.innerHTML=h.map(x=>{
        const btn=x.location?'<a class="history-map-link" href="'+x.location+'" target="_blank"><span>📍</span> Map</a>':'<span style="color:#9ca3af;font-size:10px">No GPS</span>';
        return '<div class="history-row"><div class="history-row-info"><span class="history-row-id">SOS #'+x.count+'</span><span class="history-row-time">'+x.time+'</span></div>'+btn+'</div>';
      }).join('');
    }

  }catch(e){
    $('liveDot').className='live-dot off';
    $('liveBadge').className='live-badge offline';
    $('liveText').textContent='Offline';
  }
}

pull();
setInterval(pull,3000);

setInterval(()=>{
  if(lastT>0&&Date.now()-lastT>15000){
    $('liveDot').className='live-dot off';
    $('liveBadge').className='live-badge offline';
    $('liveText').textContent='Device Offline';
  }
},5000);
<\/script>
</body>
</html>`);
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{console.log('VIC Alert Server on port '+PORT);});
