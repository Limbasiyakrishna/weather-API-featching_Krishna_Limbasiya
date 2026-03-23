import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── CONFIGURATION (Proprietary Setup) ──────────────────────────────────────
const CORE_KEY    = '4d96b454e7ea4475ab065320262303';
const API_ROOT    = 'https://api.weatherapi.com/v1/forecast.json';
const API_SEARCH  = 'https://api.weatherapi.com/v1/search.json';

// ─── DESIGN TOKENS ─────────────────────────────────────────────────────────
const DATA_FORMATTERS = {
  day: dateStr => new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short' }),
  hour: timeStr => {
    const d = new Date(timeStr);
    const now = new Date();
    if (Math.abs(d - now) < 1800000) return 'NOW';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(' ', '');
  },
  uv: level => {
    if (level <= 2) return { label: 'LOW', color: '#10b981' };
    if (level <= 5) return { label: 'MODERATE', color: '#f59e0b' };
    if (level <= 7) return { label: 'HIGH', color: '#f97316' };
    return { label: 'EXTREME', color: '#ef4444' };
  },
  aqi: val => {
    const labels = { 1: 'GOOD', 2: 'MODERATE', 3: 'UNHEALTHY', 4: 'POOR', 5: 'DANGER', 6: 'HAZARDOUS' };
    const colors = { 1: '#10b981', 2: '#f59e0b', 3: '#f97316', 4: '#ef4444', 5: '#991b1b', 6: '#000' };
    return { label: labels[val] || '—', color: colors[val] || '#fff' };
  }
};

const FUN_FACTS = [
  "Lightning strikes Earth about 100 times per second – that's 8.6 million times a day!",
  "A typical cumulus cloud weighs about 500,000 kg – equivalent to 80 African elephants!",
  "Lightning is hotter than the surface of the sun – reaching 30,000 K (5x hotter).",
  "The highest recorded temperature was 56.7°C in Death Valley, California (1913).",
  "No two snowflakes are exactly alike due to the unique path each takes through the atmosphere."
];

// ─── SEARCH & HISTORY (Sleek UI) ───────────────────────────────────────────
function Search({ onQuery, active }) {
  const [val, setVal]   = useState('');
  const [sugg, setSugg] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceTimer   = useRef(null);

  const fetchSugg = useCallback(async q => {
    if (q.trim().length < 2) { setSugg([]); return; }
    try {
      const res = await fetch(`${API_SEARCH}?key=${CORE_KEY}&q=${encodeURIComponent(q)}`);
      const body = await res.json();
      setSugg(Array.isArray(body) ? body : []);
    } catch { setSugg([]); }
  }, []);

  const handleInput = e => {
    const q = e.target.value;
    setVal(q);
    setOpen(true);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSugg(q), 300);
  };

  return (
    <div className="search-section">
      <div className="search-wrapper">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input className="search-input" placeholder="Pulse-search any location…" value={val} onChange={handleInput} />
          {val && <button className="clear-btn" onClick={() => { setVal(''); setSugg([]); setOpen(false); }}>✕</button>}
        </div>
        <button className="search-btn" onClick={() => { onQuery(val); setOpen(false); }}>Pulse</button>
      </div>

      {open && sugg.length > 0 && (
        <div className="suggestions-dropdown">
          {sugg.map((s, i) => (
            <div key={i} className="suggestion-item" onClick={() => { setVal(s.name); setOpen(false); onQuery(s.name); }}>
              <span className="suggestion-flag">📍</span>
              <div className="suggestion-info">
                <div className="suggestion-city">{s.name}</div>
                <div className="suggestion-country">{s.region}, {s.country}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CORE DASHBOARD COMPONENTS ─────────────────────────────────────────────
const BentoCard = ({ title, children, className="" }) => (
  <div className={`section-card ${className}`}>
    {title && <div className="section-title">{title}</div>}
    {children}
  </div>
);

// ─── MAIN APPLICATION ──────────────────────────────────────────────────────
export default function App() {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [unit,     setUnit]     = useState('C');
  const [history,  setHistory]  = useState(() => JSON.parse(localStorage.getItem('hz_history')) || []);

  const addHistory = name => {
    setHistory(prev => {
      const next = [name, ...prev.filter(n => n !== name)].slice(0, 5);
      localStorage.setItem('hz_history', JSON.stringify(next));
      return next;
    });
  };

  const syncAtmosphere = useCallback(async (location) => {
    if (!location.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_ROOT}?key=${CORE_KEY}&q=${encodeURIComponent(location)}&days=7&aqi=yes`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || "Atmosphere sync failed.");
      setData(body);
      addHistory(body.location.name);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <div className="app-bg" />
      <div className="app-wrapper">
        <header className="header">
          <div className="header-logo">
            <span className="logo-icon">🌤️</span>
            <span className="logo-text">Horizon</span>
          </div>
          <div className="unit-toggle">
            <button className={`unit-btn ${unit === 'C' ? 'active' : ''}`} onClick={() => setUnit('C')}>°C</button>
            <button className={`unit-btn ${unit === 'F' ? 'active' : ''}`} onClick={() => setUnit('F')}>°F</button>
          </div>
        </header>

        <Search onQuery={syncAtmosphere} active={loading} />

        {loading && <div className="loading-container"><div className="spinner"/><p>Synchronizing with Atmosphere…</p></div>}
        {error && <div className="error-card">⚠️ {error}</div>}

        {!loading && !data && (
          <div className="welcome-state">
            <div className="welcome-icon">🪐</div>
            <div className="welcome-title">Beyond Atmosphere</div>
            <div className="welcome-sub">Enter a city to visualize the weather paradigm</div>
            {history.length > 0 && (
              <div className="recent-chips">
                {history.map((h, i) => <button key={i} className="chip" onClick={() => syncAtmosphere(h)}>📍 {h}</button>)}
              </div>
            )}
          </div>
        )}

        {!loading && data && (
          <div className="weather-content">
            {/* HERO BLOCK */}
            <div className="hero-card">
              <div className="hero-details">
                <div className="city-name">{data.location.name}</div>
                <div className="city-meta">
                  <span>{data.location.country}</span>
                  <span>|</span>
                  <span>{data.location.localtime.split(' ')[1]}</span>
                </div>
                <div className="temp-display">
                  <span className="temp-value">{unit === 'C' ? Math.round(data.current.temp_c) : Math.round(data.current.temp_f)}</span>
                  <span className="temp-unit">°</span>
                </div>
                <div className="feels-like">FEELS LIKE {unit === 'C' ? Math.round(data.current.feelslike_c) : Math.round(data.current.feelslike_f)}°</div>
              </div>
              <div className="weather-info">
                <img src={data.current.condition.icon.replace('64x64', '128x128')} className="weather-icon-large" alt="icon" />
                <div className="weather-status-badge">{data.current.condition.text}</div>
                <div style={{fontWeight: 800, color: 'var(--text-sub)'}}>
                  ↑ {unit === 'C' ? Math.round(data.forecast.forecastday[0].day.maxtemp_c) : Math.round(data.forecast.forecastday[0].day.maxtemp_f)}°
                  <span style={{opacity: 0.3, margin: '0 8px'}}>|</span>
                  ↓ {unit === 'C' ? Math.round(data.forecast.forecastday[0].day.mintemp_c) : Math.round(data.forecast.forecastday[0].day.mintemp_f)}°
                </div>
              </div>
            </div>

            {/* STATS AREA */}
            <div className="stats-grid">
              {[
                { label: 'Humidity', val: `${data.current.humidity}%`, icon: '💧' },
                { label: 'Wind Speed', val: `${data.current.wind_kph} km/h`, icon: '🌬️' },
                { label: 'Visibility', val: `${data.current.vis_km} km`, icon: '👁️' },
                { label: 'Pressure', val: `${data.current.pressure_mb} hPa`, icon: '🔽' },
                { label: 'Precipitation', val: `${data.current.precip_mm} mm`, icon: '🌧️' },
                { label: 'Sunrise', val: data.forecast.forecastday[0].astro.sunrise, icon: '🌅' },
                { label: 'Sunset', val: data.forecast.forecastday[0].astro.sunset, icon: '🌇' },
              ].map((s, i) => (
                <div className="stat-card" key={i}>
                  <div className="stat-icon-wrap">{s.icon}</div>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.val}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* HOURLY BENTO */}
            <BentoCard title="24-Hour Forecast" className="hourly-card">
              <div className="hourly-scroll">
                {data.forecast.forecastday[0].hour.filter((_, i) => i % 2 === 0).map((h, i) => (
                  <div className="hourly-item" key={i}>
                    <div className="hourly-time">{DATA_FORMATTERS.hour(h.time)}</div>
                    <img src={h.condition.icon} style={{width: 40}} alt="icon" />
                    <div className="hourly-temp">{unit === 'C' ? Math.round(h.temp_c) : Math.round(h.temp_f)}°</div>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* DAILY BENTO */}
            <BentoCard title="7-Day Paradigm" className="forecast-card">
              <div className="forecast-list">
                {data.forecast.forecastday.map((d, i) => (
                  <div className="forecast-item" key={i}>
                    <div className="forecast-day">{i === 0 ? 'TODAY' : DATA_FORMATTERS.day(d.date).toUpperCase()}</div>
                    <img src={d.day.condition.icon} style={{width: 32}} alt="icon" />
                    <div className="forecast-temps">
                      <span className="forecast-high">{unit === 'C' ? Math.round(d.day.maxtemp_c) : Math.round(d.day.maxtemp_f)}°</span>
                      <span className="forecast-low">{unit === 'C' ? Math.round(d.day.mintemp_c) : Math.round(d.day.mintemp_f)}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* AQI BENTO */}
            <BentoCard title="Atmosphere (AQI)" className="aqi-card">
               <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ 
                    width: 70, height: 70, borderRadius: '50%', 
                    border: `6px solid ${DATA_FORMATTERS.aqi(data.current.air_quality['us-epa-index']).color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.4rem'
                  }}>
                    {data.current.air_quality['us-epa-index']}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, color: DATA_FORMATTERS.aqi(data.current.air_quality['us-epa-index']).color }}>
                      {DATA_FORMATTERS.aqi(data.current.air_quality['us-epa-index']).label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>US EPA Standard</div>
                  </div>
               </div>
            </BentoCard>

            {/* UV BENTO */}
            <BentoCard title="Ultra Violet" className="uv-card">
               <div style={{ fontSize: '3rem', fontWeight: 950, color: DATA_FORMATTERS.uv(data.current.uv).color }}>{data.current.uv}</div>
               <div style={{ fontWeight: 800 }}>{DATA_FORMATTERS.uv(data.current.uv).label} INDEX</div>
            </BentoCard>

            {/* FACT BENTO */}
            <BentoCard title="Atmospheric Pulse" className="fun-card">
               <div className="fun-fact-text">"{FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]}"</div>
            </BentoCard>

          </div>
        )}
      </div>
    </>
  );
}
