import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import LiveMap from "../components/LiveMap";
import SafetyCheckModal from "../components/SafetyCheckModal";
import socket from "../socket/socket";
import { queueOfflineAlert } from "../utils/offlineQueue";

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY;

export default function TripPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* ───────── Trip / navigation state ───────── */
  const [tripState, setTripState] = useState("planning");
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState([]);
  const [bestRoute, setBestRoute] = useState(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [activeTripId, setActiveTripId] = useState(null);

  /* ───────── Address search ───────── */
  const [startQuery, setStartQuery] = useState("");
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [startCoords, setStartCoords] = useState({ lat: 18.5204, lng: 73.8567 });

  const [destQuery, setDestQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destCoords, setDestCoords] = useState({ lat: null, lng: null });

  const [travelMode, setTravelMode] = useState("driving-car");

  /* ───────── Safety settings ───────── */
  const [shareLocation, setShareLocation] = useState(true);
  const [routeDeviation, setRouteDeviation] = useState(true);
  const [deviationThreshold, setDeviationThreshold] = useState(200);
  const [periodicCheck, setPeriodicCheck] = useState(true);
  const [checkInterval, setCheckInterval] = useState(15);
  const [recordAudio, setRecordAudio] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  /* ───────── Active monitoring ───────── */
  const [userLocation, setUserLocation] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isDeviated, setIsDeviated] = useState(false);
  const [deviationMeters, setDeviationMeters] = useState(0);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [nearDestination, setNearDestination] = useState(false);

  /* ───────── SOS ───────── */
  const [sosActive, setSosActive] = useState(false);
  const [sosAlertId, setSosAlertId] = useState(null);

  /* ───────── Refs ───────── */
  const gpsWatchRef = useRef(null);
  const checkInTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startDebounceRef = useRef(null);
  const destDebounceRef = useRef(null);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  /* ───────────────────────────────────────────────────
     GEOAPIFY AUTOCOMPLETE
     Replaces Nominatim — gives better results and uses
     the same API key already in use for safety scoring.

     What we extract from the response:
       properties.formatted  → display label
       properties.lat / lon  → coordinates sent to backend
   ─────────────────────────────────────────────────── */
  const fetchGeoapifySuggestions = async (query, type) => {
    if (!query || query.length < 3) {
      type === "start" ? setStartSuggestions([]) : setDestSuggestions([]);
      return;
    }

    try {
      const res = await axios.get(
        "https://api.geoapify.com/v1/geocode/autocomplete",
        {
          params: {
            text: query,
            limit: 5,
            apiKey: GEOAPIFY_KEY,
            // bias toward India for better local results
            bias: "countrycode:in",
          },
        }
      );

      const suggestions = (res.data?.features || []).map((f) => ({
        label: f.properties.formatted,
        lat: f.properties.lat,
        lon: f.properties.lon,
      }));

      type === "start"
        ? setStartSuggestions(suggestions)
        : setDestSuggestions(suggestions);
    } catch (err) {
      console.error("Geoapify autocomplete error:", err.message);
    }
  };

  // Debounce autocomplete to avoid hammering the API on every keystroke
  const handleStartInput = (value) => {
    setStartQuery(value);
    clearTimeout(startDebounceRef.current);
    startDebounceRef.current = setTimeout(
      () => fetchGeoapifySuggestions(value, "start"),
      300
    );
  };

  const handleDestInput = (value) => {
    setDestQuery(value);
    clearTimeout(destDebounceRef.current);
    destDebounceRef.current = setTimeout(
      () => fetchGeoapifySuggestions(value, "dest"),
      300
    );
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setStartCoords(coords);
        setStartQuery(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        setStartSuggestions([]);
        setLoading(false);
      },
      (err) => {
        console.error("GPS Error:", err);
        alert("Failed to access your location.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  /* ───────────────────────────────────────────────────
     FETCH SAFE ROUTES
     Sends { start: {lat,lng}, end: {lat,lng}, mode }
     Backend returns up to 2 ORS alternative routes,
     each scored by Geoapify safety data.
     Response: { success, safest, allRoutes: Route[] }
     Each Route: { id, geometry, summary, distance,
                   duration, score, breakdown }
   ─────────────────────────────────────────────────── */
  const fetchSafeRoutes = async () => {
    if (
      !startCoords.lat ||
      !startCoords.lng ||
      !destCoords.lat ||
      !destCoords.lng
    ) {
      alert("Please select both a valid start and destination point.");
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/routes/safe",
        { start: startCoords, end: destCoords, mode: travelMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const all = res.data.allRoutes || [];
      const best = res.data.safest || all[0] || null;

      setRoutes(all);
      setBestRoute(best);
      setSelectedRouteIdx(0); // safest is always index 0 (sorted server-side)

      if (all.length === 0) alert("No routes found between selected coordinates.");
    } catch (err) {
      console.error("Routing Error:", err);
      alert("Failed to compute safe routes");
    } finally {
      setLoading(false);
    }
  };

  // Selecting a route immediately updates bestRoute →
  // LiveMap re-renders the bold red line to that route's geometry
  const handleSelectRoute = (idx) => {
    setSelectedRouteIdx(idx);
    setBestRoute(routes[idx]);
  };

  /* ───────── Haversine distance ───────── */
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const dPhi = ((lat2 - lat1) * Math.PI) / 180;
    const dLam = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dPhi / 2) ** 2 +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  /* ───────── Start trip ───────── */
  const handleStartTrip = async () => {
    if (!bestRoute) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "http://localhost:5000/api/trips",
        {
          start: { lat: startCoords.lat, lng: startCoords.lng, address: startQuery },
          destination: { lat: destCoords.lat, lng: destCoords.lng, address: destQuery },
          route: bestRoute,
          safetyScore: bestRoute.score || 0,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const trip = res.data;
      setActiveTripId(trip._id);

      await axios.put(
        `http://localhost:5000/api/trips/${trip._id}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket.emit("start-trip", {
        tripId: trip._id,
        userId: user?._id,
        userName: user?.name,
        destination: destQuery,
        start: startCoords,
        safetyScore: bestRoute.score || 0,
        routeGeometry: bestRoute.geometry,
      });

      setTripState("active");
      setIsDeviated(false);
      setNearDestination(false);

      const routePoints = bestRoute.geometry.coordinates;
      const distance = bestRoute.summary?.distance || 0;
      const duration = bestRoute.summary?.duration || 0;
      setDistanceRemaining((distance / 1000).toFixed(1));
      setTimeRemaining(Math.round(duration / 60));

      startLiveTracking(trip._id, routePoints, distance, duration);
      if (periodicCheck) startCheckInTimer();
    } catch (err) {
      console.error("Start Trip error:", err);
      alert("Failed to register active trip");
    } finally {
      setLoading(false);
    }
  };

  /* ───────── Live GPS tracking ───────── */
  const startLiveTracking = (tripId, routePoints, totalDist, totalDur) => {
    if (!navigator.geolocation) return;

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);

        socket.emit("send-location", {
          tripId,
          userId: user?._id,
          userName: user?.name,
          location: { lat, lng },
          timestamp: new Date(),
        });

        // Find closest point on route
        let minDist = Infinity;
        let closestIdx = 0;
        routePoints.forEach(([rlng, rlat], idx) => {
          const d = getDistance(lat, lng, rlat, rlng);
          if (d < minDist) { minDist = d; closestIdx = idx; }
        });

        if (routeDeviation && minDist > deviationThreshold) {
          setIsDeviated(true);
          setDeviationMeters(Math.round(minDist));
        } else {
          setIsDeviated(false);
        }

        // Remaining distance
        let remaining = 0;
        for (let i = closestIdx; i < routePoints.length - 1; i++) {
          const [lng1, lat1] = routePoints[i];
          const [lng2, lat2] = routePoints[i + 1];
          remaining += getDistance(lat1, lng1, lat2, lng2);
        }

        const ratio = totalDist > 0 ? remaining / totalDist : 0;
        setDistanceRemaining((remaining / 1000).toFixed(1));
        setTimeRemaining(Math.round((totalDur * ratio) / 60));

        if (getDistance(lat, lng, destCoords.lat, destCoords.lng) < 100) {
          setNearDestination(true);
        }
      },
      (err) => console.error("Watch Position error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  /* ───────── Check-in timer ───────── */
  const startCheckInTimer = () => {
    const total = checkInterval * 60;
    setSecondsRemaining(total);
    if (checkInTimerRef.current) clearInterval(checkInTimerRef.current);
    checkInTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 16) setShowCheckInModal(true);
        if (prev <= 1) { clearInterval(checkInTimerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirmSafe = () => {
    setShowCheckInModal(false);
    startCheckInTimer();
    socket.emit("safety-check-response", {
      userId: user?._id,
      userName: user?.name,
      status: "confirmed_safe",
      timestamp: new Date(),
    });
  };

  /* ───────── Complete / abort trip ───────── */
  const handleCompleteTrip = async () => {
    if (checkInTimerRef.current) clearInterval(checkInTimerRef.current);
    if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:5000/api/trips/${activeTripId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      socket.emit("end-trip", {
        tripId: activeTripId,
        userId: user?._id,
        userName: user?.name,
        status: "completed",
        timestamp: new Date(),
      });
    } catch (err) {
      console.error("Complete Trip Error:", err);
    } finally {
      setTripState("planning");
      setBestRoute(null);
      setRoutes([]);
      setUserLocation(null);
      setNearDestination(false);
    }
  };

  const handleAbortTrip = () => {
    if (!window.confirm("End tracking? Your guardians will be notified.")) return;
    if (checkInTimerRef.current) clearInterval(checkInTimerRef.current);
    if (gpsWatchRef.current) navigator.geolocation.clearWatch(gpsWatchRef.current);
    socket.emit("end-trip", {
      tripId: activeTripId,
      userId: user?._id,
      userName: user?.name,
      status: "cancelled",
      timestamp: new Date(),
    });
    setTripState("planning");
    setBestRoute(null);
    setRoutes([]);
    setUserLocation(null);
    setNearDestination(false);
  };

  /* ───────── SOS ───────── */
  const handleTriggerSOS = async () => {
    if (recordAudio) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mr.start();
        setSosActive(true);
      } catch (err) {
        console.error("Microphone error:", err.message);
      }
    }

    const currentGPS = userLocation
      ? { lat: userLocation[0], lng: userLocation[1] }
      : { lat: startCoords.lat, lng: startCoords.lng };

    if (!navigator.onLine) {
      setTimeout(async () => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.onstop = async () => {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            await queueOfflineAlert(currentGPS, activeTripId, blob);
            chunksRef.current = [];
            setSosActive(false);
            alert("Offline: SOS queued. Will sync when online.");
          };
        } else {
          await queueOfflineAlert(currentGPS, activeTripId, null);
          alert("Offline: SOS queued.");
        }
      }, 8000);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:5000/api/sos/trigger",
        { location: currentGPS, tripId: activeTripId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const alertItem = res.data.alert;
      setSosAlertId(alertItem._id);
      socket.emit("sos-alert", {
        tripId: activeTripId,
        userId: user?._id,
        userName: user?.name,
        location: currentGPS,
        alertId: alertItem._id,
      });
      if (recordAudio) setTimeout(() => stopAudioAndLink(alertItem._id), 10000);
    } catch (err) {
      console.error("SOS trigger error:", err);
      alert("Failed to send SOS");
    }
  };

  const stopAudioAndLink = async (alertId) => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const fd = new FormData();
          fd.append("audio", blob);
          const uploadRes = await axios.post(
            "http://localhost:5000/api/recordings/upload",
            fd
          );
          const token = localStorage.getItem("token");
          await axios.put(
            `http://localhost:5000/api/alerts/${alertId}/audio`,
            { audioUrl: uploadRes.data.audioUrl },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          chunksRef.current = [];
          setSosActive(false);
        } catch (err) {
          console.error("Audio upload error:", err);
        }
      };
    }
  };

  const handleConfirmArrival = (safe) => {
    setNearDestination(false);
    if (safe) handleCompleteTrip();
    else handleTriggerSOS();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const scoreColor = (score) =>
    score >= 80
      ? "bg-green-50 text-green-700 border-green-200"
      : score >= 55
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  const scoreLabel = (score) =>
    score >= 80 ? "Safe" : score >= 55 ? "Moderate" : "Risky";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-red-600 selection:text-white">
      <Navbar />

      <SafetyCheckModal
        isOpen={showCheckInModal}
        onConfirmSafe={handleConfirmSafe}
        onTriggerSOS={() => { setShowCheckInModal(false); handleTriggerSOS(); }}
        countdownSeconds={15}
      />

      {/* ── Active trip status banner ── */}
      {tripState === "active" && (
        <div className={`px-6 py-3.5 flex items-center justify-between font-semibold text-sm ${
          isDeviated
            ? "bg-red-50 text-red-700 border-b border-red-100"
            : "bg-green-50 text-green-700 border-b border-green-100"
        }`}>
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full animate-pulse ${isDeviated ? "bg-red-500" : "bg-green-500"}`} />
            {isDeviated
              ? `⚠️ Route deviation — ${deviationMeters}m off path`
              : "Trip in progress. Stay safe!"}
          </span>
          <button
            onClick={handleAbortTrip}
            className="text-xs bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-semibold transition"
          >
            End Trip
          </button>
        </div>
      )}

      {/* ── Near destination banner ── */}
      {tripState === "active" && nearDestination && (
        <div className="px-6 py-3.5 flex items-center justify-between bg-blue-50 border-b border-blue-100 text-sm">
          <span className="text-blue-700 font-semibold">
            🎯 You're near your destination — arrived safely?
          </span>
          <div className="flex gap-2">
            <button onClick={() => handleConfirmArrival(true)}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold transition">
              Yes, I'm Safe
            </button>
            <button onClick={() => handleConfirmArrival(false)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold transition">
              No, SOS
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Hero (planning only) ── */}
        {tripState === "planning" && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2rem] bg-gradient-to-br from-[#FFF5F5] via-[#FFF8F8] to-white p-10 shadow-[0_20px_50px_rgba(220,38,38,0.05)] relative overflow-hidden border border-red-100 mb-8"
          >
            <div className="absolute -top-40 right-0 w-[35rem] h-[35rem] bg-red-200/20 rounded-full blur-[140px] pointer-events-none" />
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/60 text-[11px] font-bold uppercase tracking-wider text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Sahyatri Trip Monitor
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">
                Plan Your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-slate-900">
                  Safest Route
                </span>
              </h1>
              <p className="text-slate-500 text-base leading-relaxed">
                AI-powered safety scoring selects the best route based on
                police presence, hospitals, and risk zones along your path.
              </p>
            </div>
          </motion.section>
        )}

        <div className="flex flex-col md:flex-row gap-6">

          {/* ── Map — receives separated props for clean rendering ── */}
          <div className="flex-1 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm relative min-h-[500px]">
            <LiveMap
              routes={routes}
              bestRoute={bestRoute}
              startCoords={startCoords.lat ? [startCoords.lat, startCoords.lng] : null}
              destCoords={destCoords.lat ? [destCoords.lat, destCoords.lng] : null}
              userLocation={tripState === "active" ? userLocation : null}
            />
          </div>

          {/* ── Right panel ── */}
          <div className="w-full md:w-96 flex flex-col gap-6">
            {tripState === "planning" ? (
              <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-5 shadow-sm">

                {/* ── Start input with Geoapify autocomplete ── */}
                <div className="relative">
                  <label className="block mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Starting Point
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={startQuery}
                      onChange={(e) => handleStartInput(e.target.value)}
                      placeholder="Search start address..."
                      className="flex-1 bg-slate-50 border border-slate-200 focus:border-red-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none text-xs text-slate-800 placeholder:text-slate-400 transition"
                    />
                    <button
                      onClick={useCurrentLocation}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-base transition"
                      title="Use my location"
                    >
                      📍
                    </button>
                  </div>
                  {startSuggestions.length > 0 && (
                    <ul className="absolute z-30 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-xl text-xs overflow-hidden max-h-48 overflow-y-auto">
                      {startSuggestions.map((s, i) => (
                        <li
                          key={i}
                          onClick={() => {
                            setStartCoords({ lat: s.lat, lng: s.lon });
                            setStartQuery(s.label);
                            setStartSuggestions([]);
                          }}
                          className="px-3.5 py-2.5 hover:bg-red-50 cursor-pointer border-b border-slate-50 last:border-0 text-slate-600 flex items-start gap-2"
                        >
                          <span className="mt-0.5 text-slate-400">📍</span>
                          <span className="line-clamp-2">{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ── Destination input with Geoapify autocomplete ── */}
                <div className="relative">
                  <label className="block mb-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={destQuery}
                    onChange={(e) => handleDestInput(e.target.value)}
                    placeholder="Search destination..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-red-400 focus:bg-white rounded-xl px-3.5 py-2.5 outline-none text-xs text-slate-800 placeholder:text-slate-400 transition"
                  />
                  {destSuggestions.length > 0 && (
                    <ul className="absolute z-30 w-full bg-white border border-slate-200 mt-1 rounded-xl shadow-xl text-xs overflow-hidden max-h-48 overflow-y-auto">
                      {destSuggestions.map((s, i) => (
                        <li
                          key={i}
                          onClick={() => {
                            setDestCoords({ lat: s.lat, lng: s.lon });
                            setDestQuery(s.label);
                            setDestSuggestions([]);
                          }}
                          className="px-3.5 py-2.5 hover:bg-red-50 cursor-pointer border-b border-slate-50 last:border-0 text-slate-600 flex items-start gap-2"
                        >
                          <span className="mt-0.5 text-slate-400">🏁</span>
                          <span className="line-clamp-2">{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* ── Travel mode ── */}
                <div>
                  <label className="block mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Travel Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "driving-car", icon: "🚗", label: "Driving" },
                      { id: "foot-walking", icon: "🚶", label: "Walking" },
                      { id: "cycling-regular", icon: "🚲", label: "Cycling" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setTravelMode(m.id)}
                        className={`flex flex-col items-center justify-center py-2.5 rounded-xl border text-xs font-medium transition ${
                          travelMode === m.id
                            ? "bg-red-50 border-red-300 text-red-600"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-lg mb-0.5">{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={fetchSafeRoutes}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm shadow-[0_4px_20px_rgba(220,38,38,0.25)]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Scoring routes...
                    </span>
                  ) : "📍 Find Safest Route"}
                </button>

                {/* ── Route options ──
                    Backend returns up to 2 routes sorted safest-first.
                    Clicking a route card immediately swaps bestRoute →
                    LiveMap redraws the bold red polyline to that route. ── */}
                {routes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Route Options ({routes.length} found)
                    </p>
                    {routes.map((r, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectRoute(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                          selectedRouteIdx === idx
                            ? "border-red-300 bg-red-50 shadow-sm"
                            : "border-slate-100 bg-slate-50 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {idx === 0 && (
                              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                                ✓ Recommended
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-600">
                              {idx > 0 && `Route ${idx + 1}`}
                            </span>
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${scoreColor(r.score)}`}>
                            {r.score}% · {scoreLabel(r.score)}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[11px] text-slate-400">
                          <span>📏 {(r.summary?.distance / 1000).toFixed(1)} km</span>
                          <span>⏱ {Math.round(r.summary?.duration / 60)} min</span>
                          {r.breakdown?.policeStations > 0 && (
                            <span>🚓 {r.breakdown.policeStations}</span>
                          )}
                          {r.breakdown?.hospitals > 0 && (
                            <span>🏥 {r.breakdown.hospitals}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Selected route summary + start button ── */}
                {bestRoute && (
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-600">
                        Selected Route Safety
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreColor(bestRoute.score)}`}>
                        {bestRoute.score}%
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 border-t border-slate-200 pt-3">
                      <div>📏 {(bestRoute.summary?.distance / 1000).toFixed(1)} km</div>
                      <div>⏱️ {Math.round(bestRoute.summary?.duration / 60)} mins</div>
                      {bestRoute.breakdown && (
                        <>
                          <div>🚓 {bestRoute.breakdown.policeStations ?? 0} police</div>
                          <div>🏥 {bestRoute.breakdown.hospitals ?? 0} hospitals</div>
                          {bestRoute.breakdown.bars > 0 && (
                            <div className="text-red-500">🍺 {bestRoute.breakdown.bars} bars nearby</div>
                          )}
                        </>
                      )}
                    </div>
                    <button
                      onClick={handleStartTrip}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm shadow-[0_4px_20px_rgba(22,163,74,0.2)]"
                    >
                      🚀 Start Trip
                    </button>
                  </div>
                )}

                {/* ── Safety settings (collapsible) ── */}
                <div className="border-t border-slate-100 pt-4">
                  <button
                    onClick={() => setShowSettings((p) => !p)}
                    className="w-full flex justify-between items-center text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    Safety Settings
                    <span className="text-slate-400">{showSettings ? "▲" : "▼"}</span>
                  </button>
                  {showSettings && (
                    <div className="space-y-4 mt-4">
                      <ToggleRow label="Share live location with contacts" checked={shareLocation} onChange={setShareLocation} />
                      <ToggleRow label="Alert contacts on route deviation" checked={routeDeviation} onChange={setRouteDeviation} />
                      {routeDeviation && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Deviation threshold</span>
                            <span>{deviationThreshold}m</span>
                          </div>
                          <input
                            type="range" min={100} max={500} step={50}
                            value={deviationThreshold}
                            onChange={(e) => setDeviationThreshold(Number(e.target.value))}
                            className="w-full accent-red-500"
                          />
                        </div>
                      )}
                      <ToggleRow label="Periodic safety check-ins" checked={periodicCheck} onChange={setPeriodicCheck} />
                      {periodicCheck && (
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Check-in interval</span>
                          <select
                            value={checkInterval}
                            onChange={(e) => setCheckInterval(Number(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] text-slate-700"
                          >
                            <option value={1}>1 Min (Demo)</option>
                            <option value={5}>5 Minutes</option>
                            <option value={10}>10 Minutes</option>
                            <option value={15}>15 Minutes</option>
                          </select>
                        </div>
                      )}
                      <ToggleRow label="Auto-record emergency audio" checked={recordAudio} onChange={setRecordAudio} />
                    </div>
                  )}
                </div>
              </div>

            ) : (
              /* ── ACTIVE TRIP MONITOR ── */
              <div className="bg-white border border-slate-100 p-6 rounded-2xl space-y-5 shadow-sm">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Active Trip Monitor
                  </h2>
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    Live guardian monitoring enabled
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4">
                  <div>
                    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                      Destination
                    </h3>
                    <p className="text-sm font-semibold text-slate-800 line-clamp-2">{destQuery}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Distance Left</p>
                      <p className="text-2xl font-extrabold text-slate-900">{distanceRemaining} <span className="text-sm font-medium">km</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">ETA</p>
                      <p className="text-2xl font-extrabold text-slate-900">{timeRemaining} <span className="text-sm font-medium">min</span></p>
                    </div>
                  </div>
                </div>

                {periodicCheck && (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Next check-in</span>
                      <span className="font-bold text-slate-900 font-mono">{formatTime(secondsRemaining)}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-1000 ease-linear"
                        style={{ width: `${(secondsRemaining / (checkInterval * 60)) * 100}%` }}
                      />
                    </div>
                    <button
                      onClick={handleConfirmSafe}
                      className="w-full bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 font-semibold py-2 rounded-xl transition text-xs"
                    >
                      ✓ Confirm I'm Safe
                    </button>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-2">
                  <h4 className="font-semibold text-slate-700 text-xs">Guardians Notified</h4>
                  {user?.emergencyContacts?.length > 0 ? (
                    <ul className="space-y-1.5 text-xs text-slate-500">
                      {user.emergencyContacts.map((num, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="h-1 w-1 rounded-full bg-green-400" />
                          {num}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-amber-600 text-xs">No guardians set. Update your profile.</p>
                  )}
                </div>

                <div className="bg-red-50 border border-red-100 p-5 rounded-xl space-y-3">
                  <button
                    onClick={handleTriggerSOS}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl transition text-base shadow-[0_4px_20px_rgba(220,38,38,0.3)] active:scale-95"
                  >
                    🚨 Trigger SOS
                  </button>
                  {sosActive && (
                    <p className="text-center text-xs text-red-600 animate-pulse font-semibold">
                      🎙️ Recording emergency audio...
                    </p>
                  )}
                </div>

                <button
                  onClick={handleCompleteTrip}
                  className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl transition text-sm font-semibold"
                >
                  🏁 Finish Trip Successfully
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-600">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? "bg-red-600" : "bg-slate-200"}`}
      >
        <span className={`absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-all ${checked ? "left-5" : "left-1"}`} />
      </button>
    </div>
  );
}