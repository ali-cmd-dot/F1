'use client';

import { useEffect, useRef } from 'react';

const CITY_COORDINATES = {
  bengaluru:[12.9716,77.5946], bangalore:[12.9716,77.5946], delhi:[28.6139,77.2090],
  'new delhi':[28.6139,77.2090], mumbai:[19.0760,72.8777], hyderabad:[17.3850,78.4867],
  chennai:[13.0827,80.2707], kolkata:[22.5726,88.3639], pune:[18.5204,73.8567],
  ahmedabad:[23.0225,72.5714], surat:[21.1702,72.8311], jaipur:[26.9124,75.7873],
  lucknow:[26.8467,80.9462], kanpur:[26.4499,80.3319], nagpur:[21.1458,79.0882],
  indore:[22.7196,75.8577], bhopal:[23.2599,77.4126], patna:[25.5941,85.1376],
  vadodara:[22.3072,73.1812], coimbatore:[11.0168,76.9558], kochi:[9.9312,76.2673],
  gurugram:[28.4595,77.0266], gurgaon:[28.4595,77.0266], noida:[28.5355,77.3910],
  ghaziabad:[28.6692,77.4538], faridabad:[28.4089,77.3178], chandigarh:[30.7333,76.7794],
  mysuru:[12.2958,76.6394], mysore:[12.2958,76.6394], mangaluru:[12.9141,74.8560],
  mangalore:[12.9141,74.8560], hubballi:[15.3647,75.1240], hubli:[15.3647,75.1240],
  vijayawada:[16.5062,80.6480], visakhapatnam:[17.6868,83.2185], vizag:[17.6868,83.2185],
  tirupati:[13.6288,79.4192], madurai:[9.9252,78.1198], salem:[11.6643,78.1460],
  nashik:[19.9975,73.7898], rajkot:[22.3039,70.8022], raipur:[21.2514,81.6296],
  ranchi:[23.3441,85.3096], bhubaneswar:[20.2961,85.8245], guwahati:[26.1445,91.7362],
  dehradun:[30.3165,78.0322], jammu:[32.7266,74.8570], srinagar:[34.0837,74.7973],
  agra:[27.1767,78.0081], meerut:[28.9845,77.7064], varanasi:[25.3176,82.9739],
  prayagraj:[25.4358,81.8463], allahabad:[25.4358,81.8463], jodhpur:[26.2389,73.0243],
  udaipur:[24.5854,73.7125], kota:[25.2138,75.8648], amritsar:[31.6340,74.8723],
  ludhiana:[30.9010,75.8573], jalandhar:[31.3260,75.5762], thane:[19.2183,72.9781],
};

function resolveCity(raw) {
  const value = String(raw || '').trim();
  const normalized = value.toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ');
  const key = Object.keys(CITY_COORDINATES)
    .sort((a, b) => b.length - a.length)
    .find((city) => new RegExp(`(^|[\\s,-])${city.replace(' ', '\\s+')}($|[\\s,-])`, 'i').test(normalized));
  return key ? { name: key.replace(/\b\w/g, (c) => c.toUpperCase()), coordinates: CITY_COORDINATES[key] } : null;
}

export function getCriticalCityData(rows) {
  const cities = new Map();
  let unmapped = 0;
  rows.filter((row) => String(row.incidentType).trim().toLowerCase() === 'critical').forEach((row) => {
    const city = resolveCity(row.location);
    if (!city) { unmapped += 1; return; }
    const id = city.coordinates.join(',');
    const current = cities.get(id) || { ...city, count: 0, locations: new Set() };
    current.count += 1;
    current.locations.add(row.location);
    cities.set(id, current);
  });
  return { cities: [...cities.values()].map((c) => ({ ...c, locations: [...c.locations] })), unmapped };
}

export default function IncidentMap({ rows }) {
  const elementRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let layerGroup;
    (async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.heat');
      if (cancelled || !elementRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(elementRef.current, { zoomControl: false, minZoom: 4, maxZoom: 12 }).setView([22.8, 79.2], 5);
        L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO', maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const { cities } = getCriticalCityData(rows);
      layerGroup = L.layerGroup().addTo(mapRef.current);
      const max = Math.max(...cities.map((c) => c.count), 1);
      const heat = L.heatLayer(cities.map((c) => [...c.coordinates, Math.max(.3, c.count / max)]), {
        radius: 38, blur: 28, maxZoom: 8, minOpacity: .35,
        gradient: { .2: '#215B3B', .45: '#94EC8E', .7: '#FFC107', 1: '#FF4D4D' },
      }).addTo(layerGroup);

      cities.forEach((city) => {
        const size = 30 + Math.min(city.count, 30);
        L.circleMarker(city.coordinates, {
          radius: Math.max(7, Math.min(15, 6 + city.count * .6)), color: '#ff7a7a', weight: 2,
          fillColor: '#ff4d4d', fillOpacity: .86,
        }).bindTooltip(`<div class="map-popup"><b>${city.name}</b><strong>${city.count}</strong><span>Critical incident${city.count === 1 ? '' : 's'}</span></div>`, { direction: 'top', offset: [0, -8], opacity: 1 })
          .addTo(layerGroup);
      });

      setTimeout(() => mapRef.current?.invalidateSize(), 80);
    })();

    return () => { cancelled = true; if (layerGroup && mapRef.current) layerGroup.remove(); };
  }, [rows]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);
  return <div ref={elementRef} className="incident-map" aria-label="Critical incidents city heatmap" />;
}
