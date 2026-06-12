require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// MySQL Connection
let db;
async function initDB() {
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'smartuser',
      password: 'smartpassword',
      database: 'smarthome'
    });
    console.log('Connected to MySQL database.');
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
  }
}
initDB();

// GPIO setup for Doorlock
const { exec } = require('child_process');
let toggleDoorlock = () => {
  console.log('Mock Doorlock toggled');
};

try {
  const { Gpio } = require('onoff');
  const doorlockGpio = new Gpio(17, 'out');
  console.log('GPIO17 initialized for Doorlock (onoff).');
  toggleDoorlock = () => {
    doorlockGpio.writeSync(1);
    setTimeout(() => doorlockGpio.writeSync(0), 150);
  };
} catch (error) {
  console.log('GPIO Initialization Error:', error.message);
  console.log('Checking for newer Raspberry Pi OS GPIO tools (pinctrl/raspi-gpio)...');
  
  exec('pinctrl help', (err1) => {
    if (!err1) {
      console.log('pinctrl found! Using pinctrl for Doorlock (Raspberry Pi 5 / Bookworm).');
      toggleDoorlock = () => {
        exec('pinctrl set 17 op dh');
        setTimeout(() => exec('pinctrl set 17 op dl'), 150);
      };
    } else {
      exec('raspi-gpio help', (err2) => {
        if (!err2) {
          console.log('raspi-gpio found! Using raspi-gpio for Doorlock.');
          toggleDoorlock = () => {
            exec('raspi-gpio set 17 op dh');
            setTimeout(() => exec('raspi-gpio set 17 op dl'), 150);
          };
        } else {
          console.log('No GPIO tools found. Mocking Doorlock.');
        }
      });
    }
  });
}

// Serial Ports setup
let arduino1 = { 
  path: 'none',
  write: (data) => console.log(`[Arduino 1 Not Ready] Would have sent: ${data}`) 
};
let arduino2 = { 
  path: 'none',
  write: (data) => console.log(`[Arduino 2 Not Ready] Would have sent: ${data}`) 
};

async function setupSerial() {
  try {
    const ports = await SerialPort.list();
    console.log('--- Serial Port Discovery ---');
    console.log('Available ports:', ports.map(p => p.path));

    for (const portInfo of ports) {
      const path = portInfo.path;
      if (path.includes('ttyACM') || path.includes('ttyUSB')) {
        console.log(`Attempting to open port: ${path}`);
        const port = new SerialPort({ path, baudRate: 9600 });
        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        
        port.on('open', () => console.log(`Port ${path} successfully opened.`));

        parser.on('data', (data) => {
          // Identify Arduino 1 by "T:" (Temperature)
          if (data.startsWith('T:')) {
            if (arduino1.path !== path) {
              console.log(`[ID] Arduino 1 (DHT11/Lights) identified on ${path}`);
              arduino1 = port;
            }
            const parts = data.split(',');
            if (parts.length === 2) {
              const temp = parseFloat(parts[0].substring(2));
              const hum = parseFloat(parts[1].substring(2));
              io.emit('sensorData', { type: 'dht11', temperature: temp, humidity: hum });
            }
          } 
          // Identify Arduino 2 by "D:" (Distance)
          else if (data.startsWith('D:')) {
            if (arduino2.path !== path) {
              console.log(`[ID] Arduino 2 (Ultrasonic/AC) identified on ${path}`);
              arduino2 = port;
            }
            const distance = parseFloat(data.substring(2));
            io.emit('sensorData', { type: 'ultrasonic', distance });
          } else {
            console.log(`[Unknown Data from ${path}]: ${data}`);
          }
        });

        port.on('error', (err) => {
          console.error(`[Error] Port ${path}:`, err.message);
        });
      }
    }
  } catch (err) {
    console.error('[Critical] Serial Setup Error:', err.message);
  }
}
setupSerial();

// Device Status Map
const deviceStatus = {
  light1: 'OFF',
  light2: 'OFF',
  ac: 'OFF'
};

async function logDeviceState(deviceId, status) {
  if (db) {
    try {
      await db.execute(
        'INSERT INTO device_logs (device_id, status) VALUES (?, ?)',
        [deviceId, status]
      );
    } catch (error) {
      console.error('Failed to log device state:', error);
    }
  }
}

// WebSockets Handling
io.on('connection', (socket) => {
  console.log('Frontend connected via WebSocket');

  // Doorlock Control (Pulse signal)
  socket.on('toggleDoor', () => {
    console.log('Control: Toggling Doorlock');
    toggleDoorlock();
  });

  // Lights Control
  socket.on('setLight', async (data) => {
    // data: { id: 1|2, status: 'ON'|'OFF' }
    const deviceId = `light${data.id}`;
    if (deviceStatus[deviceId] !== data.status) {
      deviceStatus[deviceId] = data.status;
      const cmd = `LIGHT${data.id}_${data.status}\n`;
      console.log(`Control: Sending to Arduino 1 (${arduino1.path}): ${cmd.trim()}`);
      arduino1.write(cmd);
      await logDeviceState(`전등${data.id}`, data.status);
    }
  });

  // AC Control
  socket.on('setAC', async (data) => {
    // data: { command: 'AC_COOL_18', rawStatus: 'ON' } 
    console.log(`Control: Sending to Arduino 2 (${arduino2.path}): ${data.command}`);
    arduino2.write(`${data.command}\n`);
    
    if (deviceStatus.ac !== data.rawStatus) {
      deviceStatus.ac = data.rawStatus;
      await logDeviceState('냉난방기', data.rawStatus);
    }
  });
});

// Power calculation API endpoint
app.get('/api/power', async (req, res) => {
  if (!db) {
    return res.status(500).json({ error: 'Database not connected' });
  }

  try {
    // Simplified power calculation logic
    // In a real scenario, this would query device_logs to calculate durations
    // For demonstration, we simulate calculation based on current status
    
    // Consumption rates (W)
    const RATES = { light1: 10, light2: 10, ac: 1500 };
    
    let currentPowerW = 0;
    if (deviceStatus.light1 === 'ON') currentPowerW += RATES.light1;
    if (deviceStatus.light2 === 'ON') currentPowerW += RATES.light2;
    if (deviceStatus.ac === 'ON') currentPowerW += RATES.ac;

    // Simulate accumulated power (kWh) - ideally calculate from DB `changed_at`
    // Let's execute a query to get last 30 days of data and compute (simplified placeholder query)
    const [rows] = await db.execute('SELECT device_id, status, changed_at FROM device_logs ORDER BY changed_at ASC');
    
    let accumulatedKWh = 0.0;
    let stateTracker = { '전등1': null, '전등2': null, '냉난방기': null };
    
    rows.forEach(row => {
        if (row.status === 'ON') {
            stateTracker[row.device_id] = new Date(row.changed_at).getTime();
        } else if (row.status === 'OFF' && stateTracker[row.device_id]) {
            const durationMs = new Date(row.changed_at).getTime() - stateTracker[row.device_id];
            const durationHours = durationMs / (1000 * 60 * 60);
            
            if (row.device_id === '전등1') accumulatedKWh += durationHours * (RATES.light1 / 1000);
            if (row.device_id === '전등2') accumulatedKWh += durationHours * (RATES.light2 / 1000);
            if (row.device_id === '냉난방기') accumulatedKWh += durationHours * (RATES.ac / 1000);
            
            stateTracker[row.device_id] = null;
        }
    });

    // Add currently running devices to accumulation
    const now = Date.now();
    ['전등1', '전등2', '냉난방기'].forEach((dev, index) => {
        const rateKeys = ['light1', 'light2', 'ac'];
        if (stateTracker[dev]) {
            const durationHours = (now - stateTracker[dev]) / (1000 * 60 * 60);
            accumulatedKWh += durationHours * (RATES[rateKeys[index]] / 1000);
        }
    });

    // Simple Electricity Bill Calculation (Korean Residential Tier - Simplified)
    // < 200kWh: 120 won/kWh, 201~400: 214 won/kWh, > 400: 302 won/kWh
    let estimatedBill = 0;
    if (accumulatedKWh <= 200) {
        estimatedBill = accumulatedKWh * 120;
    } else if (accumulatedKWh <= 400) {
        estimatedBill = (200 * 120) + ((accumulatedKWh - 200) * 214.6);
    } else {
        estimatedBill = (200 * 120) + (200 * 214.6) + ((accumulatedKWh - 400) * 302.9);
    }

    res.json({
      currentPowerW,
      accumulatedKWh: parseFloat(accumulatedKWh.toFixed(3)),
      estimatedBill: Math.round(estimatedBill)
    });
  } catch (error) {
    console.error('Power calculation error:', error);
    res.status(500).json({ error: 'Internal calculation error' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
