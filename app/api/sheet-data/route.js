import { NextResponse } from 'next/server';
import Papa from 'papaparse';

const SHEET_ID = '1DzW-6Q7hTNn2hSJbEHOkSrbalOmbDIftdjw4I_PhEdA';
const GID = '0';
const TARGET_SUB_REQUEST = 'Customer request for video';

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

    const filtered = rows
      .filter((r) => (r[colSubRequest] || '').trim() === TARGET_SUB_REQUEST)
      .map((r) => ({
        year: (r[colYear] || 'Unknown').trim(),
        month: (r[colMonth] || 'Unknown').trim(),
        client: (r[colClient] || 'Unknown').trim() || 'Unknown',
        incidentType: (r[colIncidentType] || '').trim(),
        description: colDesc ? (r[colDesc] || '').trim() : '',
      }));

    const years = [...new Set(filtered.map((r) => r.year))].sort();

    return NextResponse.json({ rows: filtered, years });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
