import { NextResponse } from 'next/server';
import Papa from 'papaparse';

const SHEET_ID = '1DzW-6Q7hTNn2hSJbEHOkSrbalOmbDIftdjw4I_PhEdA';
const GID = '0';

const TARGET_SUB_REQUEST = 'Customer request for video';
const CRITICAL_VALUE = 'Critical';

const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function findCol(headers, keywords) {
  return headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k)));
}

export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
    const res = await fetch(csvUrl, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Sheet fetch failed. Check ki sheet "Anyone with link - Viewer" pe share ho.' },
        { status: 500 }
      );
    }

    const csvText = await res.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data;
    const headers = parsed.meta.fields || [];

    const colSubRequest = findCol(headers, ['sub-request', 'sub request', 'subrequest']) || 'Sub-request';
    const colIncidentType = findCol(headers, ['incident type']) || 'Incident Type';
    const colYear = findCol(headers, ['year']) || 'Year';
    const colMonth = findCol(headers, ['month']) || 'Month';
    const colClient = findCol(headers, ['client']) || 'Clients';
    const colDesc = findCol(headers, ['description', 'remark', 'detail', 'summary']);

    const filtered = rows.filter((r) => (r[colSubRequest] || '').trim() === TARGET_SUB_REQUEST);
    const totalVideoRequests = filtered.length;

    const criticalRows = filtered.filter((r) => (r[colIncidentType] || '').trim() === CRITICAL_VALUE);
    const criticalCount = criticalRows.length;

    const yearMap = {};
    filtered.forEach((r) => {
      const y = (r[colYear] || 'Unknown').trim();
      yearMap[y] = (yearMap[y] || 0) + 1;
    });
    const byYear = Object.entries(yearMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, count]) => ({ year, count }));

    const ymMap = {};
    filtered.forEach((r) => {
      const y = (r[colYear] || 'Unknown').trim();
      const m = (r[colMonth] || 'Unknown').trim();
      const key = `${y}-${m}`;
      ymMap[key] = (ymMap[key] || 0) + 1;
    });
    const byMonth = Object.entries(ymMap)
      .map(([key, count]) => {
        const [year, month] = key.split('-');
        return { label: `${month.slice(0, 3)} ${year}`, year, month, count };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return a.year.localeCompare(b.year);
        return MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month);
      });

    const clientMap = {};
    filtered.forEach((r) => {
      const c = (r[colClient] || '').trim();
      if (!c) return;
      clientMap[c] = (clientMap[c] || 0) + 1;
    });
    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([client, count]) => ({ client, count }));

    const tickerItems = colDesc
      ? criticalRows
          .map((r) => (r[colDesc] || '').trim())
          .filter(Boolean)
          .slice(0, 25)
      : [];

    return NextResponse.json({
      totalVideoRequests,
      criticalCount,
      byYear,
      byMonth,
      topClients,
      tickerItems,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
