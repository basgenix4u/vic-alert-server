# VIC Alert Server

VIC Alert Server is a Node.js/Express backend and real-time dashboard for an IoT assistive safety system designed to support visually impaired users with obstacle monitoring, SOS alerts, environmental updates and caregiver visibility.

👤 **Author:** [Abdulbasit Abdulalim](https://github.com/basgenix4u)


[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![IoT](https://img.shields.io/badge/IoT-ESP32-E7352C?style=for-the-badge&logo=espressif&logoColor=white)](https://www.espressif.com)
[![Leaflet](https://img.shields.io/badge/Maps-Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

## Product Overview

The VIC Alert System connects an ESP32-based wearable device, smartphone GPS data and a cloud dashboard. The server receives telemetry from the device, stores the latest status in memory and exposes a dashboard for caregivers to monitor safety events.

This project demonstrates backend API design, IoT telemetry handling, real-time dashboard rendering and assistive-technology product thinking.

---

## System Architecture

```txt
ESP32 Wearable Device
        |
        |  telemetry: distance, zone, SOS, weather, GPS
        v
Node.js / Express Server
        |
        |-- /update  receives device updates
        |-- /data    returns latest device state
        |-- /        caregiver dashboard
        v
Caregiver Dashboard / Mobile Browser
```

---

## Key Features

- Express.js telemetry server
- Device update endpoint for ESP32/smartphone data
- Real-time JSON data endpoint
- Caregiver dashboard rendered from the server
- SOS history tracking
- Location history tracking
- Obstacle distance and safety zone monitoring
- Weather/environmental status display
- CORS and JSON/form-body support
- Render/VPS deployment-ready structure

---

## Tech Stack

| Area | Technologies |
| --- | --- |
| Runtime | Node.js |
| Backend | Express.js |
| Middleware | CORS, JSON/body parsing |
| Dashboard | Server-rendered HTML/CSS/JS |
| Maps | Leaflet frontend integration |
| Deployment Target | Render, Railway, Fly.io, VPS or similar Node hosting |

---

## API Endpoints

### `GET /`

Returns the caregiver monitoring dashboard.

### `GET /data`

Returns the current device state, SOS history and location history.

Example response:

```json
{
  "distance": 120,
  "zone": "SAFE",
  "sosCount": 0,
  "sosActive": false,
  "systemStatus": "ACTIVE",
  "lat": 7.85,
  "lng": 9.78,
  "hasLocation": true,
  "sosHistory": [],
  "locationHistory": []
}
```

### `GET /update`

Accepts telemetry updates through query parameters.

Example:

```txt
/update?distance=100&zone=SAFE&sosActive=false&lat=7.85&lng=9.78&weather=Clear&temperature=28
```

### `POST /update`

Accepts telemetry updates through JSON or form body.

Example body:

```json
{
  "distance": 80,
  "zone": "CAUTION",
  "sosActive": true,
  "sosCount": 1,
  "lat": 7.85,
  "lng": 9.78,
  "weather": "Cloudy",
  "temperature": 27
}
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/basgenix4u/vic-alert-server.git
cd vic-alert-server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm start
```

Open http://localhost:3000.

---

## Environment Variables

This version only requires an optional `PORT` variable.

```bash
PORT=3000
```

---

## Deployment

Deploy to any Node.js hosting service.

Recommended steps:

1. Set the start command to `npm start`.
2. Set `PORT` if the host requires it.
3. Deploy the server.
4. Configure the ESP32 device to send updates to the deployed `/update` URL.
5. Open the deployed dashboard URL on the caregiver device.

---

## Roadmap

- Persist telemetry in a database
- Add authentication for caregiver dashboard
- Add device registration and API keys
- Add WebSocket/SSE real-time updates
- Add SMS/email/push notifications for SOS events
- Add multi-device support
- Add automated tests and CI checks
- Add Docker support

---

## Safety Disclaimer

This project is an assistive technology prototype. It should not be used as the only safety mechanism in critical situations without proper hardware validation, testing, redundancy and emergency-response planning.

---

## Author

Built and maintained by **Abdulbasit Abdulalim**.

- GitHub: https://github.com/basgenix4u
- Website: https://alimswrite.com
- LinkedIn: https://www.linkedin.com/in/abdulbasit-abdulalim-94a701354

---

<div align="center">

Built by [Abdulbasit Abdulalim](https://github.com/basgenix4u)

</div>
