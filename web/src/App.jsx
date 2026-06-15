import { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, Lightbulb, Wind, Power, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Loader2, MapPin, Zap, Activity, CreditCard, Thermometer, Droplets, Trash2, BarChart2, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import io from 'socket.io-client';
import axios from 'axios';

const raspberryIp = window.location.hostname;
const socket = io(`http://${raspberryIp}:3001`);

// --- 애니메이션 및 글로벌 스타일 ---
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

// --- 에너지 어드바이저 모달 ---
const EnergyAdvisorModal = ({ isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState('');

  const fetchAdvisorData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`http://${raspberryIp}:3001/api/energy-advisor`);
      if (response.data) {
        setData(response.data);
        setNewTarget((response.data.targetBill || 50000).toString());
      }
    } catch {
      console.error("Advisor 데이터 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdvisorData();
    }
  }, [isOpen]);

  const handleUpdateTarget = async () => {
    try {
      await axios.post(`http://${raspberryIp}:3001/api/settings`, {
        key: 'energy_settings',
        value: { targetBill: parseInt(newTarget) }
      });
      setIsEditingTarget(false);
      fetchAdvisorData();
    } catch {
      alert("목표 설정 업데이트 실패");
    }
  };

  if (!isOpen) return null;

  const statusColors = {
    '안전': 'text-green-500 bg-green-50',
    '주의': 'text-orange-500 bg-orange-50',
    '위험': 'text-red-500 bg-red-50'
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md transition-all duration-300" onClick={onClose}>
      <div 
        className="apple-widget w-full max-w-lg rounded-[40px] p-10 relative shadow-2xl border border-white/50" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-2.5 rounded-full bg-gray-100/50 text-gray-400 hover:bg-gray-200 transition-all">
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-5 mb-10">
          <div className="p-4 rounded-3xl bg-indigo-500 text-white shadow-lg">
            <Activity size={32} strokeWidth={2.5} />
          </div>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">에너지 어드바이저</h2>
            {data && (
              <div className={`px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest border border-current ${statusColors[data.status]}`}>
                {data.status}
              </div>
            )}
          </div>
        </div>

        {loading || !data ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
        ) : (
          <div className="space-y-8">
            <div className="bg-gray-50/70 rounded-3xl p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${data.efficiencyPercent > 120 || data.status === '위험' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                  {data.efficiencyPercent > 120 || data.status === '위험' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
                </div>
                <p className="text-gray-700 font-medium leading-relaxed">
                  {data.guide}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">실시간 기온 대비 효율</span>
                  <div className="flex items-center gap-1">
                    {data.efficiencyPercent > 100 ? <TrendingUp size={14} className="text-orange-500" /> : <TrendingDown size={14} className="text-green-500" />}
                    <span className={`text-lg font-bold ${data.efficiencyPercent > 100 ? 'text-orange-500' : 'text-green-500'}`}>
                      {data.efficiencyPercent}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${data.efficiencyPercent > 120 ? 'bg-orange-400' : 'bg-green-400'}`}
                     style={{ width: `${Math.min(Math.max(data.efficiencyPercent, 10), 100)}%` }}
                   />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">이달 예상 요금</span>
                  <span className="text-lg font-bold text-gray-900">₩{data.projectedBill.toLocaleString()}</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                   <div 
                     className={`h-full transition-all duration-1000 ${data.status === '위험' ? 'bg-red-400' : data.status === '주의' ? 'bg-orange-400' : 'bg-green-400'}`}
                     style={{ width: `${Math.min((data.projectedBill / data.targetBill) * 100, 100)}%` }}
                   />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">목표 요금 관리</span>
                <button 
                  onClick={() => setIsEditingTarget(!isEditingTarget)}
                  className="text-[11px] font-bold text-indigo-500 hover:underline"
                >
                  {isEditingTarget ? '취소' : '설정 변경'}
                </button>
              </div>
              {isEditingTarget ? (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={newTarget} 
                    onChange={(e) => setNewTarget(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="목표 금액 입력"
                  />
                  <button 
                    onClick={handleUpdateTarget}
                    className="bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-400">현재 목표:</span>
                  <span className="text-xl font-bold text-gray-900">₩{data.targetBill.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 일일 사용량 히스토그램 모달 ---
const UsageChartModal = ({ isOpen, onClose, deviceType }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`http://${raspberryIp}:3001/api/daily-usage`);
          setData(res.data);
        } catch (err) {
          console.error("사용량 데이터 로드 실패", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rawMax = Math.max(...data.map(d => deviceType === 'light' ? d.lightHours : d.acHours), 0);
  const totalToday = data.length > 0 ? (deviceType === 'light' ? data[data.length-1].lightHours : data[data.length-1].acHours) : 0;
  const maxHours = rawMax > 0 ? rawMax : 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md transition-all duration-300" onClick={onClose}>
      <div 
        className="apple-widget w-full max-w-lg rounded-[40px] p-10 relative shadow-2xl border border-white/50" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-2.5 rounded-full bg-gray-100/50 text-gray-400 hover:bg-gray-200 transition-all">
          <X size={20} />
        </button>
        <div className="flex items-center gap-5 mb-12">
          <div className={`p-4 rounded-3xl ${deviceType === 'light' ? 'bg-yellow-400' : 'bg-blue-500'} text-white shadow-lg`}>
            <BarChart2 size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{deviceType === 'light' ? '전등 일일 사용' : '냉난방기 일일 사용'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Statistics</p>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <p className="text-[11px] font-black text-blue-500 uppercase">Today: {totalToday < 1 ? `${Math.round(totalToday * 60)}m` : `${totalToday.toFixed(1)}h`}</p>
            </div>
          </div>
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
        ) : (
          <div className="flex items-end justify-between h-64 gap-3 px-2">
            {data.map((d, i) => {
              const hours = deviceType === 'light' ? d.lightHours : d.acHours;
              const height = (hours / maxHours) * 100;
              return (
                <div key={i} className="flex-1 h-full flex flex-col justify-end items-center group">
                  <div className="relative w-full h-full flex flex-col justify-end items-center">
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-gray-900 text-white text-[11px] font-black px-3 py-1.5 rounded-xl shadow-xl transform -translate-y-1 group-hover:translate-y-0 whitespace-nowrap z-20">
                      {hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`}
                    </div>
                    <div className={`w-full max-w-[32px] rounded-t-2xl transition-all duration-1000 ${deviceType === 'light' ? 'bg-yellow-400/50 group-hover:bg-yellow-400' : 'bg-blue-500/50 group-hover:bg-blue-500'}`} style={{ height: `${hours > 0 ? Math.max(height, 8) : 2}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-gray-400 mt-5 tracking-tighter shrink-0">{d.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 기타 소형 위젯 ---
const TrashResetWidget = ({ onReset }) => (
  <button onClick={onReset} className="relative text-indigo-500 hover:scale-110 transition-transform p-1">
    <Trash2 size={28} />
    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[#EBF0F5]" />
  </button>
);

// --- 날씨 공통 설정 및 아이콘 매핑 ---
const getWeatherConfig = (code) => {
  if (code === 0) return { icon: Sun, text: '맑음', color: 'text-orange-500', bg: 'bg-orange-50' };
  if (code >= 1 && code <= 3) return { icon: Cloud, text: '구름 많음', color: 'text-gray-400', bg: 'bg-gray-50' };
  if (code >= 45 && code <= 48) return { icon: Cloud, text: '안개', color: 'text-gray-300', bg: 'bg-gray-50' };
  if (code >= 51 && code <= 67) return { icon: CloudRain, text: '비', color: 'text-blue-500', bg: 'bg-blue-50' };
  if (code >= 71 && code <= 77) return { icon: CloudSnow, text: '눈', color: 'text-sky-300', bg: 'bg-sky-50' };
  if (code >= 80 && code <= 82) return { icon: CloudRain, text: '소나기', color: 'text-indigo-500', bg: 'bg-indigo-50' };
  if (code >= 95 && code <= 99) return { icon: CloudLightning, text: '뇌우', color: 'text-purple-500', bg: 'bg-purple-50' };
  return { icon: Sun, text: '맑음', color: 'text-orange-500', bg: 'bg-orange-50' };
};

// --- 날씨 상세 정보 모달 ---
const WeatherModal = ({ isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchDetail = async () => {
        setLoading(true);
        try {
          const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&timezone=Asia%2FTokyo');
          const d = await res.json();
          setData(d);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
      };
      fetchDetail();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const info = data ? getWeatherConfig(data.current.weather_code) : null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md transition-all duration-300" onClick={onClose}>
      <div className="apple-widget w-full max-w-lg rounded-[40px] p-10 relative shadow-2xl border border-white/50" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-8 right-8 p-2.5 rounded-full bg-gray-100/50 text-gray-400 hover:bg-gray-200 transition-all"><X size={20} /></button>
        
        {loading || !data ? (
          <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-2 text-gray-400 font-bold flex items-center gap-1.5"><MapPin size={14} /> 광주광역시</div>
            <div className={`p-6 rounded-[32px] ${info.bg} mb-6 mt-4`}><info.icon size={64} className={info.color} strokeWidth={2} /></div>
            <h2 className="text-5xl font-black text-gray-900 tracking-tighter mb-2">{Math.round(data.current.temperature_2m)}°</h2>
            <p className="text-xl font-bold text-gray-500 mb-10">{info.text}</p>
            
            {/* 시간대별 예보 (수평 스크롤) */}
            <div className="w-full mb-10 overflow-x-auto no-scrollbar pb-2">
              <div className="flex gap-6 min-w-max px-2">
                {(() => {
                  const currentHourPrefix = data.current.time.substring(0, 13);
                  let sIdx = data.hourly.time.findIndex(t => t.startsWith(currentHourPrefix));
                  if (sIdx === -1) sIdx = 0;
                  
                  return data.hourly.time.slice(sIdx, sIdx + 24).map((time, i) => {
                    const isNow = i === 0;
                    const hInfo = getWeatherConfig(isNow ? data.current.weather_code : data.hourly.weather_code[sIdx + i]);
                    const hour = new Date(time).getHours();
                    return (
                      <div key={i} className={`flex flex-col items-center gap-3 ${isNow ? 'bg-indigo-50 px-4 py-3 rounded-2xl border border-indigo-100' : ''}`}>
                        <span className={`text-[11px] font-black uppercase ${isNow ? 'text-indigo-500' : 'text-gray-400'}`}>{isNow ? '지금' : `${hour}시`}</span>
                        <hInfo.icon size={22} className={hInfo.color} strokeWidth={2.5} />
                        <span className={`text-sm font-bold ${isNow ? 'text-indigo-900' : 'text-gray-800'}`}>{Math.round(data.hourly.temperature_2m[sIdx + i])}°</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="grid grid-cols-3 w-full gap-4 pt-6 border-t border-gray-100">
              {[
                { label: "체감 온도", val: `${Math.round(data.current.apparent_temperature)}°`, icon: Thermometer },
                { label: "습도", val: `${data.current.relative_humidity_2m}%`, icon: Droplets },
                { label: "풍속", val: `${data.current.wind_speed_10m}m/s`, icon: Wind }
              ].map((item, i) => (
                <div key={i} className="bg-gray-50/50 rounded-2xl p-4 flex flex-col items-center gap-2 border border-gray-100/50">
                  <item.icon size={18} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                  <span className="text-lg font-bold text-gray-900">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 자동화 설정 모달 ---
const AutomationSettingsModal = ({ isOpen, onClose, auto, onUpdate }) => {
  const [temp, setTemp] = useState(auto.targetTemp);

  useEffect(() => {
    if (isOpen) setTemp(auto.targetTemp);
  }, [isOpen, auto.targetTemp]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/10 backdrop-blur-md transition-all duration-300" onClick={onClose}>
      <div 
        className="apple-widget w-full max-w-sm rounded-[40px] p-10 relative shadow-2xl border border-white/50" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-2.5 rounded-full bg-gray-100/50 text-gray-400 hover:bg-gray-200 transition-all">
          <X size={20} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-3xl bg-indigo-500 text-white shadow-lg mb-6">
            <Zap size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">자동화 온도 설정</h2>
          <p className="text-sm text-gray-400 font-medium mb-10">목표 온도를 조절하세요</p>
          
          <div className="w-full space-y-8">
            <div className="flex justify-center items-end">
              <span className="text-5xl font-black text-indigo-500">{temp}°C</span>
            </div>
            
            <input 
              type="range" 
              min="18" 
              max="30" 
              value={temp} 
              onChange={(e) => setTemp(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            
            <div className="flex justify-between text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
              <span>18°C (Min)</span>
              <span>30°C (Max)</span>
            </div>

            <button 
              onClick={() => {
                onUpdate({ ...auto, targetTemp: temp });
                onClose();
              }}
              className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-600 transition-all active:scale-95"
            >
              설정 완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 상단 헤더용: 아두이노 재연결 위젯 ---
const ReconnectWidget = () => {
  const [reconnecting, setReconnecting] = useState(false);
  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      await axios.get(`http://${raspberryIp}:3001/api/reconnect`);
      setTimeout(() => setReconnecting(false), 2000);
    } catch (e) {
      console.error("재연결 요청 실패", e);
      setReconnecting(false);
    }
  };
  return (
    <div className="flex items-center justify-center mr-2">
      <button 
        onClick={handleReconnect}
        disabled={reconnecting}
        className={`p-3 rounded-2xl transition-all duration-300 ${reconnecting ? 'bg-indigo-100 text-indigo-400 animate-spin' : 'bg-white/80 text-indigo-500 hover:bg-white hover:shadow-md border border-white/50'}`}
        title="아두이노 재연결"
      >
        <RefreshCw size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
};

// --- 지능형 자동화 스케줄러 위젯 ---
const SmartAutomationWidget = () => {
  const [auto, setAuto] = useState({ enabled: false, targetTemp: 26 });
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchAuto = async () => {
      try {
        const res = await axios.get(`http://${raspberryIp}:3001/api/automation`);
        if (res.data) setAuto(res.data);
      } catch { /* ignore */ }
    };
    fetchAuto();
  }, []);

  const toggleEnabled = async () => {
    const next = { ...auto, enabled: !auto.enabled };
    setAuto(next);
    await axios.post(`http://${raspberryIp}:3001/api/automation`, next);
  };

  const updateAuto = async (next) => {
    setAuto(next);
    await axios.post(`http://${raspberryIp}:3001/api/automation`, next);
  };

  return (
    <>
      <AutomationSettingsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        auto={auto} 
        onUpdate={updateAuto} 
      />
      <div className="apple-widget px-4 py-2.5 rounded-3xl flex items-center gap-4 border border-gray-200/50 shadow-sm bg-white/50 hover:bg-white/80 transition-all">
        <div className="flex flex-col items-center">
          <span 
            onClick={() => setIsModalOpen(true)}
            className="text-[9px] font-black uppercase text-indigo-500 mb-1.5 tracking-widest cursor-pointer hover:text-indigo-700 transition-colors"
          >
            자동화 모드
          </span>
          <button 
            onClick={toggleEnabled}
            className={`w-10 h-5 rounded-full relative transition-colors duration-300 shadow-inner ${auto.enabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
          >
            <div 
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${auto.enabled ? 'translate-x-5' : 'translate-x-0'}`} 
            />
          </button>
        </div>
        <div className="w-px h-8 bg-gray-200/80"></div>
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase text-gray-400 mb-0.5 tracking-widest">목표</span>
          <span className="text-sm font-black text-gray-900">{auto.targetTemp}°</span>
        </div>
      </div>
    </>
  );
};

const WeatherWidget = ({ onClick }) => {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current=temperature_2m,weather_code&timezone=Asia%2FTokyo');
        const data = await res.json(); setWeather(data.current);
      } catch { /* ignore */ }
    };
    fetchWeather(); setInterval(fetchWeather, 30 * 60 * 1000);
  }, []);
  
  if (!weather) return null;
  const config = getWeatherConfig(weather.weather_code);

  return (
    <div onClick={onClick} className="apple-widget px-5 py-3 rounded-3xl flex items-center gap-4 cursor-pointer hover:bg-white/90 transition-all active:scale-95">
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1 text-gray-400"><MapPin size={10} /><span className="text-[11px] font-bold uppercase tracking-widest">광주광역시</span></div>
        <span className="text-2xl font-bold text-gray-900 tracking-tighter leading-none">{Math.round(weather.temperature_2m)}°</span>
      </div>
      <div className="p-2.5 rounded-full bg-gray-50 border border-gray-100 shadow-sm">
        <config.icon size={24} strokeWidth={2.5} className={config.color} />
      </div>
    </div>
  );
};

// --- 카드 컴포넌트들 ---
const DoorLockCard = ({ isLocked, onClick, logs }) => (
  <div onClick={onClick} className={`h-48 w-full cursor-pointer rounded-[32px] transition-all duration-500 flex flex-col p-6 ${!isLocked ? 'apple-widget-active scale-[1.02]' : 'apple-widget hover:bg-white/90'}`}>
    <div className="flex justify-between items-start">
      <div className={`p-3.5 rounded-full ${!isLocked ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>{!isLocked ? <Unlock size={24} /> : <Lock size={24} />}</div>
      <div className={`w-3 h-3 rounded-full ${!isLocked ? 'bg-green-500 shadow-md' : 'bg-gray-200'}`} />
    </div>
    <div className="mt-auto pt-4">
      <p className={`text-[11px] font-bold uppercase tracking-wider ${!isLocked ? 'text-orange-500' : 'text-gray-400'}`}>{!isLocked ? '열림' : '잠김'}</p>
      <h3 className={`text-2xl font-bold tracking-tight ${!isLocked ? 'text-gray-900' : 'text-gray-600'}`}>도어락</h3>
      <div className="pt-1.5 flex flex-col gap-1">{logs.slice(0, 2).map((log, i) => (<div key={i} className="flex items-center gap-1.5 opacity-80"><span className={`min-w-[6px] h-[6px] rounded-full ${i === 0 ? 'bg-orange-400' : 'bg-gray-300'}`}></span><span className={`text-[10px] font-medium truncate ${i === 0 ? 'text-gray-600' : 'text-gray-400'}`}>{log}</span></div>))}</div>
    </div>
  </div>
);

const LightCard = ({ isOn, switches, onTogglePower, onToggleSwitch, onShowChart }) => (
  <div onClick={onTogglePower} className={`h-48 w-full cursor-pointer rounded-[32px] transition-all duration-500 flex flex-col p-6 ${isOn ? 'apple-widget-active scale-[1.02]' : 'apple-widget hover:bg-white/90'}`}>
    <div className="flex justify-between items-start">
      <div className={`p-3.5 rounded-full ${isOn ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}><Lightbulb size={24} /></div>
      <div className="flex gap-2">
        {['s1', 's2'].map((s, i) => (<button key={s} onClick={(e) => { e.stopPropagation(); onToggleSwitch(s); }} className={`w-8 h-8 rounded-full text-[11px] font-black transition-all ${switches[s] ? (isOn ? 'bg-yellow-400 text-white shadow-md' : 'bg-yellow-100 text-yellow-600') : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{i + 1}</button>))}
        <button onClick={(e) => { e.stopPropagation(); onShowChart(); }} className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-all flex items-center justify-center ml-1"><BarChart2 size={16} /></button>
      </div>
    </div>
    <div className="mt-auto pt-4"><p className={`text-[11px] font-bold uppercase tracking-wider ${isOn ? 'text-yellow-500' : 'text-gray-400'}`}>{isOn ? (switches.s1 && switches.s2 ? '모두 켜짐' : (switches.s1 ? '1 켜짐' : '2 켜짐')) : '꺼짐'}</p><h3 className={`text-2xl font-bold tracking-tight ${isOn ? 'text-gray-900' : 'text-gray-600'}`}>전등</h3></div>
  </div>
);

const AcRemoteCard = ({ isOn, onTogglePower, mode, onToggleMode, temp, onTempChange, onShowChart }) => {
  const dialRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const min = mode === 'cool' ? 18 : 22, max = mode === 'cool' ? 27 : 30;
  const progress = (temp - min) / (max - min);
  const rotation = -135 + (progress * 270);
  const offset = 188.4 - (188.4 * progress);

  const handlePointerMove = (e) => {
    if (!isDragging || !dialRef.current || !isOn) return;
    if (e.cancelable) e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle > 180) angle -= 360;
    if (angle > 135) angle = 135; if (angle < -135) angle = -135;
    onTempChange(Math.round(min + ((angle + 135) / 270) * (max - min)));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove); window.addEventListener('mouseup', () => setIsDragging(false));
      window.addEventListener('touchmove', handlePointerMove, { passive: false }); window.addEventListener('touchend', () => setIsDragging(false));
    }
    return () => {
      window.removeEventListener('mousemove', handlePointerMove); window.removeEventListener('mouseup', () => setIsDragging(false));
      window.removeEventListener('touchmove', handlePointerMove); window.removeEventListener('touchend', () => setIsDragging(false));
    };
  }, [isDragging]);

  const color = mode === 'cool' ? '#007AFF' : '#FF3B30';
  const bg = mode === 'cool' ? 'bg-blue-500' : 'bg-red-500';

  return (
    <div className={`col-span-2 w-full rounded-[32px] overflow-hidden transition-all duration-700 p-7 flex flex-col ${isOn ? 'apple-widget-active' : 'apple-widget'}`}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3"><div className={`p-3.5 rounded-full ${isOn ? bg + ' text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}><Wind size={22} /></div><div><h3 className={`text-2xl font-bold ${isOn ? 'text-gray-900' : 'text-gray-600'}`}>냉난방기</h3><p className={`text-[11px] font-bold uppercase tracking-wider ${isOn ? (mode === 'cool' ? 'text-blue-500' : 'text-red-500') : 'text-gray-400'}`}>{isOn ? (mode === 'cool' ? '냉방' : '난방') : '준비'}</p></div></div>
        <div className="flex items-center gap-3">
          <button onClick={onShowChart} className="p-3 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-all"><BarChart2 size={20} /></button>
          <div className="flex items-center bg-gray-100/80 p-1 rounded-full">
            <button onClick={() => onToggleMode('cool')} className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${mode === 'cool' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400'}`}>냉방</button>
            <button onClick={() => onToggleMode('heat')} className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all ${mode === 'heat' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-400'}`}>난방</button>
          </div>
          <button onClick={onTogglePower} className={`p-3 rounded-full transition-all ${isOn ? bg + ' text-white' : 'bg-gray-100 text-gray-400'}`}><Power size={20} /></button>
        </div>
      </div>
      <div className={`flex justify-center transition-all duration-700 ${isOn ? 'h-52 opacity-100' : 'h-0 opacity-0 pointer-events-none'}`}>
        <div ref={dialRef} className="relative w-52 h-52 flex items-center justify-center" onMouseDown={() => setIsDragging(true)} onTouchStart={() => setIsDragging(true)}>
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" style={{ transform: 'rotate(135deg)' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="8" strokeDasharray="188.4 251.2" strokeLinecap="round" />
            <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8" strokeDasharray="188.4 251.2" strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
          </svg>
          <div className="absolute flex flex-col items-center"><span className="text-[64px] font-medium text-gray-900 leading-none">{temp}°</span><span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">온도 제어</span></div>
          <div className="absolute inset-0 transition-all duration-500" style={{ transform: `rotate(${rotation}deg)` }}><div className={`absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-md border border-gray-100 flex items-center justify-center`} style={{ top: 'calc(10% - 16px)' }}><div className={`w-2.5 h-2.5 rounded-full ${bg}`} /></div></div>
        </div>
      </div>
    </div>
  );
};

const IndoorClimateCard = () => {
  const [climate, setClimate] = useState({ temp: 0, hum: 0 });
  useEffect(() => {
    const handleSensorData = (d) => { 
      if (d.type === 'dht11') setClimate({ temp: Math.round(d.temperature), hum: Math.round(d.humidity) }); 
    };
    socket.on('sensorData', handleSensorData);
    return () => socket.off('sensorData', handleSensorData);
  }, []);
  return (
    <div className="apple-widget p-6 rounded-[32px] flex flex-col justify-between h-48">
      <div className="flex justify-between items-start">
        <div className="flex gap-2"><div className="p-3.5 rounded-full bg-orange-50 text-orange-500"><Thermometer size={24} /></div><div className="p-3.5 rounded-full bg-blue-50 text-blue-500"><Droplets size={24} /></div></div>
        <div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${climate.temp < 28 ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></span><span className={`text-[10px] font-bold uppercase tracking-wider ${climate.temp < 28 ? 'text-green-500' : 'text-orange-500'}`}>{climate.temp < 28 ? '쾌적' : '주의'}</span></div>
      </div>
      <div className="mt-auto">
        <div className="flex items-end gap-2.5 mb-1"><span className="text-3xl font-bold text-gray-900">{climate.temp}°</span><span className="text-2xl font-bold text-gray-300">/</span><span className="text-3xl font-bold text-gray-900">{climate.hum}%</span></div>
        <h3 className="text-sm font-bold text-gray-600">실시간 실내 온습도</h3>
      </div>
    </div>
  );
};

const TrashBinCard = ({ currentDistance, baseDistance }) => {
  const percent = baseDistance > 3 ? Math.min(Math.max(Math.round(((baseDistance - currentDistance) / (baseDistance - 3)) * 100), 0), 100) : 0;
  const isFull = percent > 80;
  return (
    <div className="apple-widget relative rounded-[32px] overflow-hidden h-48">
      <div className="absolute bottom-0 left-0 w-full transition-[height] duration-1000 ease-in-out" style={{ height: `${percent}%` }}>
        <svg className="absolute bottom-full left-0 w-[200%] h-[24px] opacity-80" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,40 C150,80 350,0 600,40 C850,80 1050,0 1200,40 L1200,120 L0,120 Z" className={isFull ? "fill-red-200" : "fill-indigo-200"} style={{ animation: 'wave-slide 3s linear infinite' }}></path><path d="M0,60 C200,20 400,100 600,60 C800,20 1000,100 1200,60 L1200,120 L0,120 Z" className={isFull ? "fill-red-300" : "fill-indigo-300"} style={{ animation: 'wave-slide 4s linear infinite reverse' }}></path></svg>
        <div className={`absolute inset-0 ${isFull ? 'bg-gradient-to-b from-red-200/60 to-red-300/60' : 'bg-gradient-to-b from-indigo-200/60 to-indigo-300/60'}`}></div>
      </div>
      <div className="relative z-10 p-6 flex flex-col justify-between h-full pointer-events-none">
        <div className="flex justify-between items-start"><div className={`p-3.5 rounded-full backdrop-blur-md ${isFull ? 'bg-red-50 text-red-500' : 'bg-white/80 text-indigo-500'}`}><Trash2 size={24} /></div><div className={`px-3 py-1 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-wider ${isFull ? 'bg-red-50 text-red-500' : 'bg-white/80 text-indigo-500'}`}>{isFull ? '가득 참' : '여유'}</div></div>
        <div className="mt-auto"><div className="flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-900">{percent}</span><span className="text-lg font-bold text-gray-500">%</span></div><h3 className="text-sm font-bold text-gray-600">쓰레기통 포화도</h3></div>
      </div>
    </div>
  );
};

// --- AI 에너지 코치 카드 ---
const AIEnergyCoachCard = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="col-span-2 apple-widget p-8 rounded-[40px] flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="col-span-2 apple-widget p-8 rounded-[40px] transition-all duration-500 hover:bg-white/80 border border-white/50 relative overflow-hidden">
      {/* Decorative Gradient Background */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
            <TrendingUp size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">AI 에너지 코치</h3>
              <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                AI
              </div>
            </div>
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-[0.15em]">예측 전력 소비 분석</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI 예측 신뢰도</div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-1000" 
                style={{ width: `${data.confidence}%` }} 
              />
            </div>
            <span className="text-sm font-black text-indigo-600">{data.confidence}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 relative z-10">
        <div className="p-6 rounded-[32px] bg-white/40 border border-white/60">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">이번 달 예상 요금</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-900">₩{data.currentBill.toLocaleString()}</span>
            <span className="text-gray-400 font-bold">원</span>
          </div>
        </div>
        <div className="p-6 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10">
          <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mb-3">다음 달 예측 요금</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-indigo-600">₩{data.predictedNextMonthBill.toLocaleString()}</span>
            <span className="text-indigo-400 font-bold">원</span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-6 rounded-[32px] bg-gradient-to-r from-gray-50 to-white/10 border border-white/60 relative z-10">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white shadow-sm text-indigo-500">
            <Activity size={20} />
          </div>
          <div className="space-y-2">
            {data.message.map((msg, i) => (
              <p key={i} className={`text-sm font-semibold ${i === 2 ? 'text-indigo-600' : 'text-gray-600'}`}>
                {msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PowerUsageCard = ({ onShowAdvisor }) => {
  const [data, setData] = useState({ currentPowerW: 0, accumulatedKWh: 0, estimatedBill: 0 });
  useEffect(() => {
    const fetch = async () => { try { const res = await axios.get(`http://${raspberryIp}:3001/api/power`); setData(res.data); } catch { /* ignore */ } };
    fetch(); const itv = setInterval(fetch, 5000); return () => clearInterval(itv);
  }, []);
  return (
    <div className="col-span-2 w-full rounded-[32px] overflow-hidden apple-widget p-7 flex flex-col transition-all duration-500 hover:bg-white/90">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-full bg-green-500 text-white shadow-md"><Zap size={22} /></div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">전력 사용량</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-green-500">실시간 모니터링</p>
            </div>
          </div>
        </div>
        <button 
          onClick={onShowAdvisor}
          className="p-2.5 px-5 rounded-2xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 transition-all border border-indigo-100 flex items-center gap-2"
        >
          <Activity size={18} strokeWidth={2.5} />
          <span className="text-[11px] font-black uppercase tracking-widest">에너지 어드바이저</span>
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[ { label: "현재 사용량", val: data.currentPowerW, unit: "W", icon: Activity }, { label: "이달 누적량", val: data.accumulatedKWh, unit: "kWh", icon: Zap }, { label: "예상 청구 금액", val: data.estimatedBill.toLocaleString(), unit: "₩", icon: CreditCard, isPre: true } ].map((item, idx) => (
          <div key={idx} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between"><div className="flex items-center gap-1.5 text-gray-400 mb-2"><item.icon size={14} /><span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span></div><div className="flex items-baseline gap-1">{item.isPre && <span className="text-sm font-semibold text-gray-500 mr-0.5">{item.unit}</span>}<span className="text-3xl font-bold text-gray-900">{item.val}</span>{!item.isPre && <span className="text-sm font-semibold text-gray-500">{item.unit}</span>}</div></div>
        ))}
      </div>
    </div>
  );
};

// --- 날씨 맞춤 가이드 알약 위젯 ---
const WeatherPill = ({ onApplySettings, onStop }) => {
  const [advice, setAdvice] = useState({ msg: "날씨 정보를 불러오는 중입니다...", sub: "로딩 중", emoji: "🌡️", settings: null });

  useEffect(() => {
    const fetchWeatherAdvice = async () => {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=35.1595&longitude=126.8526&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FTokyo');
        const data = await res.json();
        const temp = data.current.temperature_2m;
        const hum = data.current.relative_humidity_2m;
        const code = data.current.weather_code;

        let msg = "", sub = "", emoji = "", settings = null;

        // 로직 우선순위 재조정 및 눈(Snow) 제거
        if (temp >= 28) {
          emoji = "🔥";
          msg = "폭염 주의! 실내를 시원한 얼음성으로 만드세요.";
          sub = "냉방 22°C / 터보 냉방 적용";
          settings = { type: 'AC', mode: 'cool', temp: 22 };
        }
        else if (temp <= 10) {
          emoji = "❄️";
          msg = "한파 주의! 따뜻한 온기가 필요한 시간입니다.";
          sub = "난방 26°C / 온기 유지 적용";
          settings = { type: 'AC', mode: 'heat', temp: 26 };
        }
        else if (code >= 51) {
          emoji = "🌧️";
          msg = "비가 내려 습도가 높아요! 눅눅함을 잡아볼까요?";
          sub = "냉방 24°C / 제습 모드 적용";
          settings = { type: 'AC', mode: 'cool', temp: 24 };
        }
        else if (hum >= 60) {
          emoji = "💧";
          msg = "조금 눅눅하네요. 쾌적함을 유지해 보세요!";
          sub = "냉방 25°C / 절전 제습 적용";
          settings = { type: 'AC', mode: 'cool', temp: 25 };
        }
        else {
          emoji = "✨";
          msg = "완벽한 날씨! 창문을 열어 환기하기 좋은 날입니다.";
          sub = "모든 기기 전원 OFF / 자연 환기";
          settings = { type: 'OFF' };
        }

        setAdvice({ msg, sub, emoji, settings });
      } catch {
        setAdvice({ msg: "날씨 연동 실패", sub: "연결 확인", emoji: "⚠️", settings: null });
      }
    };
    fetchWeatherAdvice();
    const interval = setInterval(fetchWeatherAdvice, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full mb-8 flex gap-3">
      <div 
        onClick={() => advice.settings && onApplySettings(advice.settings)}
        className="flex-1 cursor-pointer rounded-full apple-widget px-8 py-4 flex items-center justify-between transition-all duration-500 hover:scale-[1.01] hover:bg-white/90 border-indigo-200/50 group"
      >
        <div className="flex items-center gap-4">
          <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{advice.emoji}</span>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-gray-800">{advice.msg}</span>
            <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest">{advice.sub}</span>
          </div>
        </div>
        <div className="bg-indigo-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-sm group-hover:bg-indigo-600">
          적용하기
        </div>
      </div>
      
      <button 
        onClick={onStop}
        className="aspect-square h-[68px] rounded-full apple-widget flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-all border-red-100/50 shadow-sm"
        title="가이드 중단"
      >
        <X size={24} strokeWidth={3} />
      </button>
    </div>
  );
};

// --- 메인 앱 ---
export default function App() {
  const [isLocked, setIsLocked] = useState(true), [doorLogs, setDoorLogs] = useState(["09:00 - 문이 잠겼습니다."]);
  const [chartModal, setChartModal] = useState({ isOpen: false, type: 'light' });
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const [currentTrashDist, setCurrentTrashDist] = useState(30), [baseTrashDist, setBaseTrashDist] = useState(30);
  const [isLightOn, setIsLightOn] = useState(false), [lightSwitches, setLightSwitches] = useState({ s1: false, s2: false });
  const [acPower, setAcPower] = useState(false), [acMode, setAcMode] = useState('cool'), [acTemp, setAcTemp] = useState(24);
  const [aiData, setAiData] = useState(null), [aiLoading, setAiLoading] = useState(true);

  // AI 에너지 코치 데이터 가져오기
  const fetchAiCoach = async () => {
    try {
      setAiLoading(true);
      const res = await axios.get(`http://${raspberryIp}:3001/api/ai-energy-coach`);
      setAiData(res.data);
    } catch (e) { console.error("AI Coach Load Failed", e); }
    finally { setAiLoading(false); }
  };

  // 초기 상태 불러오기
  useEffect(() => {
    fetchAiCoach();
    const fetchStates = async () => {
      try {
        const res = await axios.get(`http://${raspberryIp}:3001/api/device-states`);
        const s = res.data;
        setIsLocked(s.isLocked);
        setIsLightOn(s.isLightOn);
        setLightSwitches(s.lightSwitches);
        setAcPower(s.acPower);
        setAcMode(s.acMode);
        setAcTemp(s.acTemp);
        if (s.trashBaseDistance) setBaseTrashDist(s.trashBaseDistance);
      } catch (e) { console.error("상태 로드 실패", e); }
    };
    fetchStates();

    // Socket으로도 초기 상태 수신 대기
    const handleInitialStates = (s) => {
      setIsLocked(s.isLocked);
      setIsLightOn(s.isLightOn);
      setLightSwitches(s.lightSwitches);
      setAcPower(s.acPower);
      setAcMode(s.acMode);
      setAcTemp(s.acTemp);
      if (s.trashBaseDistance) setBaseTrashDist(s.trashBaseDistance);
    };

    const handleSensorData = (d) => { 
      if (d.type === 'ultrasonic') setCurrentTrashDist(d.distance); 
    };

    socket.on('initialStates', handleInitialStates);
    socket.on('sensorData', handleSensorData);
    
    return () => {
      socket.off('initialStates', handleInitialStates);
      socket.off('sensorData', handleSensorData);
    };
  }, []);

  const handleDoorToggle = () => {
    const next = !isLocked; setIsLocked(next); socket.emit('toggleDoor');
    const time = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    setDoorLogs(p => [`${time} - ${next ? '문이 잠겼습니다.' : '사용자가 문을 열었습니다.'}`, ...p]);
  };

  const handleTrashReset = () => {
    setBaseTrashDist(currentTrashDist);
    socket.emit('updateTrashBase', currentTrashDist);
  };

  const handleTogglePower = () => {
    const next = !isLightOn; setIsLightOn(next);
    if (!next) { socket.emit('setLight', { id: 1, status: 'OFF' }); socket.emit('setLight', { id: 2, status: 'OFF' }); }
    else { socket.emit('setLight', { id: 1, status: lightSwitches.s1 ? 'ON' : 'OFF' }); socket.emit('setLight', { id: 2, status: lightSwitches.s2 ? 'ON' : 'OFF' }); if (!lightSwitches.s1 && !lightSwitches.s2) { setLightSwitches({ s1: true, s2: true }); socket.emit('setLight', { id: 1, status: 'ON' }); socket.emit('setLight', { id: 2, status: 'ON' }); } }
  };
  const handleToggleSwitch = (id) => { setLightSwitches(p => { const n = { ...p, [id]: !p[id] }; if (isLightOn) socket.emit('setLight', { id: id === 's1' ? 1 : 2, status: n[id] ? 'ON' : 'OFF' }); return n; }); };
  const handleAcPower = () => { const n = !acPower; setAcPower(n); socket.emit('setAC', { command: n ? `AC_POWER_ON_${acMode.toUpperCase()}_${acTemp}` : 'AC_POWER_OFF', rawStatus: n ? 'ON' : 'OFF' }); };
  const handleAcMode = (m) => {
    setAcMode(m);
    
    // Clamp temperature for the new mode
    const min = m === 'cool' ? 18 : 23, max = m === 'cool' ? 27 : 30;
    const clampedTemp = Math.min(Math.max(acTemp, min), max);
    if (clampedTemp !== acTemp) {
      setAcTemp(clampedTemp);
    }

    if (acPower) {
      socket.emit('setAC', { command: `AC_${m.toUpperCase()}_${clampedTemp}`, rawStatus: 'ON' });
    }
  };
  const handleAcTemp = (t) => { setAcTemp(t); if (acPower) socket.emit('setAC', { command: `AC_${acMode.toUpperCase()}_${t}`, rawStatus: 'ON' }); };

  return (
    <>
      <GlobalStyles />
      <UsageChartModal isOpen={chartModal.isOpen} onClose={() => setChartModal(p => ({ ...p, isOpen: false }))} deviceType={chartModal.type} />
      <EnergyAdvisorModal isOpen={isAdvisorOpen} onClose={() => setIsAdvisorOpen(false)} />
      <WeatherModal isOpen={isWeatherOpen} onClose={() => setIsWeatherOpen(false)} />
      
      <div className="min-h-screen py-16 px-6 flex flex-col items-center select-none bg-[#F5F7FA]">
        <div className="w-full max-w-3xl z-10">
          <header className="mb-10 flex justify-between items-end px-2">
          <div><h1 className="text-[40px] font-bold text-gray-900 leading-none mb-2">My Home</h1><p className="text-gray-500 font-semibold text-sm">스마트 홈 제어 패널</p></div>
          <div className="flex items-center gap-4">
            <ReconnectWidget />
            <SmartAutomationWidget />
            <TrashResetWidget onReset={handleTrashReset} />
            <WeatherWidget onClick={() => setIsWeatherOpen(true)} />
          </div>
          </header>

          {/* 날씨 맞춤 가이드 알약 위젯 */}
          <WeatherPill 
            onApplySettings={(s) => {
              if (s.type === 'AC') {
                setAcPower(true);
                setAcMode(s.mode);
                setAcTemp(s.temp);
                socket.emit('setAC', { command: `AC_POWER_ON_${s.mode.toUpperCase()}_${s.temp}`, rawStatus: 'ON' });
              } else if (s.type === 'OFF') {
                setAcPower(false);
                socket.emit('setAC', { command: 'AC_POWER_OFF', rawStatus: 'OFF' });
                setIsLightOn(false);
                socket.emit('setLight', { id: 1, status: 'OFF' });
                socket.emit('setLight', { id: 2, status: 'OFF' });
              }
            }}
            onStop={() => {
              setAcPower(false);
              socket.emit('setAC', { command: 'AC_POWER_OFF', rawStatus: 'OFF' });
            }}
          />

          <div className="grid grid-cols-2 gap-5 items-start">
            {/* 왼쪽: 도어락 / 오른쪽: 전등 */}
            <DoorLockCard isLocked={isLocked} onClick={handleDoorToggle} logs={doorLogs} />
            <LightCard isOn={isLightOn} switches={lightSwitches} onTogglePower={handleTogglePower} onToggleSwitch={handleToggleSwitch} onShowChart={() => setChartModal({ isOpen: true, type: 'light' })} />

            {/* 왼쪽: 실내 온습도 / 오른쪽: 쓰레기통 포화도 */}
            <IndoorClimateCard />
            <TrashBinCard currentDistance={currentTrashDist} baseDistance={baseTrashDist} />

            {/* 냉난방기 (2칸 차지) */}
            <AcRemoteCard isOn={acPower} onTogglePower={handleAcPower} mode={acMode} onToggleMode={handleAcMode} temp={acTemp} onTempChange={handleAcTemp} onShowChart={() => setChartModal({ isOpen: true, type: 'ac' })} />
            
            {/* 전력 사용량 (2칸 차지, 에너지 어드바이저 버튼 포함) */}
            <PowerUsageCard onShowAdvisor={() => setIsAdvisorOpen(true)} />

            {/* AI Energy Coach (2칸 차지) */}
            <AIEnergyCoachCard data={aiData} loading={aiLoading} />
          </div>
        </div>
      </div>
    </>
  );
}
