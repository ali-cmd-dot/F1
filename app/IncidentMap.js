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
  krishnagiri:[12.5186,78.2137], ernakulam:[9.9816,76.2999], trichy:[10.7905,78.7047],
  tiruchirappalli:[10.7905,78.7047], kolar:[13.1362,78.1291], pondicherry:[11.9416,79.8083],
  puducherry:[11.9416,79.8083], hosur:[12.7409,77.8253], ambala:[30.3782,76.7767],
  aurangabad:[19.8762,75.3433], chhatrapati:[19.8762,75.3433], patiala:[30.3398,76.3869],
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
        mapRef.current = L.map(elementRef.current, {
          zoomControl: false, minZoom: 4, maxZoom: 12, attributionControl: true,
          maxBounds: [[5.5, 66], [37.5, 99]], maxBoundsViscosity: .8,
        }).setView([22.8, 79.2], 5);
        L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
        }).addTo(mapRef.current);
      }

      const { cities } = getCriticalCityData(rows);
      layerGroup = L.layerGroup().addTo(mapRef.current);
      const max = Math.max(...cities.map((c) => c.count), 1);
      L.heatLayer(cities.map((c) => [...c.coordinates, Math.max(.35, c.count / max)]), {
        radius: 46, blur: 32, maxZoom: 8, minOpacity: .42,
        gradient: { .15: '#55cf71', .42: '#f4e665', .68: '#ff9b45', 1: '#e72f4f' },
      }).addTo(layerGroup);

      cities.forEach((city) => {
        L.circleMarker(city.coordinates, {
          radius: Math.max(9, Math.min(22, 8 + Math.sqrt(city.count) * 1.2)), color: '#fff', weight: 2,
          fillColor: '#e73350', fillOpacity: .92,
        }).bindPopup(`<div class="map-popup"><b>${city.name}</b><strong>${city.count}</strong><span>Critical incident${city.count === 1 ? '' : 's'}</span></div>`).addTo(layerGroup);

        L.marker(city.coordinates, {
          interactive: false,
          icon: L.divIcon({ className: 'city-count-marker', html: `<span>${city.count}</span><b>${city.name}</b>`, iconSize: [96, 44], iconAnchor: [48, 22] }),
        }).addTo(layerGroup);
      });

      if (cities.length) {
        const bounds = L.latLngBounds(cities.map((c) => c.coordinates));
        mapRef.current.fitBounds(bounds.pad(.16), { animate: false, maxZoom: 6 });
      }
      setTimeout(() => mapRef.current?.invalidateSize({ pan: false }), 80);
    })();

    return () => { cancelled = true; if (layerGroup && mapRef.current) layerGroup.remove(); };
  }, [rows]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);
  return <div ref={elementRef} className="incident-map" aria-label="Critical incidents city heatmap" />;
}
