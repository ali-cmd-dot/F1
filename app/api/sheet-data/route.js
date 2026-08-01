import { NextResponse } from 'next/server';
import Papa from 'papaparse';

const SHEET_ID = '1DzW-6Q7hTNn2hSJbEHOkSrbalOmbDIftdjw4I_PhEdA';
const GID = '0';
const TARGET_SUB_REQUEST = 'Customer request for video';

function findCol(headers, keywords) {
  return headers.find((h) => keywords.some((k) => h.toLowerCase().includes(k)));
}

function extractYear(raw) {
  if (!raw) return null;
  const match = String(raw).match(/\b(20\d{2})\b/);
  return match ? match[1] : null;
}

export async function GET() {
  try {
    // cache-bust so Google's CDN never serves a stale CSV
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}&t=${Date.now()}`;
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

    const filtered = rows
      .filter((r) => (r[colSubRequest] || '').trim() === TARGET_SUB_REQUEST)
      .map((r) => {
        const rawYear = (r[colYear] || '').trim();
        return {
          year: extractYear(rawYear) || rawYear || 'Unknown',
          month: (r[colMonth] || '').trim() || 'Unknown',
          client: (r[colClient] || '').trim() || 'Unknown',
          incidentType: (r[colIncidentType] || '').trim(),
          description: colDesc ? (r[colDesc] || '').trim() : '',
        };
      });

    const years = [...new Set(filtered.map((r) => r.year))]
      .filter((y) => y && y !== 'Unknown')
      .sort();

    return NextResponse.json({ rows: filtered, years, totalRowsInSheet: rows.length, matchedRows: filtered.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
