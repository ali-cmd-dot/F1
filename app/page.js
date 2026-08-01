'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { Video, AlertTriangle, Users, Calendar, Clock } from 'lucide-react';

const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = { January:'Jan',February:'Feb',March:'Mar',April:'Apr',May:'May',June:'Jun',July:'Jul',August:'Aug',September:'Sep',October:'Oct',November:'Nov',December:'Dec' };

const TICKER_HEADLINES = [
  'Driver Beaten By Locals After Accident',
  'Bus Assaulted By Local Youths Post-Collision',
  'Bus Hits Pedestrian/Animal — Injuries Reported',
  'Vehicle Front Severely Damaged, Device Missing',
  'Major Accident: Driver Using Mobile / Fatigue',
  'Suspected Drunk Driving Incident Reported',
  'Driver Assaulted By Locals After Collision',
  '14–15 Passengers Injured, Driver Dead At Scene',
  'Major Accident — Driver & Two Passengers Dead',
  'Stabbing Attack On Driver & Passengers',
  'Bus Hits Pedestrian — Victim In Critical Condition',
  'Vehicle Crashes Into Barricade & Signal Pole',
  'Unattended Bus Rolls Into Roadside Ditch',
  'Bus Overturned On Highway',
  'Bus Collides With Tree During Heavy Rain',
  "Bus Hits Bike — Biker's Leg Broken",
];

const tooltipStyle = { background: '#1E1E1E', border: '1px solid #171717', borderRadius: 8, fontSize: 12 };

function lerpColor(a, b, t) {
  const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function heatColor(value, max) {
  if (!value) return '#141414';
  const stops = ['#215B3B', '#94EC8E', '#FFC107', '#FF4D4D'];
  const ratio = Math.min(value / max, 1);
  const segments = stops.length - 1;
  const scaled = ratio * segments;
  const idx = Math.min(Math.floor(scaled), segments - 1);
  return lerpColor(stops[idx], stops[idx + 1], scaled - idx);
}

export default function Page() {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [year, setYear] = useState('All');
  const [month, setMonth] = useState('All');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    fetch('/api/sheet-data')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setRaw(d);
        setLastUpdated(new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }));
      })
      .catch((e) => setError(e.message));
  }, []);

  const rows = raw?.rows || [];
  const years = raw?.years || [];

  const filteredRows = useMemo(
    () => rows.filter((r) => (year === 'All' || r.year === year) && (month === 'All' || r.month === month)),
    [rows, year, month]
  );

  const criticalRows = useMemo(() => filteredRows.filter((r) => r.incidentType === 'Critical'), [filteredRows]);
  const totalClients = useMemo(() => new Set(filteredRows.map((r) => r.client)).size, [filteredRows]);

  const topClients = useMemo(() => {
    const map = {};
    filteredRows.forEach((r) => { map[r.client] = (map[r.client] || 0) + 1; });
    const arr = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = arr[0]?.[1] || 1;
    return arr.map(([client, count]) => ({ client, count, pctW: (count / max) * 100 }));
  }, [filteredRows]);

  // chronological month-year series — only months that actually have data
  const chronoMonthly = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const key = `${r.year}-${r.month}`;
      if (!map[key]) map[key] = { year: r.year, month: r.month, total: 0, critical: 0 };
      map[key].total += 1;
      if (r.incidentType === 'Critical') map[key].critical += 1;
    });
    return Object.values(map).sort((a, b) =>
      a.year !== b.year ? a.year.localeCompare(b.year) : MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)
    );
  }, [rows]);

  const mostCriticalMonth = useMemo(() => {
    if (chronoMonthly.length === 0) return null;
    return [...chronoMonthly].sort((a, b) => b.critical - a.critical)[0];
  }, [chronoMonthly]);

  const trendData = useMemo(() => {
    const base = year === 'All' ? chronoMonthly : chronoMonthly.filter((m) => m.year === year);
    return base.map((m) => ({
      shortLabel: `${MONTH_SHORT[m.month]}'${m.year.slice(-2)}`,
      fullLabel: `${MONTH_SHORT[m.month]} ${m.year}`,
      total: m.total,
      critical: m.critical,
    }));
  }, [chronoMonthly, year]);

  const lastPoint = trendData[trendData.length - 1];

  const heatmap = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const key = `${r.year}|${r.month}`;
      map[key] = (map[key] || 0) + 1;
    });
    const max = Math.max(...Object.values(map), 1);
    return { map, max };
  }, [rows]);

  if (error) return <div className="state-msg">Error: {error}</div>;
  if (!raw) return <div className="state-msg">Loading...</div>;

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <img src="/cautio-logo.png" alt="Cautio" />
          <div>
            <h1>Cautio Incident Intelligence</h1>
            <p>Powering <span className="tagline-highlight">Safer Roads</span> with <span className="tagline-highlight">Real-Time Video Insights</span></p>
          </div>
        </div>
        <div className="header-right">
          <select className="filter-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="All">Year: All</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className="filter-select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="All">Month: All</option>
            {MONTH_ORDER.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="last-updated">
            <div className="lu-icon"><Clock size={13} /></div>
            <div>
              <div className="lu-label">Last Updated</div>
              <div className="lu-value">{lastUpdated}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="ticker-wrap">
        <div className="ticker-label"><AlertTriangle size={13} /> MOST DANGEROUS INCIDENT</div>
        <div className="ticker-track">
          <div className="ticker-content">
            {TICKER_HEADLINES.map((h, i) => (
              <span className="ticker-item" key={i}><b>•</b>{h}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon green"><Video size={16} /></div><div className="kpi-label">Total Video Requests</div></div>
          <div className="kpi-value mint">{filteredRows.length.toLocaleString()}</div>
          <div className="kpi-subtitle">Customer request for video</div>
        </div>
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon red"><AlertTriangle size={16} /></div><div className="kpi-label">Critical Incidents</div></div>
          <div className="kpi-value critical">{criticalRows.length.toLocaleString()}</div>
          <div className="kpi-subtitle">Incident Type: Critical</div>
        </div>
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon green"><Users size={16} /></div><div className="kpi-label">Total Clients</div></div>
          <div className="kpi-value mint">{totalClients.toLocaleString()}</div>
          <div className="kpi-subtitle">Unique clients</div>
        </div>
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon amber"><Calendar size={16} /></div><div className="kpi-label">Most Critical Month</div></div>
          <div className="kpi-value">{mostCriticalMonth ? `${MONTH_SHORT[mostCriticalMonth.month]} ${mostCriticalMonth.year}` : '-'}</div>
          <div className="kpi-subtitle">Highest critical incidents</div>
          <div className="kpi-critical-line">↓ {mostCriticalMonth?.critical || 0} Critical Incidents</div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="chart-header"><span className="chart-title">Video Requests Trend</span><span className="chart-tag">Monthly</span></div>
          <div className="chart-wrap">
            {lastPoint && (
              <div className="chart-badge">
                <div className="b-label">{lastPoint.fullLabel}</div>
                <div className="b-value">{lastPoint.total.toLocaleString()}</div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94EC8E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#94EC8E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#9E9E9E" fontSize={10} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.fullLabel} />
                <Area type="monotone" dataKey="total" stroke="#94EC8E" strokeWidth={2.5} fill="url(#gradGreen)" dot={{ r: 3, fill: '#94EC8E', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#94EC8E' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="chart-header"><span className="chart-title">Critical Incidents Trend</span><span className="chart-tag">Monthly</span></div>
          <div className="chart-wrap">
            {lastPoint && (
              <div className="chart-badge critical">
                <div className="b-label">{lastPoint.fullLabel}</div>
                <div className="b-value">{lastPoint.critical.toLocaleString()}</div>
              </div>
            )}
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="gradRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4D4D" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#FF4D4D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#9E9E9E" fontSize={10} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, p) => p?.[0]?.payload?.fullLabel} />
                <Area type="monotone" dataKey="critical" stroke="#FF4D4D" strokeWidth={2.5} fill="url(#gradRed)" dot={{ r: 3, fill: '#FF4D4D', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#FF4D4D' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="chart-header"><span className="chart-title">Top 5 Clients</span></div>
          {topClients.map((c) => (
            <div className="client-row" key={c.client}>
              <div className="client-name">{c.client}</div>
              <div className="client-bar-bg"><div className="client-bar-fill" style={{ width: `${c.pctW}%` }} /></div>
              <div className="client-count">{c.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="chart-header"><span className="chart-title">Incidents by Month (Heatmap)</span></div>
        <table className="heatmap-table">
          <thead>
            <tr><th></th>{MONTH_ORDER.map((m) => <th key={m}>{MONTH_SHORT[m]}</th>)}</tr>
          </thead>
          <tbody>
            {years.map((y, i) => (
              <tr key={y}>
                <td className="heatmap-year-label">{i === years.length - 1 ? `${y} (YTD)` : y}</td>
                {MONTH_ORDER.map((m) => {
                  const v = heatmap.map[`${y}|${m}`] || 0;
                  return (
                    <td key={m}>
                      <div className="heatmap-cell" style={{ background: heatColor(v, heatmap.max) }}>{v || ''}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="heatmap-legend"><span>Low</span><div className="heatmap-gradient" /><span>High</span></div>
      </div>
    </div>
  );
}
