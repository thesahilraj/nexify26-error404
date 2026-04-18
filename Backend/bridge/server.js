/**
 * ═══════════════════════════════════════════════════════════
 *  🌿 Farm IoT Serial Bridge Server
 * ═══════════════════════════════════════════════════════════
 *
 *  Reads sensor data from both ESP32 devices via USB serial
 *  and serves it as HTTP JSON endpoints.
 *
 *  Endpoints:
 *    GET  /farm       → Latest farm sensor data
 *    GET  /cattle     → Latest cattle band data
 *    POST /farm/pump  → Send pump command { action: "on"|"off" }
 *    GET  /status     → Connection status of both devices
 *
 *  Usage:
 *    cd bridge
 *    npm install
 *    npm start
 *
 * ═══════════════════════════════════════════════════════════
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const express = require('express');
const cors = require('cors');

// ── Configuration ──
const FARM_PORT = process.env.FARM_PORT || 'COM15';
const CATTLE_PORT = process.env.CATTLE_PORT || 'COM8';
const BAUD_RATE = 115200;
const HTTP_PORT = process.env.BRIDGE_PORT || 3001;
const TIMEOUT_MS = 10000;  // Consider device offline after 10s of no data

// ── State ──
let farmData = null;
let cattleData = null;
let farmLastUpdate = 0;
let cattleLastUpdate = 0;
let farmConnected = false;
let cattleConnected = false;

// ── Express Setup ──
const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════
//  Serial Port Setup
// ═══════════════════════════════════════════════

function setupSerialPort(portPath, deviceName, onData) {
  try {
    const port = new SerialPort({
      path: portPath,
      baudRate: BAUD_RATE,
      autoOpen: true
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

    port.on('open', () => {
      console.log(`  ✅ [${deviceName}] Connected on ${portPath}`);
    });

    parser.on('data', (line) => {
      try {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) return;  // Skip non-JSON

        const data = JSON.parse(trimmed);

        // Skip boot/ack messages
        if (data.status || data.ack) {
          console.log(`  📡 [${deviceName}] ${trimmed}`);
          return;
        }

        onData(data);
      } catch (e) {
        // Skip unparseable lines silently
      }
    });

    port.on('error', (err) => {
      console.error(`  ❌ [${deviceName}] Error: ${err.message}`);
    });

    port.on('close', () => {
      console.log(`  ⚠️  [${deviceName}] Disconnected`);
    });

    return port;
  } catch (err) {
    console.error(`  ❌ [${deviceName}] Could not open ${portPath}: ${err.message}`);
    console.error(`     → Is the device plugged in? Is another program using the port?`);
    return null;
  }
}

// ── Farm Serial ──
const farmPort = setupSerialPort(FARM_PORT, 'FARM', (data) => {
  farmData = data;
  farmLastUpdate = Date.now();
  farmConnected = true;
});

// ── Cattle Serial ──
const cattlePort = setupSerialPort(CATTLE_PORT, 'CATTLE', (data) => {
  cattleData = data;
  cattleLastUpdate = Date.now();
  cattleConnected = true;
});

// ── Check for timeouts ──
setInterval(() => {
  const now = Date.now();
  if (farmConnected && (now - farmLastUpdate) > TIMEOUT_MS) {
    farmConnected = false;
    console.log('  ⚠️  [FARM] No data received for 10s — marking offline');
  }
  if (cattleConnected && (now - cattleLastUpdate) > TIMEOUT_MS) {
    cattleConnected = false;
    console.log('  ⚠️  [CATTLE] No data received for 10s — marking offline');
  }
}, 5000);

// ═══════════════════════════════════════════════
//  HTTP Endpoints
// ═══════════════════════════════════════════════

// Farm sensor data
app.get('/farm', (req, res) => {
  res.json({
    data: farmData,
    connected: farmConnected && farmData !== null,
    lastUpdate: farmLastUpdate,
    port: FARM_PORT
  });
});

// Cattle band data
app.get('/cattle', (req, res) => {
  res.json({
    data: cattleData,
    connected: cattleConnected && cattleData !== null,
    lastUpdate: cattleLastUpdate,
    port: CATTLE_PORT
  });
});

// Pump control
app.post('/farm/pump', (req, res) => {
  const { action } = req.body;

  if (!farmPort || !farmPort.isOpen) {
    return res.status(503).json({ error: 'Farm device not connected' });
  }

  if (action === 'on') {
    farmPort.write('PUMP_ON\n');
    console.log('  💧 [FARM] Sent PUMP_ON command');
    res.json({ success: true, action: 'PUMP_ON' });
  } else if (action === 'off') {
    farmPort.write('PUMP_OFF\n');
    console.log('  🚫 [FARM] Sent PUMP_OFF command');
    res.json({ success: true, action: 'PUMP_OFF' });
  } else {
    res.status(400).json({ error: 'Invalid action. Use "on" or "off".' });
  }
});

// Overall status
app.get('/status', (req, res) => {
  res.json({
    farm: {
      connected: farmConnected && farmData !== null,
      port: FARM_PORT,
      lastUpdate: farmLastUpdate
    },
    cattle: {
      connected: cattleConnected && cattleData !== null,
      port: CATTLE_PORT,
      lastUpdate: cattleLastUpdate
    },
    uptime: Math.floor(process.uptime())
  });
});

// ═══════════════════════════════════════════════
//  Start Server
// ═══════════════════════════════════════════════

app.listen(HTTP_PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║   🌿 Farm IoT Bridge Server             ║');
  console.log(`  ║   http://localhost:${HTTP_PORT}                 ║`);
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║   Farm ESP32-C6:    ${FARM_PORT.padEnd(20)}║`);
  console.log(`  ║   Cattle ESP32-C3:  ${CATTLE_PORT.padEnd(20)}║`);
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  Endpoints:');
  console.log(`    GET  http://localhost:${HTTP_PORT}/farm`);
  console.log(`    GET  http://localhost:${HTTP_PORT}/cattle`);
  console.log(`    POST http://localhost:${HTTP_PORT}/farm/pump`);
  console.log(`    GET  http://localhost:${HTTP_PORT}/status`);
  console.log('');
  console.log('  Waiting for sensor data...');
  console.log('');
});
