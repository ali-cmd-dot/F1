'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';

export default function Page() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/sheet-data')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="state-msg">Error: {error}</div>;
  if (!data) return <div className="state-msg">Loading...</div>;

  const maxClientCount = Math.max(...data.topClients.map((c) => c.count), 1);

  return (
    <div className="container">
      <div className="header">
        <img src="/cautio-logo.png" alt="Cautio" />
        <h1>Cautio <span>Insights</span></h1>
      </div>

      <div className="ticker-wrap">
        <div className="ticker-label">MOST DANGEROUS INCIDENTS</div>
        <div className="ticker-track">
          <div className="ticker-content">
            {data.tickerItems.length === 0 ? (
              <span className="ticker-item">No critical incidents found</span>
            ) : (
              data.tickerItems.map((item, i) => (
                <span className="ticker-item" key={i}>⚠ {item}</span>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="card">
          <div className="kpi-label">Total Video Requests</div>
          <div className="kpi-value">{data.totalVideoRequests}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Critical Incidents</div>
          <div className="kpi-value critical">{data.criticalCount}</div>
        </div>
        <div className="card">
          <div className="kpi-label">Top Client</div>
          <div className="kpi-value">{data.topClients[0]?.client || '-'}</div>
        </div>
      </div>

      <div className="main-grid">
        <div className="card">
          <div className="section-title">Requests Trend (Month-wise)</div>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data.byMonth}>
              <CartesianGrid stroke="#171717" />
              <XAxis dataKey="label" stroke="#9E9E9E" fontSize={11} />
              <YAxis stroke="#9E9E9E" fontSize={11} />
              <Tooltip contentStyle={{ background: '#1E1E1E', border: '1px solid #171717' }} />
              <Legend />
              <Line type="monotone" dataKey="count" name="Video Requests" stroke="#94EC8E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="section-title">Top 5 Clients</div>
          {data.topClients.map((c) => (
            <div className="client-row" key={c.client}>
              <div className="client-name">{c.client}</div>
              <div className="client-bar-bg">
                <div
                  className="client-bar-fill"
                  style={{ width: `${(c.count / maxClientCount) * 100}%` }}
                />
              </div>
              <div className="client-count">{c.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
