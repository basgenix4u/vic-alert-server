const express = require('express');
const cors    = require('cors');
const app     = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let deviceData = {
  distance:999,zone:"SAFE",sosCount:0,sosActive:false,lastSosTime:"Never",
  mapsLink:"",weather:"Fetching...",temperature:0,humidity:0,windSpeed:0,
  weatherId:800,weatherAlert:"None",systemStatus:"ACTIVE",lastUpdate:"Never",
  ipAddress:"",lat:0,lng:0,hasLocation:false
};
let sosHistory = [];
let locationHistory = [];

app.all('/update', (req, res) => {
  const d = { ...req.query, ...req.body };

  console.log('UPDATE RECEIVED:', d);

  deviceData.distance = parseFloat(d.distance) || 999;
  deviceData.zone = d.zone || "SAFE";
  deviceData.sosCount = parseInt(d.sosCount) || 0;
  deviceData.sosActive = d.sosActive === "true" || d.sosActive === true;
  deviceData.mapsLink = d.mapsLink || "";
  deviceData.weather = d.weather || "Unknown";
  deviceData.temperature = parseFloat(d.temperature) || 0;
  deviceData.humidity = parseFloat(d.humidity) || 0;
  deviceData.windSpeed = parseFloat(d.windSpeed) || 0;
  deviceData.weatherId = parseInt(d.weatherId) || 800;
  deviceData.weatherAlert = d.weatherAlert || "None";
  deviceData.systemStatus = d.systemStatus || "ACTIVE";
  deviceData.ipAddress = d.ipAddress || "";

  deviceData.lastUpdate = new Date().toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const lat = parseFloat(d.lat ?? d.latitude ?? d.Latitude);
  const lng = parseFloat(d.lng ?? d.lon ?? d.longitude ?? d.Longitude);

  if (!Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0) {
    deviceData.lat = lat;
    deviceData.lng = lng;
    deviceData.hasLocation = true;

    locationHistory.push({ lat, lng, time: deviceData.lastUpdate });
    if (locationHistory.length > 50) locationHistory.shift();
  }

  if (deviceData.sosActive) {
    sosHistory.unshift({
      time: deviceData.lastUpdate,
      location: deviceData.mapsLink,
      lat: deviceData.lat,
      lng: deviceData.lng,
      count: deviceData.sosCount
    });
    if (sosHistory.length > 20) sosHistory.pop();
  }

  res.json({
    status: "ok",
    savedLat: deviceData.lat,
    savedLng: deviceData.lng,
    hasLocation: deviceData.hasLocation
  });
});

app.get('/data',(req,res)=>{
  res.json({...deviceData,sosHistory,locationHistory});
});

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
/*═══════════════════════════════════════════════════
  VIC ALERT SYSTEM — NATURE THEMED PREMIUM DASHBOARD
  Okechukwu Victor Nnaogo | PAS/CSC/21/073
  Color Palette: Light Green · Yellow-Green · Olive · Deep Walnut
═══════════════════════════════════════════════════*/

:root{
  /* Custom Palette */
  --light-green:#8cff98;
  --yellow-green:#aad922;
  --olive:#6f7c12;
  --deep-walnut:#483519;

  /* Extended Palette */
  --green-soft:#c8ffd0;
  --green-pale:#e8ffeb;
  --green-vivid:#5ce06b;
  --olive-light:#a0b030;
  --olive-pale:#f0f4d8;
  --walnut-light:#6b5230;
  --walnut-pale:#f5f0e8;
  --walnut-dark:#2e2010;

  /* Backgrounds */
  --bg-body:#f7f9f4;
  --bg-sidebar:#ffffff;
  --bg-card:#ffffff;
  --bg-card-alt:#fafcf7;
  --bg-hover:#f2f7ed;
  --bg-input:#f3f6ef;

  /* Primary uses olive as main accent */
  --primary:#6f7c12;
  --primary-light:#e8edcc;
  --primary-dark:#555f0e;
  --primary-vivid:#aad922;

  /* Status Colors */
  --safe:#2d8a3e;
  --safe-bg:#edfaef;
  --safe-border:#b0e8ba;
  --caution:#b8860b;
  --caution-bg:#fdf8ec;
  --caution-border:#f0dca0;
  --warning:#c65d07;
  --warning-bg:#fef5ec;
  --warning-border:#f8d4a8;
  --danger:#c52020;
  --danger-bg:#fdf0f0;
  --danger-border:#f0b8b8;
  --critical:#8b1a1a;
  --critical-bg:#fceded;
  --critical-border:#e8a0a0;

  /* Text */
  --text-primary:#2e2010;
  --text-secondary:#5c4a35;
  --text-tertiary:#7a6b58;
  --text-muted:#a09580;
  --text-light:#c8bfb0;

  /* Border */
  --border:#e8e2d8;
  --border-light:#f0ece5;
  --border-focus:#aad922;

  /* Shadows */
  --shadow-xs:0 1px 2px rgba(72,53,25,0.04);
  --shadow-sm:0 1px 3px rgba(72,53,25,0.06),0 1px 2px rgba(72,53,25,0.04);
  --shadow-md:0 4px 6px -1px rgba(72,53,25,0.06),0 2px 4px -2px rgba(72,53,25,0.04);
  --shadow-lg:0 10px 15px -3px rgba(72,53,25,0.07),0 4px 6px -4px rgba(72,53,25,0.04);
  --shadow-xl:0 20px 25px -5px rgba(72,53,25,0.07),0 8px 10px -6px rgba(72,53,25,0.04);

  /* Radius */
  --r-sm:8px;
  --r-md:12px;
  --r-lg:16px;
  --r-xl:20px;
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
  TOP NAVIGATION BAR
═══════════════════════════════════════*/
.navbar{
  position:fixed;
  top:0;left:0;right:0;
  z-index:1000;
  height:64px;
  background:var(--deep-walnut);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 24px;
  box-shadow:0 2px 12px rgba(46,32,16,0.15);
}

.nav-left{display:flex;align-items:center;gap:14px;}

.nav-logo-wrap{
  width:40px;height:40px;
  background:linear-gradient(135deg,var(--yellow-green),var(--light-green));
  border-radius:10px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:'Space Grotesk',sans-serif;
  font-size:15px;
  font-weight:800;
  color:var(--deep-walnut);
  letter-spacing:0.5px;
  flex-shrink:0;
  box-shadow:0 2px 10px rgba(170,217,34,0.3);
  position:relative;
}

.nav-logo-wrap::after{
  content:'';
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:linear-gradient(135deg,rgba(255,255,255,0.3) 0%,transparent 50%);
}

.nav-logo-ring{
  position:absolute;
  inset:-3px;
  border:2px solid rgba(170,217,34,0.3);
  border-radius:13px;
  animation:ringPulse 3s ease-in-out infinite;
}

@keyframes ringPulse{
  0%,100%{opacity:0.3;transform:scale(1);}
  50%{opacity:0.6;transform:scale(1.04);}
}

.nav-info{display:flex;flex-direction:column;}
.nav-title{
  font-family:'Space Grotesk',sans-serif;
  font-size:18px;font-weight:700;
  color:#ffffff;letter-spacing:1px;line-height:1.2;
}
.nav-desc{
  font-size:11px;color:rgba(255,255,255,0.55);
  font-weight:400;line-height:1.2;
}

.nav-sep{width:1px;height:32px;background:rgba(255,255,255,0.12);margin:0 8px;}

.nav-author{display:flex;flex-direction:column;}
.nav-author-name{font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);line-height:1.3;}
.nav-author-id{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;font-weight:600;
  color:var(--yellow-green);line-height:1.3;
}

.nav-right{display:flex;align-items:center;gap:10px;}

.status-pill{
  display:flex;align-items:center;gap:7px;
  padding:6px 14px;border-radius:var(--r-full);
  font-size:12px;font-weight:600;
  transition:all 0.3s;
}

.status-pill.on{
  background:rgba(140,255,152,0.15);
  color:var(--light-green);
  border:1px solid rgba(140,255,152,0.3);
}

.status-pill.off{
  background:rgba(197,32,32,0.15);
  color:#ff8888;
  border:1px solid rgba(197,32,32,0.3);
}

.s-dot{
  width:7px;height:7px;border-radius:50%;flex-shrink:0;
  position:relative;
}

.s-dot.on{background:var(--light-green);}
.s-dot.on::after{
  content:'';position:absolute;inset:-3px;border-radius:50%;
  border:2px solid var(--light-green);opacity:0;
  animation:dotPing 2s cubic-bezier(0,0,0.2,1) infinite;
}

@keyframes dotPing{
  0%{transform:scale(0.8);opacity:0.7;}
  75%,100%{transform:scale(2.2);opacity:0;}
}

.s-dot.off{background:#ff6666;}

.time-chip{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;font-weight:500;
  color:rgba(255,255,255,0.45);
  background:rgba(255,255,255,0.08);
  border:1px solid rgba(255,255,255,0.1);
  padding:5px 12px;border-radius:var(--r-full);
}

/*═══════════════════════════════════════
  MAIN LAYOUT
═══════════════════════════════════════*/
.main-grid{
  display:grid;
  grid-template-columns:410px 1fr;
  height:calc(100vh - 64px);
  margin-top:64px;
}

/*═══════════════════════════════════════
  SIDEBAR
═══════════════════════════════════════*/
.sidebar{
  background:var(--bg-sidebar);
  border-right:1px solid var(--border);
  overflow-y:auto;overflow-x:hidden;
}

.sidebar::-webkit-scrollbar{width:4px;}
.sidebar::-webkit-scrollbar-track{background:transparent;}
.sidebar::-webkit-scrollbar-thumb{background:var(--border);border-radius:var(--r-full);}

/* Panels */
.pnl{padding:20px;border-bottom:1px solid var(--border);}
.pnl:last-child{border-bottom:none;}

.pnl-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;}

.pnl-ico{
  width:34px;height:34px;border-radius:var(--r-md);
  display:flex;align-items:center;justify-content:center;
  font-size:16px;flex-shrink:0;
}

.pnl-ico.nature{background:var(--green-pale);color:var(--safe);}
.pnl-ico.earth{background:var(--walnut-pale);color:var(--deep-walnut);}
.pnl-ico.alert{background:var(--danger-bg);color:var(--danger);}
.pnl-ico.sun{background:#fef9e7;color:var(--caution);}
.pnl-ico.leaf{background:var(--olive-pale);color:var(--olive);}

.pnl-titles{flex:1;}
.pnl-title{font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.2;}
.pnl-sub{font-size:10px;color:var(--text-muted);margin-top:1px;}

.pnl-tag{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;font-weight:600;
  padding:3px 10px;border-radius:var(--r-full);
  background:var(--bg-card-alt);border:1px solid var(--border);
  color:var(--text-muted);
}

/*═══════════════════════════════════════
  PROJECT BANNER
═══════════════════════════════════════*/
.banner{
  padding:20px;
  background:linear-gradient(135deg,var(--green-pale) 0%,var(--olive-pale) 50%,var(--walnut-pale) 100%);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:14px;
}

.banner-avatar{
  width:52px;height:52px;border-radius:14px;
  background:linear-gradient(135deg,var(--olive),var(--deep-walnut));
  display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:800;color:#fff;
  font-family:'Space Grotesk',sans-serif;
  flex-shrink:0;
  box-shadow:0 4px 14px rgba(72,53,25,0.25);
  position:relative;
}

.banner-avatar::after{
  content:'';position:absolute;inset:0;border-radius:inherit;
  background:linear-gradient(135deg,rgba(255,255,255,0.2) 0%,transparent 50%);
}

.banner-info{flex:1;min-width:0;}
.banner-name{font-size:16px;font-weight:700;color:var(--text-primary);line-height:1.3;}
.banner-id{
  font-family:'JetBrains Mono',monospace;
  font-size:12px;font-weight:600;color:var(--olive);margin-top:1px;
}
.banner-dept{font-size:11px;color:var(--text-muted);margin-top:1px;}

.banner-chip{
  padding:6px 14px;border-radius:var(--r-full);
  font-size:10px;font-weight:700;letter-spacing:0.5px;
  text-transform:uppercase;white-space:nowrap;
  background:#fff;color:var(--olive);
  border:1.5px solid var(--olive-light);
  box-shadow:var(--shadow-xs);
}

/*═══════════════════════════════════════
  DISTANCE HERO
═══════════════════════════════════════*/
.dist-section{
  padding:24px 20px;
  border-bottom:1px solid var(--border);
  background:linear-gradient(180deg,var(--green-pale) 0%,#ffffff 100%);
  position:relative;overflow:hidden;
}

.dist-section::before{
  content:'';position:absolute;
  top:-40%;right:-15%;width:250px;height:250px;
  background:radial-gradient(circle,rgba(140,255,152,0.15) 0%,transparent 70%);
  pointer-events:none;
}

.dist-top{display:flex;align-items:center;gap:8px;margin-bottom:8px;}

.dist-label{
  font-size:11px;font-weight:700;color:var(--text-muted);
  text-transform:uppercase;letter-spacing:1.5px;
}

.dist-live-chip{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 10px;border-radius:var(--r-full);
  background:var(--safe-bg);border:1px solid var(--safe-border);
  font-size:9px;font-weight:700;color:var(--safe);
  text-transform:uppercase;letter-spacing:0.5px;
}

.dist-live-blink{
  width:5px;height:5px;border-radius:50%;
  background:var(--safe);animation:blinker 1.5s infinite;
}

@keyframes blinker{0%,100%{opacity:1;}50%{opacity:0.2;}}

.dist-main{
  display:flex;align-items:center;
  justify-content:space-between;margin-bottom:22px;
}

.dist-val-wrap{display:flex;align-items:baseline;gap:6px;}

.dist-num{
  font-family:'Space Grotesk',sans-serif;
  font-size:64px;font-weight:700;line-height:1;
  color:var(--text-primary);letter-spacing:-2px;
  transition:color 0.4s;
}

.dist-unit{font-size:20px;font-weight:400;color:var(--text-muted);}

/* Gauge */
.gauge-box{width:76px;height:76px;position:relative;flex-shrink:0;}
.gauge-box svg{width:76px;height:76px;transform:rotate(-90deg);}
.g-track{fill:none;stroke:var(--border);stroke-width:6;}
.g-fill{
  fill:none;stroke:var(--yellow-green);stroke-width:6;
  stroke-linecap:round;stroke-dasharray:194;stroke-dashoffset:194;
  transition:stroke-dashoffset 0.6s ease,stroke 0.4s;
}
.g-center{
  position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
}
.g-pct{
  font-family:'JetBrains Mono',monospace;
  font-size:16px;font-weight:700;color:var(--olive);line-height:1;
}
.g-word{
  font-size:7px;font-weight:700;color:var(--text-muted);
  text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;
}

/* Progress Bar */
.dist-bar-box{margin-bottom:8px;}

.dist-track{
  height:10px;background:var(--bg-input);
  border-radius:var(--r-full);overflow:hidden;
  box-shadow:inset 0 1px 3px rgba(72,53,25,0.06);
}

.dist-fill{
  height:100%;border-radius:var(--r-full);
  background:linear-gradient(90deg,var(--yellow-green),var(--light-green));
  width:0%;transition:width 0.5s ease,background 0.4s;
  position:relative;
}

.dist-fill::after{
  content:'';position:absolute;top:0;right:0;bottom:0;width:40%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,0.4));
  border-radius:inherit;
}

.dist-ticks{
  display:flex;justify-content:space-between;padding-top:6px;
}

.dist-tick{
  font-size:9px;color:var(--text-light);
  font-family:'JetBrains Mono',monospace;font-weight:500;
}

/*═══════════════════════════════════════
  ZONE CARD
═══════════════════════════════════════*/
.zone-card{
  background:var(--safe-bg);
  border:1.5px solid var(--safe-border);
  border-radius:var(--r-lg);
  padding:16px;display:flex;align-items:center;gap:14px;
  transition:all 0.4s ease;
}

.zone-ico-box{
  width:54px;height:54px;border-radius:var(--r-md);
  display:flex;align-items:center;justify-content:center;
  font-size:26px;flex-shrink:0;transition:background 0.4s;
  background:rgba(45,138,62,0.1);
  position:relative;
}

.zone-ico-ring{
  position:absolute;inset:-4px;border-radius:inherit;
  border:2px solid var(--safe);opacity:0;
  animation:zRing 2.5s ease-in-out infinite;
}

@keyframes zRing{0%,100%{opacity:0;transform:scale(0.96);}50%{opacity:0.12;transform:scale(1.02);}}

.zone-info{flex:1;}

.zone-name{
  font-family:'Space Grotesk',sans-serif;
  font-size:24px;font-weight:700;line-height:1;
  letter-spacing:0.5px;transition:color 0.4s;color:var(--safe);
}

.zone-desc{
  font-size:12px;color:var(--text-tertiary);
  margin-top:4px;font-weight:400;
}

.zone-pill{
  padding:6px 16px;border-radius:var(--r-full);
  font-size:10px;font-weight:700;letter-spacing:1.2px;
  text-transform:uppercase;color:#fff;background:var(--safe);
  transition:background 0.4s;white-space:nowrap;
  box-shadow:var(--shadow-sm);
}

/*═══════════════════════════════════════
  SOS CARD
═══════════════════════════════════════*/
.sos-card{
  background:var(--bg-card-alt);
  border:1.5px solid var(--border);
  border-radius:var(--r-lg);overflow:hidden;
  transition:all 0.4s;
}

.sos-card.active{
  border-color:var(--danger-border);
  background:var(--danger-bg);
  box-shadow:0 0 0 4px rgba(197,32,32,0.06),var(--shadow-md);
  animation:sosBP 1.5s infinite;
}

@keyframes sosBP{0%,100%{border-color:var(--danger-border);}50%{border-color:var(--danger);}}

.sos-head{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 16px;border-bottom:1px solid var(--border);
}

.sos-head-l{display:flex;align-items:center;gap:9px;}

.sos-dot{
  width:9px;height:9px;border-radius:50%;
  background:var(--safe);flex-shrink:0;transition:all 0.3s;
}

.sos-dot.active{
  background:var(--danger);
  box-shadow:0 0 10px var(--danger),0 0 22px rgba(197,32,32,0.15);
  animation:sosGl 0.8s infinite;
}

@keyframes sosGl{0%,100%{box-shadow:0 0 10px var(--danger);}50%{box-shadow:0 0 22px var(--danger),0 0 38px rgba(197,32,32,0.12);}}

.sos-head-txt{
  font-size:11px;font-weight:600;color:var(--text-muted);
  text-transform:uppercase;letter-spacing:1px;
}

.sos-count{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;font-weight:600;
  padding:3px 10px;border-radius:var(--r-full);
  background:var(--bg-card);border:1px solid var(--border);
  color:var(--text-muted);
}

.sos-body{padding:16px;}

.sos-status{
  font-family:'Space Grotesk',sans-serif;
  font-size:20px;font-weight:700;color:var(--safe);
  transition:color 0.3s;margin-bottom:4px;
}

.sos-status.alert{color:var(--danger);}

.sos-time{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;color:var(--text-muted);
}

.sos-btn{
  display:inline-flex;align-items:center;gap:7px;
  margin-top:12px;padding:10px 18px;
  background:var(--olive);color:#fff;
  border-radius:var(--r-sm);text-decoration:none;
  font-size:12px;font-weight:600;
  box-shadow:0 2px 8px rgba(111,124,18,0.25);
  transition:all 0.2s;
}

.sos-btn:hover{
  background:var(--primary-dark);
  transform:translateY(-1px);
  box-shadow:0 4px 14px rgba(111,124,18,0.3);
}

/*═══════════════════════════════════════
  WEATHER CARD
═══════════════════════════════════════*/
.wx-card{
  background:var(--bg-card-alt);
  border:1.5px solid var(--border);
  border-radius:var(--r-lg);overflow:hidden;
}

.wx-top{
  padding:12px 16px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;justify-content:space-between;
}

.wx-loc{
  font-family:'JetBrains Mono',monospace;
  font-size:11px;font-weight:600;color:var(--olive);
}

.wx-body{padding:16px;}

.wx-hero{
  display:flex;align-items:flex-start;
  justify-content:space-between;margin-bottom:16px;
}

.wx-temp{
  font-family:'Space Grotesk',sans-serif;
  font-size:52px;font-weight:700;line-height:1;
  color:var(--text-primary);letter-spacing:-1.5px;
}

.wx-deg{font-size:18px;color:var(--text-muted);font-weight:400;}

.wx-sky{
  font-size:13px;color:var(--text-tertiary);
  text-transform:capitalize;margin-top:4px;
}

.wx-big-ico{
  font-size:56px;line-height:1;
  filter:drop-shadow(0 3px 8px rgba(72,53,25,0.1));
}

.wx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}

.wx-stat{
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:var(--r-md);padding:14px;transition:all 0.2s;
}

.wx-stat:hover{border-color:var(--border-focus);box-shadow:var(--shadow-sm);}

.wx-stat-ico{font-size:18px;margin-bottom:4px;}
.wx-stat-lbl{font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;}
.wx-stat-val{
  font-family:'JetBrains Mono',monospace;
  font-size:20px;font-weight:700;color:var(--text-primary);margin-top:4px;
}

.wx-alert{
  display:none;padding:10px 14px;border-radius:var(--r-sm);
  font-size:12px;font-weight:600;align-items:center;gap:8px;
}

.wx-alert.ok{
  display:flex;background:var(--safe-bg);
  border:1px solid var(--safe-border);color:var(--safe);
}

.wx-alert.bad{
  display:flex;background:var(--danger-bg);
  border:1px solid var(--danger-border);color:var(--danger);
  animation:wxPulse 2.5s infinite;
}

@keyframes wxPulse{0%,100%{border-color:var(--danger-border);}50%{border-color:var(--danger);}}

/*═══════════════════════════════════════
  SOS HISTORY
═══════════════════════════════════════*/
.hist-list{display:flex;flex-direction:column;gap:8px;}

.hist-item{
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:var(--r-md);padding:12px 14px;
  display:flex;align-items:center;justify-content:space-between;
  position:relative;overflow:hidden;transition:all 0.2s;
}

.hist-item::before{
  content:'';position:absolute;left:0;top:0;bottom:0;
  width:4px;background:var(--danger);border-radius:0 4px 4px 0;
}

.hist-item:hover{
  border-color:var(--border-focus);
  box-shadow:var(--shadow-sm);transform:translateX(3px);
}

.hist-info{display:flex;flex-direction:column;gap:1px;padding-left:10px;}

.hist-id{
  font-family:'Space Grotesk',sans-serif;
  font-size:14px;font-weight:700;color:var(--danger);
}

.hist-time{
  font-family:'JetBrains Mono',monospace;
  font-size:10px;color:var(--text-muted);
}

.hist-btn{
  padding:6px 14px;
  background:var(--olive-pale);color:var(--olive);
  border:1px solid rgba(111,124,18,0.2);
  border-radius:var(--r-sm);text-decoration:none;
  font-size:11px;font-weight:600;transition:all 0.2s;
  display:inline-flex;align-items:center;gap:5px;
}

.hist-btn:hover{background:rgba(111,124,18,0.12);border-color:rgba(111,124,18,0.35);}

.empty-state{
  text-align:center;padding:30px;
  color:var(--text-muted);
  border:1.5px dashed var(--border);
  border-radius:var(--r-lg);background:var(--bg-card-alt);
}

.empty-ico{font-size:36px;margin-bottom:8px;opacity:0.5;}
.empty-txt{font-size:13px;font-weight:500;color:var(--text-tertiary);}

/*═══════════════════════════════════════
  SIDEBAR FOOTER
═══════════════════════════════════════*/
.side-foot{
  padding:24px 20px;text-align:center;
  border-top:1px solid var(--border);
  background:linear-gradient(180deg,var(--bg-card-alt),var(--green-pale));
}

.foot-brand{
  font-family:'Space Grotesk',sans-serif;
  font-size:16px;font-weight:700;
  color:var(--olive);letter-spacing:2.5px;
}

.foot-line{
  font-size:10px;color:var(--text-muted);margin-top:2px;
}

.foot-author{
  margin-top:12px;font-size:11px;color:var(--text-tertiary);
}

.foot-author strong{color:var(--deep-walnut);font-weight:700;}

.foot-project-line{
  display:inline-block;margin-top:6px;
  padding:4px 12px;border-radius:var(--r-full);
  background:rgba(111,124,18,0.08);
  border:1px solid rgba(111,124,18,0.15);
  font-size:9px;font-weight:600;color:var(--olive);
  letter-spacing:0.5px;
}

/*═══════════════════════════════════════
  MAP AREA
═══════════════════════════════════════*/
.map-area{position:relative;background:#f8faf5;}

#map{width:100%;height:100%;}

.map-fl{position:absolute;z-index:800;pointer-events:none;}

.map-pos-card{
  top:16px;left:16px;
  background:rgba(255,255,255,0.96);
  backdrop-filter:blur(12px);
  border:1px solid var(--border);
  border-radius:var(--r-md);padding:14px 18px;
  pointer-events:auto;box-shadow:var(--shadow-md);
  min-width:230px;
}

.map-pos-head{
  font-size:9px;font-weight:700;color:var(--text-muted);
  text-transform:uppercase;letter-spacing:1.5px;
  margin-bottom:6px;display:flex;align-items:center;gap:6px;
}

.map-pos-val{
  font-family:'JetBrains Mono',monospace;
  font-size:13px;font-weight:600;color:var(--olive);
}

.map-pos-loc{
  font-size:10px;color:var(--text-muted);margin-top:4px;
  font-weight:500;
}

.map-sos-card{
  top:16px;right:16px;
  background:rgba(253,240,240,0.96);
  backdrop-filter:blur(12px);
  border:1.5px solid var(--danger-border);
  border-radius:var(--r-md);padding:14px 18px;
  display:none;pointer-events:auto;box-shadow:var(--shadow-md);
}

.map-sos-card.active{display:block;animation:mapSosBlink 1.2s infinite;}

@keyframes mapSosBlink{
  0%,100%{opacity:1;border-color:var(--danger-border);}
  50%{opacity:0.75;border-color:var(--danger);}
}

.map-sos-title{
  font-family:'Space Grotesk',sans-serif;
  font-size:15px;font-weight:700;color:var(--danger);
  display:flex;align-items:center;gap:6px;
}

.map-sos-sub{font-size:11px;color:rgba(197,32,32,0.6);margin-top:3px;}

.map-bottom{
  bottom:16px;left:16px;right:16px;
  display:flex;gap:10px;pointer-events:auto;
}

.map-tag{
  background:rgba(255,255,255,0.96);
  backdrop-filter:blur(12px);
  border:1px solid var(--border);
  border-radius:var(--r-sm);padding:10px 14px;
  display:flex;align-items:center;gap:8px;
  font-size:12px;color:var(--text-secondary);
  box-shadow:var(--shadow-sm);font-weight:500;
}

.map-tag-v{
  font-family:'JetBrains Mono',monospace;
  font-weight:700;color:var(--text-primary);
}

/*═══════════════════════════════════════
  MAP MARKER
═══════════════════════════════════════*/
.map-pin{
  width:22px;height:22px;
  background:var(--olive);
  border:3px solid #fff;border-radius:50%;
  box-shadow:0 0 0 3px rgba(111,124,18,0.2),0 2px 10px rgba(0,0,0,0.12);
  animation:pinBr 3s ease-in-out infinite;
  position:relative;
}

.map-pin::after{
  content:'';position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%);
  width:6px;height:6px;background:#fff;border-radius:50%;
}

@keyframes pinBr{
  0%,100%{box-shadow:0 0 0 3px rgba(111,124,18,0.2),0 2px 10px rgba(0,0,0,0.12);}
  50%{box-shadow:0 0 0 9px rgba(111,124,18,0.06),0 2px 10px rgba(0,0,0,0.12);}
}

.map-pin.sos{
  background:var(--danger);
  box-shadow:0 0 0 3px rgba(197,32,32,0.2),0 2px 10px rgba(0,0,0,0.12);
  animation:pinSOS 0.6s infinite;
}

@keyframes pinSOS{
  0%,100%{transform:scale(1);box-shadow:0 0 0 3px rgba(197,32,32,0.25),0 0 18px rgba(197,32,32,0.2);}
  50%{transform:scale(1.35);box-shadow:0 0 0 8px rgba(197,32,32,0.08),0 0 30px rgba(197,32,32,0.12);}
}

/* Leaflet Overrides */
.leaflet-container{background:#f8faf5;font-family:'Plus Jakarta Sans',sans-serif;}

.leaflet-control-zoom a{
  background:#fff !important;border-color:var(--border) !important;
  color:var(--text-secondary) !important;
  width:34px !important;height:34px !important;line-height:34px !important;
  font-size:16px !important;box-shadow:var(--shadow-sm) !important;
  transition:all 0.2s !important;
}

.leaflet-control-zoom a:hover{
  background:var(--bg-card-alt) !important;color:var(--text-primary) !important;
}

.leaflet-control-zoom{border:none !important;box-shadow:none !important;}

.leaflet-control-attribution{
  background:rgba(255,255,255,0.88) !important;
  color:var(--text-muted) !important;font-size:9px !important;
}

.leaflet-popup-content-wrapper{
  background:#fff !important;border:1px solid var(--border) !important;
  border-radius:var(--r-md) !important;box-shadow:var(--shadow-lg) !important;
  color:var(--text-primary) !important;
}

.leaflet-popup-tip{background:#fff !important;}

/*═══════════════════════════════════════
  ANIMATIONS
═══════════════════════════════════════*/
@keyframes slideUp{
  from{opacity:0;transform:translateY(12px);}
  to{opacity:1;transform:translateY(0);}
}

.sidebar>*{animation:slideUp 0.45s ease both;}
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
  .main-grid{grid-template-columns:1fr;grid-template-rows:auto 50vh;}
  .sidebar{border-right:none;border-bottom:1px solid var(--border);max-height:55vh;}
  .nav-sep,.nav-author{display:none;}
  .dist-num{font-size:48px;}
  .map-bottom{flex-wrap:wrap;}
}

@media(max-width:480px){
  .navbar{padding:0 12px;height:58px;}
  .nav-title{font-size:14px;}
  .banner{flex-wrap:wrap;}
  .banner-chip{order:3;margin-top:4px;}
  .dist-num{font-size:40px;}
  .gauge-box{display:none;}
  .wx-temp{font-size:40px;}
  .time-chip{display:none;}
}
</style>
</head>
<body>

<!-- ═══ NAVBAR ═══ -->
<nav class="navbar">
  <div class="nav-left">
    <div class="nav-logo-wrap">
      VIC
      <div class="nav-logo-ring"></div>
    </div>
    <div class="nav-info">
      <div class="nav-title">VIC ALERT SYSTEM</div>
      <div class="nav-desc">IoT Wearable for Visually Impaired Safety</div>
    </div>
    <div class="nav-sep"></div>
    <div class="nav-author">
      <div class="nav-author-name">Okechukwu Victor Nnaogo</div>
      <div class="nav-author-id">PAS/CSC/21/073</div>
    </div>
  </div>
  <div class="nav-right">
    <div class="status-pill on" id="statusPill">
      <span class="s-dot on" id="sDot"></span>
      <span id="sText">Connecting</span>
    </div>
    <span class="time-chip" id="timeChip">--:--:--</span>
  </div>
</nav>

<!-- ═══ MAIN ═══ -->
<div class="main-grid">

  <!-- SIDEBAR -->
  <aside class="sidebar">

    <!-- Banner -->
    <div class="banner">
      <div class="banner-avatar">OV</div>
      <div class="banner-info">
        <div class="banner-name">Okechukwu Victor Nnaogo</div>
        <div class="banner-id">PAS/CSC/21/073</div>
        <div class="banner-dept">Department of Computer Science</div>
      </div>
      <div class="banner-chip">Final Year Project</div>
    </div>

    <!-- Distance -->
    <div class="dist-section">
      <div class="dist-top">
        <span class="dist-label">Obstacle Distance</span>
        <span class="dist-live-chip"><span class="dist-live-blink"></span>LIVE</span>
      </div>
      <div class="dist-main">
        <div class="dist-val-wrap">
          <span class="dist-num" id="dNum">—</span>
          <span class="dist-unit" id="dUnit">cm</span>
        </div>
        <div class="gauge-box">
          <svg viewBox="0 0 76 76">
            <circle class="g-track" cx="38" cy="38" r="31"/>
            <circle class="g-fill" id="gFill" cx="38" cy="38" r="31"/>
          </svg>
          <div class="g-center">
            <span class="g-pct" id="gPct">0%</span>
            <span class="g-word">proximity</span>
          </div>
        </div>
      </div>
      <div class="dist-bar-box">
        <div class="dist-track">
          <div class="dist-fill" id="dBar"></div>
        </div>
        <div class="dist-ticks">
          <span class="dist-tick">0</span>
          <span class="dist-tick">50</span>
          <span class="dist-tick">100</span>
          <span class="dist-tick">150</span>
          <span class="dist-tick">200</span>
          <span class="dist-tick">300</span>
        </div>
      </div>
    </div>

    <!-- Zone -->
    <div class="pnl">
      <div class="pnl-head">
        <div class="pnl-ico nature">🛡️</div>
        <div class="pnl-titles">
          <div class="pnl-title">Safety Zone</div>
          <div class="pnl-sub">Current threat level assessment</div>
        </div>
      </div>
      <div class="zone-card" id="zCard">
        <div class="zone-ico-box" id="zIcoBox">
          <span id="zIco">✅</span>
          <div class="zone-ico-ring" id="zRing"></div>
        </div>
        <div class="zone-info">
          <div class="zone-name" id="zName">SAFE</div>
          <div class="zone-desc" id="zDesc">No obstacles detected</div>
        </div>
        <div class="zone-pill" id="zPill">SAFE</div>
      </div>
    </div>

    <!-- SOS -->
    <div class="pnl">
      <div class="pnl-head">
        <div class="pnl-ico alert">🚨</div>
        <div class="pnl-titles">
          <div class="pnl-title">Emergency Status</div>
          <div class="pnl-sub">SOS alert monitoring system</div>
        </div>
      </div>
      <div class="sos-card" id="sosCard">
        <div class="sos-head">
          <div class="sos-head-l">
            <div class="sos-dot" id="sosDot"></div>
            <span class="sos-head-txt">SOS Monitor</span>
          </div>
          <span class="sos-count" id="sosCount">0 events</span>
        </div>
        <div class="sos-body">
          <div class="sos-status" id="sosStat">System Normal</div>
          <div class="sos-time" id="sosTime">Last SOS: Never</div>
          <div id="sosAct"></div>
        </div>
      </div>
    </div>

    <!-- Weather -->
    <div class="pnl">
      <div class="pnl-head">
        <div class="pnl-ico sun">☀️</div>
        <div class="pnl-titles">
          <div class="pnl-title">Weather Intelligence</div>
          <div class="pnl-sub">Live environmental conditions</div>
        </div>
      </div>
      <div class="wx-card">
        <div class="wx-top">
          <span class="sos-head-txt">Current Conditions</span>
          <span class="wx-loc" id="wxLoc">Taraba, NG</span>
        </div>
        <div class="wx-body">
          <div class="wx-hero">
            <div>
              <div>
                <span class="wx-temp" id="wxT">—</span>
                <span class="wx-deg">°C</span>
              </div>
              <div class="wx-sky" id="wxS">Fetching...</div>
            </div>
            <div class="wx-big-ico" id="wxI">🌤️</div>
          </div>
          <div class="wx-grid">
            <div class="wx-stat">
              <div class="wx-stat-ico">💧</div>
              <div class="wx-stat-lbl">Humidity</div>
              <div class="wx-stat-val" id="wxH">—%</div>
            </div>
            <div class="wx-stat">
              <div class="wx-stat-ico">💨</div>
              <div class="wx-stat-lbl">Wind Speed</div>
              <div class="wx-stat-val" id="wxW">— m/s</div>
            </div>
          </div>
          <div class="wx-alert" id="wxA"></div>
        </div>
      </div>
    </div>

    <!-- History -->
    <div class="pnl">
      <div class="pnl-head">
        <div class="pnl-ico leaf">📋</div>
        <div class="pnl-titles">
          <div class="pnl-title">SOS Event History</div>
          <div class="pnl-sub">Recent emergency activations</div>
        </div>
        <div class="pnl-tag" id="hTotal">0 total</div>
      </div>
      <div class="hist-list" id="hList">
        <div class="empty-state">
          <div class="empty-ico">📭</div>
          <div class="empty-txt">No SOS events recorded yet</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="side-foot">
      <div class="foot-brand">VIC ALERT</div>
      <div class="foot-line">Intelligent Safety System for the Visually Impaired</div>
      <div class="foot-author">
        Designed &amp; Built by <strong>Okechukwu Victor Nnaogo</strong>
      </div>
      <div class="foot-project-line">PAS/CSC/21/073 · Computer Science · Final Year Project 2026</div>
    </div>

  </aside>

  <!-- MAP -->
  <div class="map-area">
    <div id="map"></div>

    <div class="map-fl map-pos-card" id="posCard">
      <div class="map-pos-head"><span>📍</span> Last Known Position</div>
      <div class="map-pos-val" id="posVal">Waiting for GPS signal...</div>
      <div class="map-pos-loc">Taraba State, Nigeria</div>
    </div>

    <div class="map-fl map-sos-card" id="mapSos">
      <div class="map-sos-title">🚨 SOS ACTIVE</div>
      <div class="map-sos-sub">Emergency signal in progress</div>
    </div>

    <div class="map-fl map-bottom" id="mapBot">
      <div class="map-tag">📡 System: <span class="map-tag-v" id="mSys">ACTIVE</span></div>
      <div class="map-tag">🛡️ Zone: <span class="map-tag-v" id="mZone">SAFE</span></div>
      <div class="map-tag">📏 Distance: <span class="map-tag-v" id="mDist">—</span></div>
    </div>
  </div>

</div>

<script>
const ZONES={
  'SAFE':    {c:'#2d8a3e',bg:'#edfaef',bd:'#b0e8ba',ib:'rgba(45,138,62,0.1)',icon:'✅',desc:'No obstacles detected',grad:'linear-gradient(90deg,#2d8a3e,#5ce06b)',gs:'#2d8a3e'},
  'CAUTION': {c:'#b8860b',bg:'#fdf8ec',bd:'#f0dca0',ib:'rgba(184,134,11,0.1)',icon:'⚠️',desc:'Obstacle at 100–150 cm',grad:'linear-gradient(90deg,#b8860b,#d4a017)',gs:'#b8860b'},
  'WARNING': {c:'#c65d07',bg:'#fef5ec',bd:'#f8d4a8',ib:'rgba(198,93,7,0.1)',icon:'⚡',desc:'Obstacle at 50–100 cm',grad:'linear-gradient(90deg,#c65d07,#e8820a)',gs:'#c65d07'},
  'DANGER':  {c:'#c52020',bg:'#fdf0f0',bd:'#f0b8b8',ib:'rgba(197,32,32,0.1)',icon:'🚨',desc:'Obstacle at 20–50 cm',grad:'linear-gradient(90deg,#c52020,#e84040)',gs:'#c52020'},
  'CRITICAL':{c:'#8b1a1a',bg:'#fceded',bd:'#e8a0a0',ib:'rgba(139,26,26,0.12)',icon:'🔴',desc:'Obstacle under 20 cm!',grad:'linear-gradient(90deg,#8b1a1a,#c52020)',gs:'#8b1a1a'}
};

const WXI={2:'⛈️',3:'🌧️',5:'🌧️',6:'❄️',7:'🌫️',8:'⛅'};
function wxIcon(id){if(id===800)return'☀️';if(id===801)return'🌤️';if(id>=802)return'☁️';return WXI[Math.floor(id/100)]||'🌤️';}

/* ═══ MAP — Upgraded Satellite + Street View ═══ */
const street=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  maxZoom:19,
  attribution:'&copy; OpenStreetMap contributors'
});

const satellite=L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom:19,
    attribution:'&copy; Esri'
  }
);

const map=L.map('map',{
  center:[7.9994,11.3792],
  zoom:15,
  zoomControl:true,
  layers:[satellite]
});

L.control.layers(
  {
    "Satellite": satellite,
    "Street Map": street
  },
  {},
  { collapsed:false }
).addTo(map);

const pinN=L.divIcon({
  html:'<div class="map-pin"></div>',
  className:'',
  iconSize:[22,22],
  iconAnchor:[11,11]
});

const pinS=L.divIcon({
  html:'<div class="map-pin sos"></div>',
  className:'',
  iconSize:[22,22],
  iconAnchor:[11,11]
});

let mk=null,fv=false,lt=0;
const sosLy=L.layerGroup().addTo(map);

function mvMk(lat,lng,sos){
  const ic=sos?pinS:pinN;

  if(!mk){
    mk=L.marker([lat,lng],{icon:ic}).addTo(map);
    map.setView([lat,lng],18);
    fv=true;
  } else {
    mk.setLatLng([lat,lng]);
    mk.setIcon(ic);
    map.panTo([lat,lng]);
  }

  document.getElementById('posVal').textContent =
    lat.toFixed(6)+', '+lng.toFixed(6);
}
const $=id=>document.getElementById(id);

async function pull(){
  try{
    const r=await fetch('/data');const d=await r.json();lt=Date.now();

    $('sDot').className='s-dot on';
    $('statusPill').className='status-pill on';
    $('sText').textContent='Live';
    $('timeChip').textContent=d.lastUpdate;

    const dist=parseFloat(d.distance);const clr=dist>=999;
    $('dNum').textContent=clr?'CLEAR':dist.toFixed(1);
    $('dUnit').textContent=clr?'':'cm';

    const pct=clr?0:Math.max(0,Math.min(100,(1-dist/300)*100));
    const z=d.zone||'SAFE';const zc=ZONES[z]||ZONES['SAFE'];

    $('dBar').style.width=pct+'%';
    $('dBar').style.background=zc.grad;
    $('dNum').style.color=clr?'#2e2010':zc.c;

    const circ=2*Math.PI*31;
    $('gFill').style.strokeDashoffset=circ-(pct/100)*circ;
    $('gFill').style.stroke=zc.gs;
    $('gPct').textContent=Math.round(pct)+'%';
    $('gPct').style.color=zc.c;

    $('zIco').textContent=zc.icon;
    $('zIcoBox').style.background=zc.ib;
    $('zRing').style.borderColor=zc.c;
    $('zName').textContent=z;$('zName').style.color=zc.c;
    $('zDesc').textContent=zc.desc;
    $('zPill').textContent=z;$('zPill').style.background=zc.c;
    $('zPill').style.color=z==='CAUTION'?'#2e2010':'#fff';
    $('zCard').style.borderColor=zc.bd;
    $('zCard').style.background=zc.bg;

    $('mZone').textContent=z;$('mZone').style.color=zc.c;
    $('mDist').textContent=clr?'CLEAR':dist.toFixed(0)+' cm';
    $('mSys').textContent=d.systemStatus||'ACTIVE';

    const sos=d.sosActive;
    if(sos){
      $('sosCard').classList.add('active');
      $('sosDot').classList.add('active');
      $('sosStat').textContent='🚨 EMERGENCY ACTIVE';
      $('sosStat').classList.add('alert');
      $('mapSos').classList.add('active');
      if(mk)mk.setIcon(pinS);
    }else{
      $('sosCard').classList.remove('active');
      $('sosDot').classList.remove('active');
      $('sosStat').textContent='System Normal';
      $('sosStat').classList.remove('alert');
      $('mapSos').classList.remove('active');
      if(mk)mk.setIcon(pinN);
    }

    $('sosCount').textContent=d.sosCount+' event'+(d.sosCount!==1?'s':'');
    $('sosTime').textContent='Last SOS: '+(d.lastSosTime||'Never');

    const sa=$('sosAct');
    if(d.mapsLink&&d.mapsLink!==''){
      sa.innerHTML='<a class="sos-btn" href="'+d.mapsLink+'" target="_blank"><span>📍</span> Open in Maps</a>';
    }else{sa.innerHTML='';}

    $('wxT').textContent=d.temperature?d.temperature.toFixed(1):'—';
    $('wxS').textContent=d.weather||'Unknown';
    $('wxI').textContent=wxIcon(d.weatherId||800);
    $('wxH').textContent=(d.humidity||0)+'%';
    $('wxW').textContent=(d.windSpeed||0).toFixed(1)+' m/s';

    const wa=$('wxA');
    if(d.weatherAlert&&d.weatherAlert!=='None'){
      wa.innerHTML='<span>⚠️</span><span>'+d.weatherAlert+'</span>';
      wa.className='wx-alert bad';
    }else if(d.weather&&d.weather!=='Fetching...'){
      wa.innerHTML='<span>✅</span><span>Conditions safe for travel</span>';
      wa.className='wx-alert ok';
    }else{wa.className='wx-alert';}

    const lat=parseFloat(d.lat),lng=parseFloat(d.lng);
    if(d.hasLocation&&lat&&lng)mvMk(lat,lng,sos);

    sosLy.clearLayers();
    if(d.sosHistory&&d.sosHistory.length>0){
      d.sosHistory.forEach(e=>{
        if(e.lat&&e.lng){
          const cm=L.circleMarker([e.lat,e.lng],{
            radius:7,fillColor:'#c52020',color:'#fff',weight:2,opacity:1,fillOpacity:0.85
          }).addTo(sosLy);
          cm.bindPopup('<div style="font-family:Plus Jakarta Sans,sans-serif;padding:4px"><b style="color:#c52020;font-size:13px">SOS #'+e.count+'</b><br><span style="font-size:11px;color:#7a6b58">'+e.time+'</span></div>');
        }
      });
    }

    const h=d.sosHistory||[];const hl=$('hList');
    $('hTotal').textContent=h.length+' total';

    if(h.length===0){
      hl.innerHTML='<div class="empty-state"><div class="empty-ico">📭</div><div class="empty-txt">No SOS events recorded yet</div></div>';
    }else{
      hl.innerHTML=h.map(x=>{
        const b=x.location?'<a class="hist-btn" href="'+x.location+'" target="_blank"><span>📍</span> Map</a>':'<span style="color:#a09580;font-size:10px">No GPS</span>';
        return '<div class="hist-item"><div class="hist-info"><span class="hist-id">SOS #'+x.count+'</span><span class="hist-time">'+x.time+'</span></div>'+b+'</div>';
      }).join('');
    }

  }catch(e){
    $('sDot').className='s-dot off';
    $('statusPill').className='status-pill off';
    $('sText').textContent='Offline';
  }
}

pull();setInterval(pull,3000);

setInterval(()=>{
  if(lt>0&&Date.now()-lt>15000){
    $('sDot').className='s-dot off';
    $('statusPill').className='status-pill off';
    $('sText').textContent='Device Offline';
  }
},5000);
<\/script>
</body>
</html>`);
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>{console.log('VIC Alert Server on port '+PORT);});
