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
    await loadDeviceStates(); // Load states immediately after connection
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
let lastKnownTemp = 25; // Default

function runAutomationLogic(temp) {
  if (!automationSettings.enabled) return;

  const currentMonth = new Date().getMonth(); 
  // 3월(2) ~ 10월(9) : 에어컨(냉방) 시즌
  const isSummerSeason = currentMonth >= 2 && currentMonth <= 9;

  // 1. 시즌에 따른 강제 모드 및 온도 보정
  let targetMode = isSummerSeason ? 'cool' : 'heat';
  let targetTemp = automationSettings.targetTemp;

  // 온도 범위 보정 (Arduino 지원 및 기기 한계)
  if (targetMode === 'cool') {
    if (targetTemp < 18) targetTemp = 18;
    if (targetTemp > 27) targetTemp = 27;
  } else {
    // 난방은 23도부터 지원 (Arduino 코드 기준)
    if (targetTemp < 23) targetTemp = 23;
    if (targetTemp > 30) targetTemp = 30;
  }

  // 2. 가동/종료 로직
  if (targetMode === 'cool') {
    // 냉방 작동 (실내온도 >= 설정온도 + 1)
    if (temp >= targetTemp + 1 && !deviceStates.acPower) {
      // Arduino 지원 명령어로 켜기 (COOL_18) 후 온도 조절
      arduino2.write('AC_POWER_ON_COOL_18\n');
      if (targetTemp > 18) {
        setTimeout(() => arduino2.write(`AC_COOL_${targetTemp}\n`), 1000);
      }
      deviceStates.acPower = true;
      deviceStates.acMode = 'cool';
      deviceStates.acTemp = targetTemp;
      logDeviceState('냉난방기', `ON_COOL_${targetTemp}`);
      saveDeviceStates();
      io.emit('initialStates', deviceStates);
    } 
    // 냉방 종료 (실내온도 <= 설정온도)
    else if (temp <= targetTemp && deviceStates.acPower && deviceStates.acMode === 'cool') {
      arduino2.write('AC_POWER_OFF\n');
      deviceStates.acPower = false;
      logDeviceState('냉난방기', 'OFF');
      saveDeviceStates();
      io.emit('initialStates', deviceStates);
    }
    // 여름 시즌인데 난방 중이면 즉시 종료
    else if (deviceStates.acPower && deviceStates.acMode === 'heat') {
      arduino2.write('AC_POWER_OFF\n');
      deviceStates.acPower = false;
      logDeviceState('냉난방기', 'OFF');
      saveDeviceStates();
      io.emit('initialStates', deviceStates);
    }
  } else { // Winter Mode (Heat)
    // 난방 작동 (실내온도 <= 설정온도 - 1)
    if (temp <= targetTemp - 1 && !deviceStates.acPower) {
      // Arduino 지원 명령어로 켜기 (HEAT_26) 후 온도 조절
      arduino2.write('AC_POWER_ON_HEAT_26\n');
      if (targetTemp !== 26) {
        setTimeout(() => arduino2.write(`AC_HEAT_${targetTemp}\n`), 1000);
      }
      deviceStates.acPower = true;
      deviceStates.acMode = 'heat';
      deviceStates.acTemp = targetTemp;
      logDeviceState('냉난방기', `ON_HEAT_${targetTemp}`);
      saveDeviceStates();
      io.emit('initialStates', deviceStates);
    }
    // 난방 종료 (실내온도 >= 설정온도)
    else if (temp >= targetTemp && deviceStates.acPower && deviceStates.acMode === 'heat') {
      arduino2.write('AC_POWER_OFF\n');
      deviceStates.acPower = false;
      logDeviceState('냉난방기', 'OFF');
      saveDeviceStates();
      io.emit('initialStates', deviceStates);
    }
    // 겨울 시즌인데 냉방 중이면 즉시 종료
    else if (deviceStates.acPower && deviceStates.acMode === 'cool') {
      arduino2.write('AC_POWER_OFF\n');
      deviceStates.acPower = false;
      logDeviceState('냉난방기', 'OFF');
      saveDeviceStates();
      io.emit('initialStates', deviceStates);
    }
  }
}

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
              const temp = parseFloat(parts[0].substring(2));
              const hum = parseFloat(parts[1].substring(2));
              lastKnownTemp = temp; // 전역 변수로 온도 저장
              io.emit('sensorData', { type: 'dht11', temperature: temp, humidity: hum });

              // 지능형 자동화: 쾌적 모드 (Comfort Mode)
              runAutomationLogic(temp);
            }
          } 
          else if (data.startsWith('D:')) { console.log('GOT DISTANCE:', data); console.log('Distance Data:', data); io.emit('debug_serial', data); console.log('Distance Data Received:', data);
            arduino2 = port;
            io.emit('sensorData', { type: 'ultrasonic', distance: parseFloat(data.substring(2)) });
          }
        });
      }
    }
  } catch (err) {}
}
setupSerial();

const deviceStates = {
  isLocked: true,
  isLightOn: false,
  lightSwitches: { s1: false, s2: false },
  acPower: false,
  acMode: 'cool',
  acTemp: 24,
  trashBaseDistance: 30
};

let automationSettings = { enabled: false, targetTemp: 26, lastSleepTrigger: 0 };

async function saveDeviceStates() {
  if (db) {
    try {
      await db.execute(
        'INSERT INTO settings (key_name, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)',
        ['device_states', JSON.stringify(deviceStates)]
      );
    } catch (e) { console.error('Failed to save device states:', e); }
  }
}

async function loadDeviceStates() {
  if (!db) return;
  try {
    const [rows] = await db.execute('SELECT key_name, value_json FROM settings WHERE key_name IN ("device_states", "automation_settings")');
    rows.forEach(row => {
      let saved = row.value_json;
      if (typeof saved === 'string') saved = JSON.parse(saved);
      if (row.key_name === 'device_states') Object.assign(deviceStates, saved);
      if (row.key_name === 'automation_settings') Object.assign(automationSettings, saved);
    });
  } catch (e) { console.error('Failed to load states:', e); }
}

async function logDeviceState(deviceId, status) {
  if (db) {
    try { await db.execute('INSERT INTO device_logs (device_id, status) VALUES (?, ?)', [deviceId, status]); } catch (error) {}
  }
}

io.on('connection', async (socket) => {
  await loadDeviceStates();
  socket.emit('initialStates', deviceStates);

  socket.on('toggleDoor', async () => {
    deviceStates.isLocked = !deviceStates.isLocked;
    toggleDoorlock();
    await saveDeviceStates();
  });

  socket.on('updateTrashBase', async (dist) => {
    deviceStates.trashBaseDistance = dist;
    await saveDeviceStates();
    io.emit('initialStates', deviceStates);
  });

  socket.on('setLight', async (data) => {
    const { id, status } = data;
    const switchKey = `s${id}`;
    deviceStates.lightSwitches[switchKey] = (status === 'ON');
    
    // Update global power state: if any switch is ON, isLightOn is true
    deviceStates.isLightOn = deviceStates.lightSwitches.s1 || deviceStates.lightSwitches.s2;
    
    arduino1.write(`LIGHT${id}_${status}\n`);
    await logDeviceState(`전등${id}`, status);
    await saveDeviceStates();
  });

  socket.on('setAC', async (data) => {
    const { command, rawStatus } = data;
    arduino2.write(`${command}\n`);
    
    deviceStates.acPower = (rawStatus === 'ON');
    if (command.includes('COOL')) deviceStates.acMode = 'cool';
    else if (command.includes('HEAT')) deviceStates.acMode = 'heat';
    
    const tempMatch = command.match(/(\d+)$/);
    if (tempMatch) deviceStates.acTemp = parseInt(tempMatch[1]);

    await logDeviceState('냉난방기', rawStatus);
    await saveDeviceStates();
  });
});

app.get('/api/device-states', async (req, res) => {
  await loadDeviceStates();
  res.json(deviceStates);
});

// Helper to calculate dynamic AC rate based on mode and temperature
function getDynamicAcRate(mode, temp) {
  // Base rates: Heat uses more power than Cool
  const baseCool = 1000;
  const baseHeat = 1500;
  
  if (mode === 'cool') {
    // Cool: 18°C is max power, 27°C is min power
    // Power increases as temp goes down (18: 1500W, 27: 1050W)
    const factor = (27 - temp) / (27 - 18);
    return baseCool + (500 * factor);
  } else if (mode === 'heat') {
    // Heat: 30°C is max power, 23°C is min power
    // Power increases as temp goes up (30: 2200W, 23: 1500W)
    const factor = (temp - 23) / (30 - 23);
    return baseHeat + (700 * factor);
  }
  return 1500; // Fallback
}

async function getUsageForPeriod(startDate, endDate) {
  if (!db) return 0;
  const RATES = { light1: 10, light2: 10 };
  const [rows] = await db.execute('SELECT device_id, status, UNIX_TIMESTAMP(changed_at) * 1000 as changed_ms FROM device_logs WHERE changed_at <= ? ORDER BY changed_at ASC', [endDate]);
  let accumulatedKWh = 0.0;
  let stateTracker = { '전등1': null, '전등2': null, '냉난방기': null };
  let currentAcRate = 1500; // Track historical AC rate
  const startMs = startDate.getTime(), endMs = endDate.getTime();

  rows.forEach(row => {
    const ms = row.changed_ms;
    
    // Parse complex status for AC (e.g., ON_COOL_18)
    let isAcOn = false;
    if (row.device_id === '냉난방기') {
        if (row.status === 'OFF') {
            isAcOn = false;
        } else {
            isAcOn = true;
            if (row.status.includes('COOL')) {
                const tempMatch = row.status.match(/(\d+)$/);
                currentAcRate = getDynamicAcRate('cool', tempMatch ? parseInt(tempMatch[1]) : 24);
            } else if (row.status.includes('HEAT')) {
                const tempMatch = row.status.match(/(\d+)$/);
                currentAcRate = getDynamicAcRate('heat', tempMatch ? parseInt(tempMatch[1]) : 26);
            }
        }
    }

    if ((row.device_id !== '냉난방기' && row.status === 'ON') || (row.device_id === '냉난방기' && isAcOn)) { 
        // If AC is already tracking, calculate accumulated time before updating rate
        if (row.device_id === '냉난방기' && stateTracker['냉난방기']) {
            const onTime = Math.max(stateTracker['냉난방기'], startMs), offTime = Math.min(ms, endMs);
            if (offTime > onTime) {
                accumulatedKWh += ((offTime - onTime) / (1000 * 60 * 60)) * (currentAcRate / 1000);
            }
        }
        stateTracker[row.device_id] = ms; 
    } 
    else if ((row.device_id !== '냉난방기' && row.status === 'OFF' && stateTracker[row.device_id]) || 
             (row.device_id === '냉난방기' && !isAcOn && stateTracker['냉난방기'])) {
      const onTime = Math.max(stateTracker[row.device_id], startMs), offTime = Math.min(ms, endMs);
      if (offTime > onTime) {
        const durationHours = (offTime - onTime) / (1000 * 60 * 60);
        if (row.device_id === '전등1') accumulatedKWh += durationHours * (RATES.light1 / 1000);
        if (row.device_id === '전등2') accumulatedKWh += durationHours * (RATES.light2 / 1000);
        if (row.device_id === '냉난방기') accumulatedKWh += durationHours * (currentAcRate / 1000);
      }
      stateTracker[row.device_id] = null;
    }
  });

  const finalEndMs = Math.min(endMs, Date.now());
  if (stateTracker['전등1']) accumulatedKWh += ((finalEndMs - Math.max(stateTracker['전등1'], startMs)) / (1000 * 60 * 60)) * (RATES.light1 / 1000);
  if (stateTracker['전등2']) accumulatedKWh += ((finalEndMs - Math.max(stateTracker['전등2'], startMs)) / (1000 * 60 * 60)) * (RATES.light2 / 1000);
  if (stateTracker['냉난방기']) accumulatedKWh += ((finalEndMs - Math.max(stateTracker['냉난방기'], startMs)) / (1000 * 60 * 60)) * (currentAcRate / 1000);

  return accumulatedKWh;
}

app.get('/api/power', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not connected' });
  try {
    const RATES = { light1: 10, light2: 10 };
    let currentPowerW = 0;
    if (deviceStates.lightSwitches.s1) currentPowerW += RATES.light1;
    if (deviceStates.lightSwitches.s2) currentPowerW += RATES.light2;
    if (deviceStates.acPower) {
        currentPowerW += Math.round(getDynamicAcRate(deviceStates.acMode, deviceStates.acTemp));
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const accumulatedKWh = await getUsageForPeriod(startOfMonth, new Date());

    let estimatedBill = 0;
    if (accumulatedKWh <= 200) estimatedBill = accumulatedKWh * 120;
    else if (accumulatedKWh <= 400) estimatedBill = (200 * 120) + ((accumulatedKWh - 200) * 214.6);
    else estimatedBill = (200 * 120) + (200 * 214.6) + ((accumulatedKWh - 400) * 302.9);

    res.json({ currentPowerW, accumulatedKWh: parseFloat(accumulatedKWh.toFixed(3)), estimatedBill: Math.round(estimatedBill) });
  } catch (e) {
    console.error("Power API Error:", e);
    res.status(500).json({ error: 'Internal error' });
  }
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

    const currentTime = Date.now();
    const todayStr = getKSTDateStr(new Date(currentTime));
    ['전등1', '전등2', '냉난방기'].forEach(dev => {
        if (stateTracker[dev] && dailyData[todayStr]) {
            const hours = (currentTime - stateTracker[dev]) / (1000 * 60 * 60);
            if (dev.startsWith('전등')) dailyData[todayStr].lightHours += hours;
            if (dev === '냉난방기') dailyData[todayStr].acHours += hours;
        }
    });

    res.json(Object.values(dailyData));
  } catch (e) { res.status(500).json({ error: 'Internal error' }); }
});

app.get('/api/energy-advisor', async (req, res) => {
  if (!db) return res.status(500).json({ error: 'DB not connected' });
  try {
    const now = new Date();
    let temp = 25; // default fallback
    try {
      const weatherRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current_weather=true');
      const weatherData = await weatherRes.json();
      temp = weatherData.current_weather.temperature;
    } catch (e) { console.log("Weather fetch failed for advisor"); }

    let hourlyBenchmark = 1.0;
    if (temp > 32) hourlyBenchmark = 2.4;
    else if (temp > 28) hourlyBenchmark = 1.8;
    else if (temp > 24) hourlyBenchmark = 1.4;
    else if (temp < 10) hourlyBenchmark = 2.0;

    let currentPowerW = 0;
    if (deviceStates.lightSwitches.s1) currentPowerW += 10;
    if (deviceStates.lightSwitches.s2) currentPowerW += 10;
    if (deviceStates.acPower) {
        currentPowerW += Math.round(getDynamicAcRate(deviceStates.acMode, deviceStates.acTemp));
    }
    
    const hourlyUsage = currentPowerW / 1000;
    const efficiencyPercent = hourlyBenchmark > 0 ? Math.round((hourlyUsage / hourlyBenchmark) * 100) : 0;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthUsage = await getUsageForPeriod(startOfMonth, now);
    const daysPassed = Math.max((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24), 0.1);

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

    let guide = "";
    let recommendedTemp = 26;
    if (temp > 30) recommendedTemp = 25;
    else if (temp > 25) recommendedTemp = 26;
    else if (temp < 10) recommendedTemp = 24;

    if (currentPowerW === 0) {
      guide = "현재 가동 중인 기기가 없어 에너지가 절약되고 있습니다.";
    } else if (efficiencyPercent > 180) {
      guide = `에너지 소모가 극심합니다(${efficiencyPercent}%)! 즉시 온도를 ${recommendedTemp}도 이상으로 높여 전력 낭비를 막아주세요.`;
    } else if (efficiencyPercent > 140) {
      guide = `전력 소모가 상당히 높습니다. 온도를 ${recommendedTemp}도로 조절하면 효율적인 에너지 관리가 가능합니다.`;
    } else if (efficiencyPercent > 100) {
      guide = `권장 사용량을 조금 초과했습니다. 에어컨 온도를 1~2도만 높여도 효율이 훨씬 좋아집니다.`;
    } else {
      guide = "실시간 기온을 고려한 최적의 에너지 효율을 보여주고 있습니다. 아주 좋은 습관입니다!";
    }

    res.json({
      efficiencyPercent,
      projectedBill,
      targetBill,
      status,
      guide
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

app.get('/api/automation', (req, res) => res.json(automationSettings));

app.post('/api/automation', async (req, res) => {
  const previousEnabled = automationSettings.enabled;
  automationSettings.enabled = req.body.enabled !== undefined ? req.body.enabled : automationSettings.enabled;
  automationSettings.targetTemp = req.body.targetTemp !== undefined ? req.body.targetTemp : automationSettings.targetTemp;
  
  // 즉시 자동화 로직 적용
  if (automationSettings.enabled) {
    runAutomationLogic(lastKnownTemp);
  } else if (previousEnabled && !automationSettings.enabled && deviceStates.acPower) {
    // 자동화가 꺼졌을 때 냉난방기가 켜져있다면 (자동화에 의해 켜진 경우 등) 끔
    arduino2.write('AC_POWER_OFF\n');
    deviceStates.acPower = false;
    logDeviceState('냉난방기', 'OFF');
    saveDeviceStates();
    io.emit('initialStates', deviceStates);
  }

  if (db) {
    try {
      await db.execute(
        'INSERT INTO settings (key_name, value_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)',
        ['automation_settings', JSON.stringify(automationSettings)]
      );
      res.json({ success: true, settings: automationSettings });
    } catch (e) {
      console.error('Failed to save automation settings:', e);
      res.status(500).json({ error: e.message });
    }
  } else {
    res.status(500).json({ error: 'DB not connected' });
  }
});

setInterval(() => {
  if (automationSettings.enabled) {
    const now = new Date();
    // 자정(00:00) 정각 확인
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      if (now.getTime() - automationSettings.lastSleepTrigger > 60000) {
        automationSettings.lastSleepTrigger = now.getTime();
        if (deviceStates.isLightOn) {
          arduino1.write('LIGHT1_OFF\n');
          setTimeout(() => arduino1.write('LIGHT2_OFF\n'), 200);
          deviceStates.isLightOn = false;
          deviceStates.lightSwitches.s1 = false;
          deviceStates.lightSwitches.s2 = false;
          logDeviceState('전등1', 'OFF');
          logDeviceState('전등2', 'OFF');
          saveDeviceStates();
          io.emit('initialStates', deviceStates);
        }
      }
    }
  }
}, 10000);

app.get('/api/ai-energy-coach', async (req, res) => {
  const pythonPath = 'python3';
  const scriptPath = require('path').join(__dirname, 'ai_coach_model.py');
  
  exec(`${pythonPath} "${scriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Exec error: ${error}`);
      return res.status(500).json({ error: 'AI model execution failed' });
    }
    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (e) {
      console.error(`Parse error: ${e}, stdout: ${stdout}`);
      res.status(500).json({ error: 'Failed to parse AI output' });
    }
  });
});

server.listen(3001, () => { console.log('Backend server running on port 3001'); });
