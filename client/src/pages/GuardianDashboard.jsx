import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import socket from "../socket/socket";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default Leaflet marker icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const SOSIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function RecenterMap({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { animate: true, duration: 1.5 });
  }, [center, zoom, map]);
  return null;
}

export default function GuardianDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTrips, setActiveTrips] = useState({});
  const [selectedUserCoords, setSelectedUserCoords] = useState([18.5204, 73.8567]);
  const [mapZoom, setMapZoom] = useState(13);
  const [safeZones, setSafeZones] = useState([]);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneCoords, setNewZoneCoords] = useState("18.5204, 73.8567");
  const [selectedTripId, setSelectedTripId] = useState(null);

  // ─── Fetch alerts with auth token ───────────────────────────────
  const fetchAlerts = async (wardId = null) => {
    try {
      const token = localStorage.getItem("token");
      const url = wardId
        ? `http://localhost:5000/api/alerts?userId=${wardId}`
        : "http://localhost:5000/api/alerts";

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    }
  };

  // ─── Acknowledge alert ───────────────────────────────────────────
  const acknowledgeAlert = async (alertId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `http://localhost:5000/api/alerts/${alertId}/acknowledge`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Update UI immediately
      setAlerts((prev) =>
        prev.map((a) =>
          a._id === alertId ? { ...a, acknowledged: true } : a
        )
      );
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  // ─── Socket.IO setup ────────────────────────────────────────────
  useEffect(() => {
    fetchAlerts();

    // ✅ FIXED: matches what your alertController.js actually emits
    socket.on("emergency-triggered", (data) => {
      // Only handle SOS alerts (ignore AUDIO_UPDATED etc.)
      if (data.type === "SOS_ALERT") {
        // 1. Show live notification
        setNotifications((prev) => [
          {
            id: Date.now(),
            type: "danger",
            message: `🚨 SOS from ${data.alert.name || data.userName}! Tap View Map.`,
            time: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);

        // 2. Add alert to list immediately
        setAlerts((prev) => [data.alert, ...prev]);

        // 3. Jump map to SOS location
        if (data.alert?.location?.lat && data.alert?.location?.lng) {
          setSelectedUserCoords([
            data.alert.location.lat,
            data.alert.location.lng,
          ]);
          setMapZoom(16);
        }
      }

      // Handle audio update
      if (data.type === "AUDIO_UPDATED") {
        setAlerts((prev) =>
          prev.map((a) =>
            a._id === data.alert._id ? { ...a, audioUrl: data.alert.audioUrl } : a
          )
        );
      }
    });

    // ✅ Real-time location updates from user
    socket.on("location-update", (data) => {
      const loc = [data.location.lat, data.location.lng];
      setActiveTrips((prev) => {
        const userTrip = prev[data.userId];
        if (!userTrip) return prev;
        return {
          ...prev,
          [data.userId]: {
            ...userTrip,
            coords: loc,
            path: [...userTrip.path, loc],
          },
        };
      });
      setSelectedUserCoords(loc);
    });

    // ✅ Trip started
    socket.on("trip-started", (data) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "info",
          message: `${data.userName} started a trip to ${data.destination}.`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      setActiveTrips((prev) => ({
        ...prev,
        [data.userId]: {
          userName: data.userName,
          destination: data.destination,
          safetyScore: data.safetyScore || 100,
          coords: [data.start.lat, data.start.lng],
          path: [[data.start.lat, data.start.lng]],
        },
      }));
      setSelectedUserCoords([data.start.lat, data.start.lng]);
    });

    // ✅ User confirmed safe
    socket.on("safety-status-update", (data) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "success",
          message: `✅ ${data.userName} confirmed safe.`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    });

    // ✅ Trip ended
    socket.on("trip-ended", (data) => {
      setNotifications((prev) => [
        {
          id: Date.now(),
          type: "info",
          message: `${data.userName} ended trip safely.`,
          time: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
      setActiveTrips((prev) => {
        const copy = { ...prev };
        delete copy[data.userId];
        return copy;
      });
    });

    return () => {
      socket.off("emergency-triggered");
      socket.off("location-update");
      socket.off("trip-started");
      socket.off("safety-status-update");
      socket.off("trip-ended");
    };
  }, []);

  // ─── Add safe zone ───────────────────────────────────────────────
  const handleAddSafeZone = (e) => {
    e.preventDefault();
    if (!newZoneName.trim() || !newZoneCoords.trim()) return;
    try {
      const [lat, lng] = newZoneCoords.split(",").map(Number);
      if (isNaN(lat) || isNaN(lng)) return;
      setSafeZones((prev) => [
        ...prev,
        { id: Date.now(), name: newZoneName, coords: [lat, lng] },
      ]);
      setNewZoneName("");
    } catch {}
  };

  // ─── Remote safety check ─────────────────────────────────────────
  const handleRemoteSafetyCheck = (userId) => {
    if (!userId) return;
    socket.emit("trigger-safety-check", { userId });
    alert("Safety check-in sent.");
  };

  const recentAlerts = alerts.filter(
    (a) => Date.now() - new Date(a.createdAt).getTime() < 900000
  ).length;

  const stats = [
    { label: "Active Trips",    value: Object.keys(activeTrips).length, icon: "🛣️" },
    { label: "Safe Zones",      value: safeZones.length,                icon: "🛡️" },
    { label: "Recent Alerts",   value: recentAlerts,                    icon: "🚨" },
    { label: "Total Incidents", value: alerts.length,                   icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-red-600 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">

        {/* ── HERO BANNER ── */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-gradient-to-br from-[#FFF5F5] via-[#FFF8F8] to-[#FFFFFF] p-10 shadow-[0_20px_50px_rgba(220,38,38,0.05)] relative overflow-hidden border border-red-100"
        >
          <div className="absolute -top-40 right-0 w-[35rem] h-[35rem] bg-red-200/20 rounded-full blur-[140px] pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="space-y-3 max-w-xl">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/60 text-[11px] font-bold uppercase tracking-wider text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Guardian Dashboard — Live
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">
                Monitor &{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-slate-900">
                  Protect
                </span>
              </h1>
              <p className="text-slate-500 text-base leading-relaxed">
                Track real-time location feeds, respond to SOS alerts, and
                manage safe zones for the people you protect.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/trip"
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-red-500 transition shadow-[0_4px_20px_rgba(220,38,38,0.25)]"
                >
                  Plan Safe Route
                </Link>
                <button
                  onClick={() =>
                    handleRemoteSafetyCheck(
                      selectedTripId || Object.keys(activeTrips)[0]
                    )
                  }
                  className="border border-slate-200 bg-white text-slate-700 px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-50 transition shadow-xs"
                >
                  📡 Send Safety Check
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-red-100 shadow-xl min-w-[220px] text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Currently Monitoring
              </p>
              <p className="text-5xl font-extrabold text-red-600">
                {Object.keys(activeTrips).length}
              </p>
              <p className="text-slate-400 text-sm mt-1">active trips</p>
            </div>
          </div>
        </motion.section>

        {/* ── STATS ROW ── */}
        <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)] hover:border-red-200 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-xl">
                {s.icon}
              </div>
              <p className="text-3xl font-bold mt-4 tracking-tight text-red-600">
                {s.value}
              </p>
              <p className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </section>

        {/* ── MAIN GRID ── */}
        <section className="grid lg:grid-cols-12 gap-6">

          {/* LEFT — Map + Alerts */}
          <div className="lg:col-span-8 space-y-6">

            {/* Map card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    Live Location Tracking
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time GPS feeds over active trips
                  </p>
                </div>
                <span className="px-3 py-1 bg-red-50 border border-red-100 rounded-full text-[11px] font-semibold text-red-600">
                  {safeZones.length === 0
                    ? "No Safe Zones Set"
                    : `${safeZones.length} Safe Zone${safeZones.length > 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="h-[400px] w-full rounded-xl overflow-hidden border border-slate-100">
                <MapContainer
                  center={selectedUserCoords}
                  zoom={mapZoom}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="© OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <RecenterMap center={selectedUserCoords} zoom={mapZoom} />

                  {Object.entries(activeTrips).map(([id, trip]) => (
                    <div key={id}>
                      <Marker
                        position={trip.coords}
                        eventHandlers={{ click: () => setSelectedTripId(id) }}
                      >
                        <Popup>
                          <div className="text-xs p-1">
                            <p className="font-bold border-b border-slate-200 pb-1 mb-1">
                              👤 {trip.userName}
                            </p>
                            <p>
                              <strong>To:</strong> {trip.destination}
                            </p>
                            <p>
                              <strong>Safety:</strong>{" "}
                              <span className="text-green-600 font-bold">
                                {trip.safetyScore}%
                              </span>
                            </p>
                          </div>
                        </Popup>
                      </Marker>
                      <Polyline
                        positions={trip.path}
                        pathOptions={{
                          color: "#dc2626",
                          weight: 3,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  ))}

                  {safeZones.map((zone) => (
                    <Marker key={zone.id} position={zone.coords}>
                      <Popup>
                        <span className="text-xs font-medium">
                          🛡️ Safe Zone: {zone.name}
                        </span>
                      </Popup>
                    </Marker>
                  ))}

                  {alerts.slice(0, 4).map(
                    (a) =>
                      a.location?.lat && (
                        <Marker
                          key={a._id || a.id}
                          position={[a.location.lat, a.location.lng]}
                          icon={SOSIcon}
                        >
                          <Popup>
                            <div className="text-xs font-bold text-red-600">
                              🚨 SOS: {a.name}
                            </div>
                          </Popup>
                        </Marker>
                      )
                  )}
                </MapContainer>
              </div>

              {/* Map footer stats */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  ["Monitored Trips", Object.keys(activeTrips).length],
                  ["Safe Zones", safeZones.length],
                  ["Active Alerts", recentAlerts],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center"
                  >
                    <p className="text-xl font-bold text-red-600">{val}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Emergency Alerts card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                    Emergency Alerts
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live SOS and incident broadcasts
                  </p>
                </div>
                <button
                  onClick={() => fetchAlerts()}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50/40 border border-slate-200 hover:border-red-200 px-4 py-2 rounded-xl transition-all group"
                >
                  <svg
                    className="w-3.5 h-3.5 transition-transform duration-500 group-hover:rotate-180 text-slate-400 group-hover:text-red-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                  Refresh
                </button>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-2xl mb-2">🛡️</p>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    No active alerts. All clear.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {alerts.map((alert) => (
                    <div
                      key={alert._id || alert.id}
                      className={`border rounded-xl p-4 transition ${
                        alert.acknowledged
                          ? "border-slate-100 bg-slate-50 opacity-60"
                          : "border-red-100 bg-[#FFF5F5] hover:border-red-200"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800 text-sm tracking-tight">
                              {alert.name}
                            </p>
                            {!alert.acknowledged && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 animate-pulse">
                                SOS
                              </span>
                            )}
                            {alert.acknowledged && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-600 border border-green-100">
                                Acknowledged
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                          {alert.audioUrl && (
                            <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2">
                              <p className="text-[10px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                                🎙️ Audio Recording
                              </p>
                              <audio controls className="w-full h-8">
                                <source
                                  src={alert.audioUrl}
                                  type="audio/mp3"
                                />
                              </audio>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <a
                            href={
                              alert.location?.lat
                                ? `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`
                                : "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-600 hover:text-red-600 font-semibold text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition active:scale-95 text-center"
                          >
                            View Map 📍
                          </a>
                          {!alert.acknowledged && (
                            <button
                              onClick={() => acknowledgeAlert(alert._id)}
                              className="text-green-600 font-semibold text-xs px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition"
                            >
                              ✓ Mark Seen
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Notifications + Controls + Safe Zones */}
          <div className="lg:col-span-4 space-y-6">

            {/* Live notifications feed */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">
                  Live Notifications
                </h3>
                {notifications.length > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <p className="text-xs text-slate-400 italic">
                      Listening for activity...
                    </p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border flex justify-between gap-3 text-[11px] transition ${
                        n.type === "danger"
                          ? "bg-red-50 border-red-100 text-red-700"
                          : n.type === "success"
                          ? "bg-green-50 border-green-100 text-green-700"
                          : "bg-slate-50 border-slate-100 text-slate-600"
                      }`}
                    >
                      <span className="leading-relaxed">{n.message}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums font-mono flex-shrink-0">
                        {n.time}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)]">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-1">
                Quick Actions
              </h3>
              <p className="text-[11px] text-slate-400 mb-4">
                Execute emergency actions on monitored users
              </p>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    handleRemoteSafetyCheck(
                      selectedTripId || Object.keys(activeTrips)[0]
                    )
                  }
                  className="w-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-600 text-xs font-semibold py-3 px-4 rounded-xl transition flex justify-between items-center"
                >
                  <span>📡 Send Safety Check-In</span>
                  <span className="text-[10px] bg-white border border-slate-200 text-slate-400 px-2 py-0.5 rounded-lg">
                    PING
                  </span>
                </button>
                <button
                  onClick={() => alert("Emergency broadcast initiated.")}
                  className="w-full bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 text-red-600 text-xs font-semibold py-3 px-4 rounded-xl transition flex justify-between items-center"
                >
                  <span>🚨 Broadcast SOS Override</span>
                  <span className="text-[10px] bg-white border border-red-100 text-red-400 px-2 py-0.5 rounded-lg">
                    ALERT
                  </span>
                </button>
              </div>
            </div>

            {/* Safe zone form */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)]">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400 mb-4">
                Safe Zones
              </h3>
              <form onSubmit={handleAddSafeZone} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Zone Name
                  </label>
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="e.g. Home, School, Office"
                    className="w-full border border-slate-200 focus:border-red-400 rounded-xl px-3 py-2.5 outline-none text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                    Coordinates (Lat, Lng)
                  </label>
                  <input
                    type="text"
                    value={newZoneCoords}
                    onChange={(e) => setNewZoneCoords(e.target.value)}
                    placeholder="18.5204, 73.8567"
                    className="w-full border border-slate-200 focus:border-red-400 rounded-xl px-3 py-2.5 outline-none text-xs font-mono text-slate-800 placeholder:text-slate-400 bg-slate-50 focus:bg-white transition"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-black text-white font-semibold py-2.5 rounded-xl transition text-xs uppercase tracking-wider shadow-sm"
                >
                  + Add Safe Zone
                </button>
              </form>

              {safeZones.length > 0 && (
                <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    Active Zones
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {safeZones.map((z) => (
                      <span
                        key={z.id}
                        className="bg-red-50 border border-red-100 text-[10px] text-red-600 font-semibold px-2.5 py-1 rounded-full"
                      >
                        🛡️ {z.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Insight tip */}
            <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl shadow-xs text-slate-800 p-6 relative overflow-hidden border border-red-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl text-red-500">
                💡
              </div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-red-600 mb-2">
                Guardian Tip
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed">
                Add safe zones around home, school, and work to get instant
                alerts when your ward enters or exits these areas.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}