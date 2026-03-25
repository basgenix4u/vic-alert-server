VIC Alert System — Setup & Operation Guide
System Overview

The VIC Alert System is an IoT-based wearable assistive device designed for visually impaired individuals. The system integrates obstacle detection, environmental hazard monitoring, emergency SOS alerts, and real-time location tracking through a cloud-based dashboard accessible to caregivers.

The system consists of four main components:

ESP32 Smart Wearable Device
Smartphone (GPS Logger + Hotspot)
Cloud Dashboard (Render Server)
Blynk Mobile App (Notifications & Monitoring)

These components work together to provide real-time monitoring, alerts, and safety assistance.

System Architecture

System Flow:

Blind User Device → ESP32
ESP32 → Smartphone Hotspot
Smartphone GPS Logger → Render Server
ESP32 → Render Server
Render Server → Web Dashboard
Render Server → Blynk Notification
Caregiver → Monitor Dashboard

Required Applications

Install the following apps:

Blind User Phone

Install:

GPS Logger (by BasicAirData)
Serial Bluetooth Terminal
Mobile Hotspot enabled
Caregiver Phone

Install:

Blynk IoT App
Step-By-Step Setup
Step 1 — Configure ESP32 WiFi (Bluetooth Setup)

Power ON the ESP32 device.

Open Serial Bluetooth Terminal on the blind user phone.

Connect to:

ESP32 Bluetooth Device

Send credentials:

SSID:YourHotspotName
PASS:YourHotspotPassword
SAVE

Example:

SSID:VictorPhone
PASS:12345678
SAVE

ESP32 will store credentials and reconnect automatically next time.

Step 2 — Enable Phone Hotspot

On blind user's phone:

Settings → Hotspot → Turn ON

ESP32 connects automatically to hotspot.

Step 3 — Setup GPS Logger

Open GPS Logger App

Go to:

Settings → Logging Details

Set:

Logging Interval → 5 seconds

Go to:

Settings → Auto Send

Enable:

Auto Send → ON

Go to:

Settings → Custom URL

Enable:

Log to custom URL → ON
Allow Auto Sending → ON

Enter URL:

https://vic-alert-system.onrender.com/update?lat=%LAT&lng=%LON

Save.

Start Logging.

GPS Logger now sends live location automatically.

Step 4 — Open Dashboard

Caregiver opens:

https://vic-alert-system.onrender.com

Dashboard shows:

Live Map Location
Distance to obstacle
Zone status
SOS status
Weather conditions
System status
Step 5 — Setup Blynk App

Open Blynk App

Add Widgets:

Distance → V2
Zone → V3
System Status → V4
SOS Count → V5
Weather → V9
Temperature → V10

Blynk provides:

Push notifications
System monitoring
Emergency alerts
How The System Works
Normal Operation

ESP32 detects obstacle
Device vibrates and buzzes
ESP32 sends data to server
Dashboard updates in real time

Location Tracking

GPS Logger sends phone location
Server receives coordinates
Dashboard map updates
Caregiver sees live movement

Emergency SOS

Blind user presses SOS button

ESP32:

Sends SOS to server
Sends Blynk notification
Dashboard shows emergency
Location displayed on map

Caregiver immediately sees:

Emergency alert
Current location
Device status
Environmental Hazard Alert

ESP32 monitors environmental conditions

If hazard detected:

Device:

Vibrates
Beeps
Flashes LED

Server:

Updates dashboard
Sends Blynk notification
Roles of Each Component
ESP32 Device

Handles:

Obstacle detection
SOS detection
Environmental monitoring
Buzzer & vibration alerts
Data transmission
GPS Logger

Handles:

Real-time location tracking
Automatic coordinate sending
Background operation
Render Dashboard

Handles:

Live map monitoring
System data display
SOS tracking
Caregiver interface
Blynk App

Handles:

Push notifications
System widgets
Emergency alerts
Internet Requirements

Blind User Phone:

Hotspot ON
GPS Logger Running

Caregiver:

Internet Browser
Final Operation Example

Blind user walking outside

Obstacle detected → Device vibrates

Rain approaching → Device beeps

User presses SOS → Caregiver notified

Caregiver opens dashboard → sees location

System provides full real-time safety monitoring.

Dashboard Link
https://vic-alert-system.onrender.com
System Status

Fully Real-Time
Cloud-Connected
IoT-Based
Low-Cost
Assistive Technology Ready
