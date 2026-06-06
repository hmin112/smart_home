import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Lightbulb, Wind, Fingerprint, Power, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Loader2, MapPin, Zap, Activity, CreditCard, Thermometer, Droplets, Trash2 } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';

const raspberryIp = window.location.hostname;
const socket = io(`http://${raspberryIp}:3001`);

// --- 애니메이션을 위한 글로벌 스타일 (쓰레기통 출렁임 효과) ---
const GlobalStyles = () => (
  <style>{`
    @keyframes wave-slide {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .apple-widget {
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .apple-widget-active {
      background: white;
      box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
    }
  `}</style>
);

// --- 상단 헤더용: 쓰레기통 수위 초기화 위젯 ---
const TrashResetWidget = ({ onReset }) => (
  <div className="flex items-center justify-center mr-2">
    <button 
      onClick={onReset}
      className="relative text-indigo-500 opacity-90 drop-shadow-sm hover:scale-110 transition-transform p-1"
      title="쓰레기통 수위 초기화"
    >
      <Trash2 size={28} strokeWidth={2.5} />
      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[#EBF0F5] shadow-sm" />
    </button>
  </div>
);

// --- 상단 헤더용: 실시간 날씨 위젯 ---
const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current_weather=true&timezone=Asia%2FTokyo');
        const data = await response.json();
        setWeather(data.current_weather);
      } catch (error) {
        console.error("날씨 데이터를 불러오는데 실패했습니다.", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getWeatherInfo = (code) => {
    if (code === 0) return { icon: Sun, text: '맑음', color: 'text-orange-500' };
    if (code >= 1 && code <= 3) return { icon: Cloud, text: '구름 많음', color: 'text-gray-500' };
    if (code >= 45 && code <= 48) return { icon: Cloud, text: '안개', color: 'text-gray-400' };
    if (code >= 51 && code <= 67) return { icon: CloudRain, text: '비', color: 'text-blue-500' };
    if (code >= 71 && code <= 77) return { icon: CloudSnow, text: '눈', color: 'text-sky-300' };
    if (code >= 95 && code <= 99) return { icon: CloudLightning, text: '뇌우', color: 'text-purple-500' };
    return { icon: Sun, text: '맑음', color: 'text-orange-500' };
  };

  if (loading) {
    return (
      <div className="apple-widget px-5 py-3 rounded-3xl flex items-center gap-3 opacity-70">
        <Loader2 className="animate-spin text-gray-400" size={20} />
      </div>
    );
  }

  if (!weather) return null;

  const { icon: WeatherIcon, text, color } = getWeatherInfo(weather.weathercode);

  return (
    <div className="apple-widget px-5 py-3 rounded-3xl flex items-center gap-4 transition-all duration-300 hover:bg-white/90 cursor-default">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 mb-0.5 text-gray-400">
          <MapPin size={10} strokeWidth={3} />
          <span className="text-[11px] font-bold uppercase tracking-widest">광주광역시</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-semibold text-sm">{text}</span>
          <span className="text-2xl font-bold text-gray-900 tracking-tighter leading-none">{Math.round(weather.temperature)}°</span>
        </div>
      </div>
      <div className="p-2.5 rounded-full bg-gray-50 border border-gray-100 shadow-sm">
        <WeatherIcon size={24} strokeWidth={2.5} className={color} />
      </div>
    </div>
  );
};

// --- 도어락 전용 위젯 ---
const DoorLockCard = ({ isLocked, onClick, logs }) => {
  return (
    <div 
      onClick={onClick} 
      className={`h-48 w-full relative cursor-pointer rounded-[32px] overflow-hidden transition-all duration-500 flex flex-col p-6 ${!isLocked ? 'apple-widget-active transform scale-[1.02]' : 'apple-widget hover:bg-white/90'}`}
    >
      <div className="flex justify-between items-start">
        <div className={`p-3.5 rounded-full transition-all duration-500 ${!isLocked ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
          {!isLocked ? <Unlock size={24} strokeWidth={2.5} /> : <Lock size={24} strokeWidth={2.5} />}
        </div>
        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${!isLocked ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-200'}`} />
      </div>

      <div className="mt-auto pt-4 space-y-0.5">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${!isLocked ? 'text-orange-500' : 'text-gray-400'}`}>
          {!isLocked ? '열림' : '잠김'}
        </p>
        <h3 className={`text-2xl font-bold tracking-tight ${!isLocked ? 'text-gray-900' : 'text-gray-600'}`}>
          도어락
        </h3>
        
        <div className="pt-1.5 flex flex-col gap-1">
          {logs.slice(0, 2).map((log, i) => (
            <div key={i} className="flex items-center gap-1.5 opacity-80">
              <span className={`min-w-[6px] h-[6px] rounded-full ${i === 0 ? 'bg-orange-400' : 'bg-gray-300'}`}></span>
              <span className={`text-[10px] font-medium truncate ${i === 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                {log}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- 전등 전용 위젯 ---
const LightCard = ({ isOn, switches, onTogglePower, onToggleSwitch }) => {
  let statusText = '선택 안됨';
  if (isOn) {
    if (switches.s1 && switches.s2) statusText = '1 & 2 켜짐';
    else if (switches.s1) statusText = '1 켜짐';
    else if (switches.s2) statusText = '2 켜짐';
    else statusText = 'Active (No level)';
  } else {
    if (switches.s1 && switches.s2) statusText = '1 & 2 선택됨';
    else if (switches.s1) statusText = '1 선택됨';
    else if (switches.s2) statusText = '2 선택됨';
  }

  return (
    <div 
      onClick={onTogglePower} 
      className={`h-48 w-full relative cursor-pointer rounded-[32px] overflow-hidden transition-all duration-500 flex flex-col p-6 ${isOn ? 'apple-widget-active transform scale-[1.02]' : 'apple-widget hover:bg-white/90'}`}
    >
      <div className="flex justify-between items-start">
        <div className={`p-3.5 rounded-full transition-all duration-500 ${isOn ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
          <Lightbulb size={24} strokeWidth={2.5} />
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleSwitch('s1'); }}
            className={`w-8 h-8 rounded-full text-[11px] font-black transition-all duration-300 flex items-center justify-center ${switches.s1 ? (isOn ? 'bg-yellow-400 text-white shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-yellow-100 text-yellow-600') : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            1
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onToggleSwitch('s2'); }}
            className={`w-8 h-8 rounded-full text-[11px] font-black transition-all duration-300 flex items-center justify-center ${switches.s2 ? (isOn ? 'bg-yellow-400 text-white shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-yellow-100 text-yellow-600') : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            2
          </button>
        </div>
      </div>

      <div className="mt-auto pt-4 space-y-0.5">
        <p className={`text-[11px] font-bold uppercase tracking-wider ${isOn ? 'text-yellow-500' : 'text-gray-400'}`}>
          {statusText}
        </p>
        <h3 className={`text-2xl font-bold tracking-tight ${isOn ? 'text-gray-900' : 'text-gray-600'}`}>
          전등
        </h3>
      </div>
    </div>
  );
};

// --- 에어컨 리모컨 컴포넌트 ---
const AcRemoteCard = ({ isOn, onTogglePower, mode, onToggleMode, temp, onTempChange }) => {
  const colorBlue = '#007AFF';
  const colorRed = '#FF3B30';
  const activeColor = mode === 'cool' ? 'text-blue-500' : 'text-red-500';
  const ringColor = mode === 'cool' ? colorBlue : colorRed;
  const activeBgClass = mode === 'cool' ? 'bg-blue-500' : 'bg-red-500';

  const dialRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const MIN_TEMP = mode === 'cool' ? 18 : 23;
  const MAX_TEMP = mode === 'cool' ? 27 : 30;
  
  const [visualProgress, setVisualProgress] = useState((temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP));

  const handlePointerMove = (e) => {
    if (!isDragging || !dialRef.current || !isOn) return;
    if (e.cancelable) e.preventDefault(); 
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle > 180) angle -= 360;
    if (angle > 135 && angle < 180) angle = 135;
    if (angle < -135 && angle > -180) angle = -135;

    const progress = (angle + 135) / 270;
    setVisualProgress(progress);
    onTempChange(Math.round(MIN_TEMP + progress * (MAX_TEMP - MIN_TEMP)));
  };

  useEffect(() => {
    if (!isDragging) {
      let safeTemp = Math.min(Math.max(temp, MIN_TEMP), MAX_TEMP);
      setVisualProgress((safeTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP));
    }
  }, [temp, MIN_TEMP, MAX_TEMP, isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', handlePointerMove, { passive: false });
      window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', () => setIsDragging(false));
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', () => setIsDragging(false));
    }
  }, [isDragging, isOn]);

  const dashOffset = 188.4 - (188.4 * visualProgress); 
  const rotationAngle = -135 + (visualProgress * 270);

  return (
    <div className={`col-span-2 w-full relative rounded-[32px] overflow-hidden transition-all duration-700 p-7 flex flex-col ${isOn ? 'apple-widget-active' : 'apple-widget'}`}>
      <div className="relative z-10 flex flex-col">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-3.5 rounded-full transition-all duration-500 ${isOn ? activeBgClass + ' text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
              <Wind size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className={`text-2xl font-bold tracking-tight ${isOn ? 'text-gray-900' : 'text-gray-600'}`}>냉난방기</h3>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${isOn ? activeColor : 'text-gray-400'}`}>
                {isOn ? (mode === 'cool' ? '냉방 모드' : '난방 모드') : '준비 됨'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100/80 p-1 rounded-full border border-gray-200/50">
              <button onClick={() => onToggleMode('cool')} className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${mode === 'cool' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>냉방</button>
              <button onClick={() => onToggleMode('heat')} className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all duration-300 ${mode === 'heat' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>난방</button>
            </div>
            <button onClick={onTogglePower} className={`p-3 rounded-full transition-all duration-300 shadow-sm ${isOn ? activeBgClass + ' text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
              <Power size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className={`flex justify-center items-center overflow-hidden transition-all duration-700 ease-in-out ${isOn ? 'h-52 mt-8 opacity-100' : 'h-0 mt-0 opacity-0 pointer-events-none'}`}>
          <div ref={dialRef} className="relative flex items-center justify-center w-52 h-52 no-select touch-none rounded-full cursor-grab active:cursor-grabbing" onMouseDown={() => isOn && setIsDragging(true)} onTouchStart={() => isOn && setIsDragging(true)}>
            <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${isOn ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
              <Power size={36} className="text-gray-300" strokeWidth={2} />
            </div>
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out ${isOn ? 'opacity-100 scale-100' : 'opacity-0 scale-110 pointer-events-none'}`}>
              <svg className="absolute inset-0 w-full h-full drop-shadow-sm" viewBox="0 0 100 100" style={{ transform: 'rotate(135deg)' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="8" strokeDasharray="188.4 251.2" strokeLinecap="round" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={ringColor} strokeWidth="8" strokeDasharray="188.4 251.2" strokeDashoffset={dashOffset} strokeLinecap="round" className={`${isDragging ? '' : 'transition-all duration-500 ease-out'}`} />
              </svg>
              <div className={`absolute inset-0 pointer-events-none ${isDragging ? '' : 'transition-all duration-500 ease-out'}`} style={{ transform: `rotate(${rotationAngle}deg)` }}>
                <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] border border-gray-100 flex items-center justify-center" style={{ top: 'calc(10% - 16px)' }}><div className={`w-2.5 h-2.5 rounded-full ${activeBgClass}`} /></div>
              </div>
              <div className="flex flex-col items-center z-10 pointer-events-none">
                <span className="text-[64px] font-medium tracking-tighter leading-none text-gray-900">{temp}°</span>
                <span className="text-[11px] font-bold mt-1 uppercase tracking-widest text-gray-400">온도 제어</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 실내 온/습도 위젯 (API 연동 적용) ---
const IndoorClimateCard = () => {
  const [climate, setClimate] = useState({ temp: 24, hum: 45 });

  useEffect(() => {
    const handleSensorData = (data) => {
      if (data.type === 'dht11') {
        setClimate({ 
          temp: Math.round(data.temperature), 
          hum: Math.round(data.humidity) 
        });
      }
    };
    socket.on('sensorData', handleSensorData);
    return () => {
      socket.off('sensorData', handleSensorData);
    };
  }, []);

  const isGood = climate.temp < 28 && climate.hum < 60;

  return (
    <div className="apple-widget p-6 rounded-[32px] flex flex-col justify-between h-48 transition-all duration-500 hover:bg-white/90 cursor-default">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="p-3.5 rounded-full bg-orange-50 text-orange-500 border border-orange-100 shadow-sm"><Thermometer size={24} strokeWidth={2.5} /></div>
          <div className="p-3.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100 shadow-sm"><Droplets size={24} strokeWidth={2.5} /></div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`w-1.5 h-1.5 rounded-full ${isGood ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isGood ? 'text-green-500' : 'text-orange-500'}`}>
            {isGood ? '쾌적' : '주의'}
          </span>
        </div>
      </div>
      <div className="mt-auto space-y-0.5">
        <div className="flex items-end gap-2.5 mb-1 transition-all duration-300">
          <span className="text-3xl font-bold text-gray-900 tracking-tighter">{climate.temp}°</span>
          <span className="text-2xl font-bold text-gray-300 tracking-tighter">/</span>
          <span className="text-3xl font-bold text-gray-900 tracking-tighter">{climate.hum}%</span>
        </div>
        <h3 className="text-sm font-bold tracking-tight text-gray-600">실시간 실내 온습도</h3>
      </div>
    </div>
  );
};

// --- 쓰레기통 수위 위젯 (API 연동) ---
const TrashBinCard = ({ currentDistance, baseDistance }) => {
  // 포화도 계산 로직 개선 (3cm 여유분 적용)
  let percent = 0;
  const MIN_DIST = 3; // 센서 사각지대를 고려한 최소 거리 (100% 기준)

  if (baseDistance > MIN_DIST) {
    // (바닥 거리 - 현재 거리) / (바닥 거리 - 3cm) * 100
    percent = Math.round(((baseDistance - currentDistance) / (baseDistance - MIN_DIST)) * 100);
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
  }

  const isFull = percent > 80;

  return (
    <div className="apple-widget relative rounded-[32px] overflow-hidden transition-all duration-500 h-48 hover:bg-white/90">
      <div 
        className="absolute bottom-0 left-0 w-full z-0 rounded-b-[32px] transition-[height] duration-1000 ease-in-out" 
        style={{ height: `${percent}%` }}
      >
        <svg className="absolute bottom-full left-0 w-[200%] h-[24px] z-0 opacity-80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M0,40 C150,80 350,0 600,40 C850,80 1050,0 1200,40 L1200,120 L0,120 Z" className={isFull ? "fill-red-200" : "fill-indigo-200"} style={{ animation: 'wave-slide 3s linear infinite' }}></path>
          <path d="M0,60 C200,20 400,100 600,60 C800,20 1000,100 1200,60 L1200,120 L0,120 Z" className={isFull ? "fill-red-300" : "fill-indigo-300"} style={{ animation: 'wave-slide 4s linear infinite reverse' }}></path>
        </svg>
        <div className={`absolute inset-0 transition-colors duration-1000 ${isFull ? 'bg-gradient-to-b from-red-200/60 to-red-300/60' : 'bg-gradient-to-b from-indigo-200/60 to-indigo-300/60'}`}></div>
      </div>
      <div className="relative z-10 p-6 flex flex-col justify-between h-full pointer-events-none">
        <div className="flex justify-between items-start">
          <div className={`p-3.5 rounded-full backdrop-blur-md shadow-sm border border-white/50 transition-colors duration-500 ${isFull ? 'bg-red-50 text-red-500' : 'bg-white/80 text-indigo-500'}`}><Trash2 size={24} strokeWidth={2.5} /></div>
          <div className={`px-3 py-1 rounded-full backdrop-blur-md border border-white/50 shadow-sm text-[10px] font-black uppercase tracking-wider transition-colors duration-500 ${isFull ? 'bg-red-50 text-red-500' : 'bg-white/80 text-indigo-500'}`}>{isFull ? '가득 참' : '여유'}</div>
        </div>
        <div className="mt-auto space-y-0.5">
          <div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-900 tracking-tighter">{percent}</span><span className="text-lg font-bold text-gray-500">%</span></div>
          <h3 className="text-sm font-bold tracking-tight text-gray-600">쓰레기통 포화도</h3>
        </div>
      </div>
    </div>
  );
};

// --- 전력 사용량 위젯 ---
const PowerUsageCard = () => {
  const [powerData, setPowerData] = useState({ currentPowerW: 0, accumulatedKWh: 0, estimatedBill: 0 });

  useEffect(() => {
    const fetchPowerData = async () => {
      try {
        const response = await axios.get(`http://${raspberryIp}:3001/api/power`);
        setPowerData(response.data);
      } catch (error) {
        console.error("전력 데이터 갱신 실패", error);
      }
    };
    fetchPowerData();
    const interval = setInterval(fetchPowerData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="col-span-2 w-full relative rounded-[32px] overflow-hidden apple-widget p-7 flex flex-col transition-all duration-500 hover:bg-white/90">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3.5 rounded-full bg-green-500 text-white shadow-md"><Zap size={22} strokeWidth={2.5} /></div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-gray-900">전력 사용량</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-[11px] font-bold uppercase tracking-wider text-green-500">실시간 모니터링</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[ 
          { label: "현재 사용량", val: powerData.currentPowerW, unit: "W", icon: Activity }, 
          { label: "이달 누적량", val: powerData.accumulatedKWh, unit: "kWh", icon: Zap }, 
          { label: "예상 청구 금액", val: powerData.estimatedBill.toLocaleString(), unit: "₩", icon: CreditCard, isPre: true } 
        ].map((item, idx) => (
          <div key={idx} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-gray-400 mb-2"><item.icon size={14} strokeWidth={2.5} /><span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span></div>
            <div className="flex items-baseline gap-1">{item.isPre && <span className="text-sm font-semibold text-gray-500 mr-0.5">{item.unit}</span>}<span className="text-3xl font-bold text-gray-900 tracking-tighter">{item.val}</span>{!item.isPre && <span className="text-sm font-semibold text-gray-500">{item.unit}</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 메인 앱 컴포넌트 ---
export default function App() {
  const [isLocked, setIsLocked] = useState(true);
  const [doorLogs, setDoorLogs] = useState(["09:00 - 문이 잠겼습니다."]);

  // Trash Bin State
  const [currentTrashDist, setCurrentTrashDist] = useState(30);
  const [baseTrashDist, setBaseTrashDist] = useState(30);

  useEffect(() => {
    const handleSensorData = (data) => {
      if (data.type === 'ultrasonic') {
        setCurrentTrashDist(data.distance);
      }
    };
    socket.on('sensorData', handleSensorData);
    return () => socket.off('sensorData', handleSensorData);
  }, []);

  const handleTrashReset = () => {
    setBaseTrashDist(currentTrashDist);
    console.log(`Trash bin reset. New base distance: ${currentTrashDist}cm`);
  };

  const handleDoorToggle = () => {
    const nextLockedState = !isLocked;
    setIsLocked(nextLockedState);
    socket.emit('toggleDoor');
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    const newLog = nextLockedState 
      ? `${timeStr} - 문이 잠겼습니다.` 
      : `${timeStr} - 사용자가 문을 열었습니다.`;
    setDoorLogs(prev => [newLog, ...prev]);
  };

  const [isLightOn, setIsLightOn] = useState(false);
  const [lightSwitches, setLightSwitches] = useState({ s1: false, s2: false });

  const handleTogglePower = () => {
    const newState = !isLightOn;
    setIsLightOn(newState);
    
    if (!newState) {
       socket.emit('setLight', { id: 1, status: 'OFF' });
       socket.emit('setLight', { id: 2, status: 'OFF' });
    } else {
       if (lightSwitches.s1) socket.emit('setLight', { id: 1, status: 'ON' });
       if (lightSwitches.s2) socket.emit('setLight', { id: 2, status: 'ON' });
       if (!lightSwitches.s1 && !lightSwitches.s2) {
         setLightSwitches({ s1: true, s2: true });
         socket.emit('setLight', { id: 1, status: 'ON' });
         socket.emit('setLight', { id: 2, status: 'ON' });
       }
    }
  };

  const handleToggleSwitch = (id) => {
    setLightSwitches(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      if (isLightOn) {
        socket.emit('setLight', { id: id === 's1' ? 1 : 2, status: newState[id] ? 'ON' : 'OFF' });
      }
      return newState;
    });
  };

  const [acPower, setAcPower] = useState(false);
  const [acMode, setAcMode] = useState('cool');
  const [acTemp, setAcTemp] = useState(24);

  const handleAcPower = () => {
    const newState = !acPower;
    setAcPower(newState);
    if (newState) {
      socket.emit('setAC', { command: `AC_POWER_ON_${acMode.toUpperCase()}_${acTemp}`, rawStatus: 'ON' });
    } else {
      socket.emit('setAC', { command: 'AC_POWER_OFF', rawStatus: 'OFF' });
    }
  };

  const handleAcMode = (mode) => {
    setAcMode(mode);
    if (acPower) {
      socket.emit('setAC', { command: `AC_${mode.toUpperCase()}_${acTemp}`, rawStatus: 'ON' });
    }
  };

  const handleAcTemp = (temp) => {
    setAcTemp(temp);
    if (acPower) {
      socket.emit('setAC', { command: `AC_${acMode.toUpperCase()}_${temp}`, rawStatus: 'ON' });
    }
  };

  return (
    <>
      <GlobalStyles />
      <div className="min-h-screen py-16 px-6 flex flex-col items-center relative select-none bg-[#F5F7FA]">
        <div className="w-full max-w-3xl mx-auto z-10">
          <header className="mb-10 flex justify-between items-end">
            <div className="px-2">
              <h1 className="text-[40px] font-bold text-gray-900 tracking-tight leading-none mb-2">My Home</h1>
              <p className="text-gray-500 font-semibold tracking-wide text-sm">스마트 홈 제어 패널</p>
            </div>
            <div className="flex items-center gap-4"><TrashResetWidget onReset={handleTrashReset} /><WeatherWidget /></div>
          </header>

          <div className="grid grid-cols-2 gap-5 items-start">
            <DoorLockCard isLocked={isLocked} onClick={handleDoorToggle} logs={doorLogs} />
            <LightCard isOn={isLightOn} switches={lightSwitches} onTogglePower={handleTogglePower} onToggleSwitch={handleToggleSwitch} />
            <AcRemoteCard isOn={acPower} onTogglePower={handleAcPower} mode={acMode} onToggleMode={handleAcMode} temp={acTemp} onTempChange={handleAcTemp} />
            
            <IndoorClimateCard />
            
            <TrashBinCard currentDistance={currentTrashDist} baseDistance={baseTrashDist} />
            <PowerUsageCard />
          </div>
        </div>
      </div>
    </>
  );
}
