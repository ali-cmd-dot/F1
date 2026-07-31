'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, LabelList,
} from 'recharts';
import { Video, AlertTriangle, Users, Calendar, Pause, Play, Clock } from 'lucide-react';

const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = { January:'Jan',February:'Feb',March:'Mar',April:'Apr',May:'May',June:'Jun',July:'Jul',August:'Aug',September:'Sep',October:'Oct',November:'Nov',December:'Dec' };

function pct(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function heatColor(value, max) {
  if (max === 0 || value === 0) return '#171717';
  const ratio = value / max;
  if (ratio < 0.33) return '#215B3B';
  if (ratio < 0.55) return '#4C8A55';
  if (ratio < 0.75) return '#FFC107';
  return '#FF4D4D';
}

const tooltipStyle = { background: '#1E1E1E', border: '1px solid #171717', borderRadius: 8, fontSize: 12 };

export default function Page() {
  const [raw, setRaw] = useState(null);
  const [error, setError] = useState(null);
  const [year, setYear] = useState('All');
  const [month, setMonth] = useState('All');
  const [playing, setPlaying] = useState(true);
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
  const allCriticalRows = useMemo(() => rows.filter((r) => r.incidentType === 'Critical'), [rows]);
  const totalClients = useMemo(() => new Set(filteredRows.map((r) => r.client)).size, [filteredRows]);

  const topClients = useMemo(() => {
    const map = {};
    filteredRows.forEach((r) => { map[r.client] = (map[r.client] || 0) + 1; });
    const arr = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = arr[0]?.[1] || 1;
    return arr.map(([client, count]) => ({ client, count, pctW: (count / max) * 100 }));
  }, [filteredRows]);

  const chronoMonthly = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      const key = `${r.year}-${r.month}`;
      if (!map[key]) map[key] = { year: r.year, month: r.month, total: 0, critical: 0, clients: new Set() };
      map[key].total += 1;
      if (r.incidentType === 'Critical') map[key].critical += 1;
      map[key].clients.add(r.client);
    });
    return Object.values(map)
      .map((m) => ({ ...m, clientCount: m.clients.size }))
      .sort((a, b) => (a.year !== b.year ? a.year.localeCompare(b.year) : MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month)));
  }, [rows]);

  const kpiDeltas = useMemo(() => {
    const n = chronoMonthly.length;
    if (n < 2) return { total: 0, critical: 0, clients: 0 };
    const curr = chronoMonthly[n - 1];
    const prev = chronoMonthly[n - 2];
    return {
      total: pct(curr.total, prev.total),
      critical: pct(curr.critical, prev.critical),
      clients: pct(curr.clientCount, prev.clientCount),
    };
  }, [chronoMonthly]);

  const mostCriticalMonth = useMemo(() => {
    if (chronoMonthly.length === 0) return null;
    return [...chronoMonthly].sort((a, b) => b.critical - a.critical)[0];
  }, [chronoMonthly]);

  const trendData = useMemo(() => {
    const base = year === 'All' ? rows : rows.filter((r) => r.year === year);
    const map = {};
    MONTH_ORDER.forEach((m) => { map[m] = { month: m, total: 0, critical: 0 }; });
    base.forEach((r) => {
      if (!map[r.month]) return;
      map[r.month].total += 1;
      if (r.incidentType === 'Critical') map[r.month].critical += 1;
    });
    return MONTH_ORDER.map((m) => ({ label: MONTH_SHORT[m], total: map[m].total, critical: map[m].critical }));
  }, [rows, year]);

  const lastActiveTrend = useMemo(() => {
    const active = trendData.filter((d) => d.total > 0 || d.critical > 0);
    return active[active.length - 1] || trendData[trendData.length - 1];
  }, [trendData]);

  const videoByYear = useMemo(() => {
    const map = {};
    rows.forEach((r) => { map[r.year] = (map[r.year] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([y, count]) => ({ year: y, count }));
  }, [rows]);

  const criticalByYear = useMemo(() => {
    const map = {};
    allCriticalRows.forEach((r) => { map[r.year] = (map[r.year] || 0) + 1; });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([y, count]) => ({ year: y, count }));
  }, [allCriticalRows]);

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
            <h1>Incidents Analytics Dashboard</h1>
            <p>Real-time insights from customer video requests</p>
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
        <div className="ticker-label"><AlertTriangle size={13} /> BREAKING INCIDENT</div>
        <div className="ticker-track">
          <div className={`ticker-content ${playing ? '' : 'paused'}`}>
            {allCriticalRows.length === 0 ? (
              <span className="ticker-item">No critical incidents found</span>
            ) : (
              allCriticalRows.slice(0, 25).map((r, i) => (
                <span className="ticker-item" key={i}><b>•</b>{r.description || 'Critical incident reported'}</span>
              ))
            )}
          </div>
        </div>
        <button className="ticker-toggle" onClick={() => setPlaying((p) => !p)}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>

      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon green"><Video size={16} /></div><div className="kpi-label">Total Video Requests</div></div>
          <div className="kpi-value mint">{filteredRows.length.toLocaleString()}</div>
          <div className="kpi-subtitle">Customer request for video</div>
          <div className={`kpi-delta ${kpiDeltas.total >= 0 ? 'up' : 'down'}`}>{kpiDeltas.total >= 0 ? '↑' : '↓'} {Math.abs(kpiDeltas.total).toFixed(1)}% vs last month</div>
        </div>
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon red"><AlertTriangle size={16} /></div><div className="kpi-label">Critical Incidents</div></div>
          <div className="kpi-value critical">{criticalRows.length.toLocaleString()}</div>
          <div className="kpi-subtitle">Incident Type: Critical</div>
          <div className={`kpi-delta ${kpiDeltas.critical >= 0 ? 'up' : 'down'}`}>{kpiDeltas.critical >= 0 ? '↑' : '↓'} {Math.abs(kpiDeltas.critical).toFixed(1)}% vs last month</div>
        </div>
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon green"><Users size={16} /></div><div className="kpi-label">Total Clients</div></div>
          <div className="kpi-value mint">{totalClients.toLocaleString()}</div>
          <div className="kpi-subtitle">Unique clients</div>
          <div className={`kpi-delta ${kpiDeltas.clients >= 0 ? 'up' : 'down'}`}>{kpiDeltas.clients >= 0 ? '↑' : '↓'} {Math.abs(kpiDeltas.clients).toFixed(1)}% vs last month</div>
        </div>
        <div className="card">
          <div className="kpi-top"><div className="kpi-icon amber"><Calendar size={16} /></div><div className="kpi-label">Most Critical Month</div></div>
          <div className="kpi-value">{mostCriticalMonth ? `${MONTH_SHORT[mostCriticalMonth.month]} ${mostCriticalMonth.year}` : '-'}</div>
          <div className="kpi-subtitle">Highest critical incidents</div>
          <div className="kpi-delta down">↓ {mostCriticalMonth?.critical || 0} Critical Incidents</div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card">
          <div className="chart-header"><span className="chart-title">Video Requests Trend</span><span className="chart-tag">Monthly</span></div>
          <div className="chart-wrap">
            {lastActiveTrend && (
              <div className="chart-badge">
                <div className="b-label">{lastActiveTrend.label} {year !== 'All' ? year : ''}</div>
                <div className="b-value">{lastActiveTrend.total.toLocaleString()}</div>
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
                <XAxis dataKey="label" stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="total" stroke="#94EC8E" strokeWidth={2.5} fill="url(#gradGreen)" dot={false} activeDot={{ r: 5, fill: '#94EC8E' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="chart-header"><span className="chart-title">Critical Incidents Trend</span><span className="chart-tag">Monthly</span></div>
          <div className="chart-wrap">
            {lastActiveTrend && (
              <div className="chart-badge critical">
                <div className="b-label">{lastActiveTrend.label} {year !== 'All' ? year : ''}</div>
                <div className="b-value">{lastActiveTrend.critical.toLocaleString()}</div>
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
                <XAxis dataKey="label" stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
                <YAxis stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="critical" stroke="#FF4D4D" strokeWidth={2.5} fill="url(#gradRed)" dot={false} activeDot={{ r: 5, fill: '#FF4D4D' }} />
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

      <div className="grid-3b">
        <div className="card">
          <div className="chart-header"><span className="chart-title">Video Requests by Year</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={videoByYear} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#94EC8E" strokeWidth={2.5} dot={{ r: 4, fill: '#94EC8E', strokeWidth: 0 }}>
                <LabelList dataKey="count" position="top" fill="#fff" fontSize={11} formatter={(v) => v.toLocaleString()} />
              </Line>
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="chart-header"><span className="chart-title">Critical Incidents by Year</span></div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={criticalByYear} margin={{ top: 24, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#9E9E9E" fontSize={11} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#FF4D4D" radius={[4, 4, 0, 0]} maxBarSize={44}>
                <LabelList dataKey="count" position="top" fill="#fff" fontSize={11} formatter={(v) => v.toLocaleString()} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
    </div>
  );
}
