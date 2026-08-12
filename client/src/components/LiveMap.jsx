import { useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet default icon paths broken by bundlers ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom SVG markers ──
const makeIcon = (color) =>
  L.divIcon({
    className: "",
    html: `
      <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 26 16 26s16-16 16-26C32 7.163 24.837 0 16 0z"
          fill="${color}" stroke="white" stroke-width="2"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });

const startIcon = makeIcon("#16a34a");   // green
const destIcon  = makeIcon("#dc2626");   // red
const userIcon  = makeIcon("#2563eb");   // blue

// ── Auto-fit map to show all route geometry ──
function FitBounds({ routes, bestRoute, startCoords, destCoords }) {
  const map = useMap();

  useEffect(() => {
    const points = [];

    // Collect coordinates from all routes
    if (routes && routes.length > 0) {
      routes.forEach((r) => {
        if (r?.geometry?.coordinates) {
          r.geometry.coordinates.forEach(([lng, lat]) => points.push([lat, lng]));
        }
      });
    }

    // Fallback: just start + dest markers
    if (points.length === 0) {
      if (startCoords) points.push(startCoords);
      if (destCoords) points.push(destCoords);
    }

    if (points.length > 1) {
      try {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
      } catch (_) {}
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [routes, bestRoute, startCoords, destCoords, map]);

  return null;
}

export default function LiveMap({
  routes = [],
  bestRoute = null,
  startCoords = null,   // [lat, lng]
  destCoords = null,    // [lat, lng]
  userLocation = null,  // [lat, lng] during active trip
}) {
  const defaultCenter = startCoords ?? [18.5204, 73.8567];

  // Colors for non-selected routes
  const altColors = ["#94a3b8", "#cbd5e1"];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: "100%", width: "100%", minHeight: 450 }}
      zoomControl={true}
    >
      {/* ── Modern CartoDB Positron tiles (no API key needed, clean look) ── */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={20}
      />

      <FitBounds
        routes={routes}
        bestRoute={bestRoute}
        startCoords={startCoords}
        destCoords={destCoords}
      />

      {/* ── All non-selected routes (grey, thinner) ── */}
      {routes.map((route, idx) => {
        if (!route?.geometry?.coordinates) return null;
        const isBest =
          bestRoute &&
          (route === bestRoute || route.id === bestRoute.id);
        if (isBest) return null; // drawn separately below

        const positions = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        return (
          <Polyline
            key={`alt-${idx}`}
            positions={positions}
            pathOptions={{
              color: altColors[idx % altColors.length],
              weight: 4,
              opacity: 0.55,
              dashArray: "8 6",
            }}
          />
        );
      })}

      {/* ── Selected / best route (bold red) ── */}
      {bestRoute?.geometry?.coordinates && (
        <Polyline
          positions={bestRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
          pathOptions={{
            color: "#dc2626",
            weight: 6,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}

      {/* ── Start marker ── */}
      {startCoords && (
        <Marker position={startCoords} icon={startIcon}>
          <Popup>
            <span className="font-semibold text-green-700">📍 Start</span>
          </Popup>
        </Marker>
      )}

      {/* ── Destination marker ── */}
      {destCoords && (
        <Marker position={destCoords} icon={destIcon}>
          <Popup>
            <span className="font-semibold text-red-700">🏁 Destination</span>
          </Popup>
        </Marker>
      )}

      {/* ── Live user location (active trip only) ── */}
      {userLocation && (
        <>
          <CircleMarker
            center={userLocation}
            radius={10}
            pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 2 }}
          />
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <span className="font-semibold text-blue-700">📡 You are here</span>
            </Popup>
          </Marker>
        </>
      )}
    </MapContainer>
  );
}