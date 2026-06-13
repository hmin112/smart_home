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

let db;
async function initDB() {
  try {
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'smartuser',
      password: 'smartpassword',
      database: 'smarthome',
      timezone: '+00:00'
    });
    console.log('Connected to MySQL database.');
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
  }
}
initDB();

const { exec } = require('child_process');
let toggleDoorlock = () => { console.log('Mock Doorlock toggled'); };
try {
  const { Gpio } = require('onoff');
  const doorlockGpio = new Gpio(17, 'out');
  toggleDoorlock = () => {
    doorlockGpio.writeSync(1);
    setTimeout(() => doorlockGpio.writeSync(0), 150);
  };
} catch (error) {
  exec('pinctrl help', (err1) => {
    if (!err1) {
      toggleDoorlock = () => {
        exec('pinctrl set 17 op dh');
        setTimeout(() => exec('pinctrl set 17 op dl'), 150);
      };
    }
  });
}

let arduino1 = { write: (data) => {} };
let arduino2 = { write: (data) => {} };

async function setupSerial() {
  try {
    const ports = await SerialPort.list();
    for (const portInfo of ports) {
      const path = portInfo.path;
      if (path.includes('ttyACM') || path.includes('ttyUSB')) {
        const port = new SerialPort({ path, baudRate: 9600 });
        const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
        parser.on('data', (data) => {
          if (data.startsWith('T:')) {
            arduino1 = port;
            const parts = data.split(',');
            if (parts.length === 2) {
              io.emit('sensorData', { type: 'dht11', temperature: parseFloat(parts[0].substring(2)), humidity: parseFloat(parts[1].substring(2)) });
            }
          } 
          else if (data.startsWith('D:')) {
            arduino2 = port;
            io.emit('sensorData', { type: 'ultrasonic', distance: parseFloat(data.substring(2)) });
          }
        });
      }
    }
  } catch (err) {}
}
setupSerial();

const deviceStatus = { light1: 'OFF', light2: 'OFF', ac: 'OFF' };

async function logDeviceState(deviceId, status) {
  if (db) {
    try { await db.execute('INSERT INTO device_logs (device_id, status) VALUES (?, ?)', [deviceId, status]); } catch (error) {}
  }
}

io.on('connection', (socket) => {
  socket.on('toggleDoor', () => toggleDoorlock());
  socket.on('setLight', async (data) => {
    const deviceId = `light${data.id}`;
    if (deviceStatus[deviceId] !== data.status) {
      deviceStatus[deviceId] = data.status;
      arduino1.write(`LIGHT${data.id}_${data.status}\n`);
      await logDeviceState(`전등${data.id}`, data.status);
    }
  });
  socket.on('setAC', async (data) => {
    arduino2.write(`${data.command}\n`);
    if (deviceStatus.ac !== data.rawStatus) {
      deviceStatus.ac = data.rawStatus;
      await logDeviceState('냉난방기', data.rawStatus);
    }
  });
});

async function getUsageForPeriod(startDate, endDate) {
  if (!db) return 0;
  const RATES = { light1: 10, light2: 10, ac: 1500 };
  const [rows] = await db.execute('SELECT device_id, status, UNIX_TIMESTAMP(changed_at) * 1000 as changed_ms FROM device_logs WHERE changed_at <= ? ORDER BY changed_at ASC', [endDate]);
  let accumulatedKWh = 0.0;
  let stateTracker = { '전등1': null, '전등2': null, '냉난방기': null };
  const startMs = startDate.getTime(), endMs = endDate.getTime();

  rows.forEach(row => {
    const ms = row.changed_ms;
    if (row.status === 'ON') { stateTracker[row.device_id] = ms; } 
    else if (row.status === 'OFF' && stateTracker[row.device_id]) {
      const onTime = Math.max(stateTracker[row.device_id], startMs), offTime = Math.min(ms, endMs);
      if (offTime > onTime) {
        const durationHours = (offTime - onTime) / (1000 * 60 * 60);
        if (row.device_id === '전등1') accumulatedKWh += durationHours * (RATES.light1 / 1000);
        if (row.device_id === '전등2') accumulatedKWh += durationHours * (RATES.light2 / 1000);
        if (row.device_id === '냉난방기') accumulatedKWh += durationHours * (RATES.ac / 1000);
      }
      stateTracker[row.device_id] = null;
    }
  });

  const finalEndMs = Math.min(endMs, Date.now());
  const devMap = { '전등1': 'light1', '전등2': 'light2', '냉난방기': 'ac' };
  ['전등1', '전등2', '냉난방기'].forEach((dev) => {
    if (stateTracker[dev]) {
      const onTime = Math.max(stateTracker[dev], startMs);
      if (finalEndMs > onTime) {
        const durationHours = (finalEndMs - onTime) / (1000 * 60 * 60);
        accumulatedKWh += durationHours * (RATES[devMap[dev]] / 1000);
      }
    }
  });
  return accumulatedKWh;
}

app.get('/api/power', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not connected' });
  try {
    const RATES = { light1: 10, light2: 10, ac: 1500 };
    let currentPowerW = 0;
    if (deviceStatus.light1 === 'ON') currentPowerW += RATES.light1;
    if (deviceStatus.light2 === 'ON') currentPowerW += RATES.light2;
    if (deviceStatus.ac === 'ON') currentPowerW += RATES.ac;

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const accumulatedKWh = await getUsageForPeriod(startOfMonth, new Date());

    let estimatedBill = 0;
    if (accumulatedKWh <= 200) estimatedBill = accumulatedKWh * 120;
    else if (accumulatedKWh <= 400) estimatedBill = (200 * 120) + ((accumulatedKWh - 200) * 214.6);
    else estimatedBill = (200 * 120) + (200 * 214.6) + ((accumulatedKWh - 400) * 302.9);

    res.json({ currentPowerW, accumulatedKWh: parseFloat(accumulatedKWh.toFixed(3)), estimatedBill: Math.round(estimatedBill) });
  } catch (e) { res.status(500).json({ error: 'Internal error' }); }
});

app.get('/api/daily-usage', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not connected' });
  const getKSTDateStr = (date) => new Date(date.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
  try {
    const [rows] = await db.execute('SELECT device_id, status, UNIX_TIMESTAMP(changed_at) * 1000 as changed_ms FROM device_logs WHERE changed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) ORDER BY changed_at ASC');
    const dailyData = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dateStr = getKSTDateStr(d);
      dailyData[dateStr] = { date: dateStr.substring(5), lightHours: 0, acHours: 0 };
    }
    let stateTracker = { '전등1': null, '전등2': null, '냉난방기': null };
    rows.forEach(row => {
        const ms = row.changed_ms, dateStr = getKSTDateStr(new Date(ms));
        if (row.status === 'ON') { stateTracker[row.device_id] = ms; } 
        else if (row.status === 'OFF' && stateTracker[row.device_id]) {
            const hours = (ms - stateTracker[row.device_id]) / (1000 * 60 * 60);
            if (dailyData[dateStr]) {
                if (row.device_id.startsWith('전등')) dailyData[dateStr].lightHours += hours;
                if (row.device_id === '냉난방기') dailyData[dateStr].acHours += hours;
            }
            stateTracker[row.device_id] = null;
        }
    });
    res.json(Object.values(dailyData));
  } catch (e) { res.status(500).json({ error: 'Internal error' }); }
});

app.get('/api/energy-advisor', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not connected' });
  try {
    const now = new Date();
    let weatherBenchmarkKWh = 1.5;
    try {
      const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current_weather=true');
      const weatherData = await weatherRes.json();
      const temp = weatherData.current_weather.temperature;
      if (temp > 30) weatherBenchmarkKWh = 5.0;
      else if (temp > 25) weatherBenchmarkKWh = 3.0;
      else if (temp < 10) weatherBenchmarkKWh = 4.0;
    } catch (e) {}

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthUsage = await getUsageForPeriod(startOfMonth, now);
    const daysPassed = Math.max((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24), 0.1);
    const dailyUsage = monthUsage / daysPassed;
    const efficiencyPercent = Math.round((dailyUsage / weatherBenchmarkKWh) * 100);

    const [settingsRows] = await db.execute('SELECT value_json FROM settings WHERE key_name = "energy_settings"');
    let energySettings = settingsRows[0] ? settingsRows[0].value_json : { targetBill: 50000 };
    if (typeof energySettings === 'string') { try { energySettings = JSON.parse(energySettings); } catch (e) { energySettings = { targetBill: 50000 }; } }
    const targetBill = energySettings.targetBill || 50000;

    let currentBill = 0;
    if (monthUsage <= 200) currentBill = monthUsage * 120;
    else if (monthUsage <= 400) currentBill = (200 * 120) + ((monthUsage - 200) * 214.6);
    else currentBill = (200 * 120) + (200 * 214.6) + ((monthUsage - 400) * 302.9);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedBill = Math.round((currentBill / daysPassed) * daysInMonth);
    
    let status = '안전';
    if (projectedBill >= targetBill) status = '위험';
    else if (projectedBill >= targetBill * 0.8) status = '주의';

    res.json({
      efficiencyPercent,
      projectedBill,
      targetBill,
      status,
      guide: efficiencyPercent > 120 ? `외부 기온 대비 사용량이 ${efficiencyPercent}%로 높습니다. 에어컨 설정을 조절해 보세요.` : "현재 외부 기온 대비 권장 전력량을 잘 유지하고 있습니다."
    });
  } catch (e) { res.status(500).json({ error: 'Internal error' }); }
});

app.post('/api/settings', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not connected' });
  const { key, value } = req.body;
  try {
    await db.execute('INSERT INTO settings (key_name, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)', [key, JSON.stringify(value)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

server.listen(3001, () => { console.log('Backend server running on port 3001'); });
