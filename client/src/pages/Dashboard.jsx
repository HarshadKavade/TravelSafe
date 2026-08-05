import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { jsPDF } from "jspdf";
import useAuth from "../hooks/useAuth";
import Navbar from "../components/Navbar";
import SOSButton from "../components/SOSButton";

export default function Dashboard() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  // Hydration state to prevent race conditions on page refresh
  const [isHydrating, setIsHydrating] = useState(true);

  // Core Functional Database States
  const [emergencyContacts, setEmergencyContacts] = useState("");
  const [distressPin, setDistressPin] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Live client-side hardware telemetry states
  const [batteryLevel, setBatteryLevel] = useState("Checking...");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsStatus, setGpsStatus] = useState("Checking...");
  const [micStatus, setMicStatus] = useState("Checking...");

  // Fetch verified log data from the server
  const fetchMySOSHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await axios.get("http://localhost:5000/api/alerts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Safeguard user mapping verification context to prevent stale closures
      const currentUserId = user?._id;
      if (!currentUserId) return;

      const myAlerts = res.data.filter((alert) => alert.userId === currentUserId);
      setAlerts(myAlerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      console.error("Failed to load SOS history:", err);
    }
  };

  // Intercept mount sequence to wait for token hydration before redirect evaluation
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      navigate("/login");
      return;
    }

    if (user) {
      if (user.emergencyContacts) {
        setEmergencyContacts(user.emergencyContacts.join(", "));
      }
      fetchMySOSHistory();
      setIsHydrating(false); // Secure session confirmed, lift structural lock
    }
  }, [user, navigate]);

  // Sync profile details on mount, load history, and bind custom SOS event listener
  useEffect(() => {
    const handleSOSCreated = () => {
      console.log("📡 Real-time 'sos-created' event caught. Refreshing stream...");
      fetchMySOSHistory();
    };

    window.addEventListener("sos-created", handleSOSCreated);

    return () => {
      window.removeEventListener("sos-created", handleSOSCreated);
    };
  }, [user?._id]); // Bound to user session ID to always execute fresh reference pipelines

  // Telemetry Event Listeners (Network, Battery, High-Accuracy Permissions)
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () => setBatteryLevel(`${Math.round(battery.level * 100)}%`);
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
      });
    } else {
      setBatteryLevel("100%");
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const acc = pos.coords.accuracy;
          if (acc <= 50) {
            setGpsStatus(`Active (±${Math.round(acc)}m)`);
          } else {
            setGpsStatus(`Low Acc (±${Math.round(acc)}m)`);
          }
        },
        () => {
          setGpsStatus("Denied / Error");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsStatus("Unsupported");
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.permissions?.query({ name: "microphone" }).then((result) => {
        if (result.state === "granted") setMicStatus("Ready");
        else if (result.state === "prompt") setMicStatus("Permission Ask");
        else setMicStatus("Blocked");
      });
    } else {
      setMicStatus("Unsupported");
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const contactsArray = emergencyContacts
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const updates = { emergencyContacts: contactsArray };

      if (distressPin.trim()) {
        updates.distressPin = distressPin.trim();
      }

      // Execute network transaction and capture update from Context resolution pipeline
      const result = await updateProfile(updates);
      
      // Force UI input value sync right away based on local or response parameters
      if (result && result.emergencyContacts) {
        setEmergencyContacts(result.emergencyContacts.join(", "));
      } else {
        setEmergencyContacts(contactsArray.join(", "));
      }

      setSaveMessage("Configuration updated successfully!");
      setDistressPin(""); 
      setTimeout(() => setSaveMessage(""), 4000);
    } catch (err) {
      console.error(err);
      setSaveMessage("Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  const contactCount = emergencyContacts ? emergencyContacts.split(",").filter(c => c.trim()).length : 0;
  const realTimeExcursions = alerts.length;

  const activeHardwareNodes = [
    isOnline,
    gpsStatus.startsWith("Active") || gpsStatus.startsWith("Low Acc"),
    micStatus === "Ready" || micStatus === "Permission Ask",
    batteryLevel === "Checking..." || parseInt(batteryLevel) > 15
  ].filter(Boolean).length;

  const calculatedIntegrityIndex = `${Math.round((activeHardwareNodes / 4) * 100)}%`;

  /* ======================================================================
      SYSTEM METRICS FILE EXPORT GENERATOR (jsPDF HIGH-INTEGRITY ENGINE)
  ====================================================================== */
  const handleExportMetrics = () => {
    if (alerts.length === 0) {
      alert("No historical incident data available to export.");
      return;
    }

    const doc = new jsPDF({
      orientation: "p",
      unit: "pt",
      format: "letter"
    });

    let currentY = 40;
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;

    const verifyPageSpace = (neededSpace) => {
      if (currentY + neededSpace >= pageHeight - 40) {
        doc.addPage();
        currentY = 40; 
      }
    };

    // --- HEADER DESIGN BLOCK ---
    doc.setFillColor(15, 23, 42); 
    doc.rect(marginX, currentY, 532, 65, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CRIMSON TELEMETRY PIPELINE SYSTEM DISPATCH LOG", marginX + 15, currentY + 28);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(239, 68, 68); 
    doc.text(`EXPORT CONTEXT: SYSTEM AUTOMATED PROTOCOL // VERIFIED OPERATIONS REPOSITORY`, marginX + 15, currentY + 48);
    currentY += 90;

    // --- METADATA OVERVIEW ---
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.setFont("Helvetica", "bold");
    doc.text("METADATA MANIFEST SUMMARY:", marginX, currentY);
    currentY += 20;

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated On       : ${new Date().toLocaleString()}`, marginX + 10, currentY);
    doc.text(`Operator Name      : ${user?.name || "Unknown Operator"} (ID: ${user?._id || "N/A"})`, marginX + 270, currentY);
    currentY += 18;
    doc.text(`Hardware Integrity : ${calculatedIntegrityIndex}`, marginX + 10, currentY);
    doc.text(`Total Log Streams  : ${alerts.length} Incidents Captured`, marginX + 270, currentY);
    currentY += 25;

    // --- DIAGNOSTICS SUBSECTION ---
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(marginX, currentY, 572, currentY);
    currentY += 20;

    doc.setFont("Helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("CURRENT SUBSYSTEM DIAGNOSTICS LOCK:", marginX, currentY);
    currentY += 20;

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    
    doc.text(`• GPS Status : ${gpsStatus}`, marginX + 10, currentY);
    doc.text(`• Cloud Link : ${isOnline ? "ESTABLISHED" : "DISCONNECTED"}`, marginX + 270, currentY);
    currentY += 18;
    doc.text(`• Mic Status : ${micStatus}`, marginX + 10, currentY);
    doc.text(`• Grid Power : ${batteryLevel}`, marginX + 270, currentY);
    currentY += 25;

    doc.line(marginX, currentY, 572, currentY);
    currentY += 30;

    // --- INCIDENT COMPILATION LOOP ---
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); 
    doc.text("HISTORIC STREAM ANALYSIS REPORT RECORDS", marginX, currentY);
    currentY += 20;

    alerts.forEach((alert, index) => {
      verifyPageSpace(130);

      const startTime = new Date(alert.createdAt);
      const stopTime = alert.updatedAt ? new Date(alert.updatedAt) : startTime;
      const durationSeconds = Math.round((stopTime - startTime) / 1000);
      
      let durationStr = "IMMEDIATE SNAPSHOT / ACTIVE DYNAMIC TRACK";
      if (durationSeconds > 0) {
        durationStr = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s (${durationSeconds}s)`;
      }

      const lat = alert.location?.lat;
      const lng = alert.location?.lng;
      const geoText = lat && lng ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "NO COORDINATES LOCKED";

      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, currentY, 532, 105, "F");
      doc.setDrawColor(241, 245, 249);
      doc.rect(marginX, currentY, 532, 105, "S");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`RECORD INDEX FRAME #${String(index + 1).padStart(3, '0')}`, marginX + 15, currentY + 18);
      
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Alert Unique ID  : ${alert._id}`, marginX + 15, currentY + 36);
      doc.text(`Dispatch Link    : ${startTime.toLocaleString()}`, marginX + 15, currentY + 52);
      doc.text(`Clearance Engine : ${alert.updatedAt ? stopTime.toLocaleString() : "ABRUPT INTERRUPT"}`, marginX + 270, currentY + 52);
      doc.text(`Active Duration  : ${durationStr}`, marginX + 15, currentY + 68);
      doc.text(`GPS Telemetry Coordinate Lock : ${geoText}`, marginX + 15, currentY + 84);

      currentY += 120;
    });

    // --- FOOTER STAMP SECTION ---
    verifyPageSpace(40);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, currentY, 572, currentY);
    currentY += 20;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("END OF METADATA DISPATCH PROTOCOL SUMMARY REPORT — SIGNED PIPELINE BROADCAST ENGINE", marginX, currentY);

    doc.save(`CRIMSON_METRICS_LOG_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const stats = [
    { t: "Emergency Relays", v: contactCount.toString(), i: "👥" },
    { t: "Incidents Resolved", v: alerts.length.toString(), i: "🚨" },
    { t: "Monitored Excursions", v: realTimeExcursions.toString(), i: "🛣️" },
    { t: "Integrity Index", v: calculatedIntegrityIndex, i: "🛡️" },
  ];

  const actions = [
    { t: "Map Route Security", to: "/trip", i: "🗺️", desc: "Evaluate path threat variables" },
    { t: "Anchor Trusted Guardians", to: "/guardian", i: "👨‍👩‍👧", desc: "Link live monitoring relays" },
    { t: "Export System Metrics", to: "#", i: "📜", desc: "Download incident log reports" },
    { t: "Crisis Protocols", to: "#", i: "💡", desc: "Review baseline response steps" },
  ];

  if (isHydrating && !user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Re-establishing secure connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-red-600 selection:text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        
        {/* PREMIUM LIGHT CHROMATIC BANNER */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-gradient-to-br from-[#FFF5F5] via-[#FFF8F8] to-[#FFFFFF] text-slate-900 p-10 md:p-12 shadow-[0_20px_50px_rgba(220,38,38,0.05)] relative overflow-hidden border border-red-100"
        >
          <div className="absolute -top-40 right-0 w-[35rem] h-[35rem] bg-red-200/20 rounded-full blur-[140px] pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row justify-between gap-10 items-start lg:items-center relative z-10">
            <div className="space-y-4 max-w-2xl">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-200/60 text-[11px] font-bold uppercase tracking-wider text-red-600">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                CRIMSON TELEMETRY PIPELINE ARMED
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-950 font-sans">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-red-500 to-slate-900">{user?.name}</span>
              </h1>
              <p className="text-slate-500 text-base md:text-lg font-normal leading-relaxed">
                Supercharge your tactical perimeter response. Map real-time safety indices, track diagnostics, and force broadcast instant emergency parameters.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <Link to="/trip" className="bg-red-600 text-white px-6 py-3.5 rounded-xl font-semibold tracking-tight hover:bg-red-500 active:scale-[0.99] transition shadow-[0_4px_20px_rgba(220,38,38,0.25)] text-sm">
                  Plan Safest Route
                </Link>
                <Link to="/guardian" className="border border-slate-200 bg-white text-slate-700 px-6 py-3.5 rounded-xl font-semibold hover:bg-slate-50 transition text-sm shadow-xs">
                  Guardian Cockpit
                </Link>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 min-w-[340px] border border-red-100 w-full lg:w-auto shadow-xl">
              <div className="mb-5">
                <h2 className="font-bold text-base text-slate-900 tracking-tight">Rapid Threat Vector Dispatch</h2>
                <p className="text-xs text-slate-400 mt-1">Instantly notify guardians, share live location, and start backup recordings.</p>
              </div>
              <SOSButton />
            </div>
          </div>
        </motion.section>

        {/* METRICS ROW */}
        <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.t} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between group hover:border-red-200 transition-all duration-300">
              <div>
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-xl border border-red-100">{s.i}</div>
                <div className="text-3xl font-bold mt-4 text-slate-900 tracking-tight font-sans">{s.v}</div>
              </div>
              <div className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider mt-2">{s.t}</div>
            </div>
          ))}
        </section>

        {/* CONTROLS & HISTORIC STREAM BLOCK */}
        <section className="grid lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-8 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)] flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-6">Quick Infrastructure Controls</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {actions.map((a) => {
                if (a.t === "Export System Metrics") {
                  return (
                    <button
                      key={a.t}
                      onClick={handleExportMetrics}
                      className="text-left rounded-xl border border-slate-100 p-5 hover:bg-[#F8FAFC] transition-all duration-200 group flex items-start gap-4 hover:border-red-100 w-full cursor-pointer bg-white"
                    >
                      <div className="text-2xl p-2 bg-slate-50 border border-slate-100 rounded-xl transition-transform group-hover:scale-105 duration-200">{a.i}</div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">{a.t}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-normal">{a.desc}</p>
                      </div>
                    </button>
                  );
                }

                return (
                  <Link key={a.t} to={a.to} className="rounded-xl border border-slate-100 p-5 hover:bg-[#F8FAFC] transition-all duration-200 group flex items-start gap-4 hover:border-red-100 bg-white">
                    <div className="text-2xl p-2 bg-slate-50 border border-slate-100 rounded-xl transition-transform group-hover:scale-105 duration-200">{a.i}</div>
                    <div>
                      <h3 className="font-semibold text-sm text-slate-800 tracking-tight group-hover:text-red-600 transition-colors">{a.t}</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-normal">{a.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* THREAT INTELLIGENCE STREAM WITH PREMIUM STYLED REFRESH TRIGGER */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-12 mb-6 pb-3 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Threat Intelligence Stream</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-normal">Direct tracking metrics securely hosted from master database metrics</p>
              </div>
              
              <button 
                onClick={fetchMySOSHistory}
                className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-red-600 bg-white hover:bg-red-50/40 border border-slate-200 hover:border-red-200/60 px-4 py-2.5 rounded-xl transition-all duration-200 shadow-2xs hover:shadow-sm active:scale-[0.97] cursor-pointer w-full sm:w-auto group"
                title="Force reload all incidents"
              >
                <svg 
                  className="w-3.5 h-3.5 transition-transform duration-500 ease-out group-hover:rotate-180 text-slate-400 group-hover:text-red-500" 
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
                <span>Refresh Incidents</span>
              </button>
            </div>

            <div className="max-h-[340px] overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-red-100 scrollbar-track-transparent">
              {alerts.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-xl border-slate-200 bg-slate-50/50">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No operational anomalies logged.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div 
                    key={alert._id} 
                    className="border border-slate-100 bg-[#F8FAFC]/40 rounded-xl p-4 flex justify-between items-center transition hover:bg-[#F8FAFC] hover:border-red-100"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <p className="font-semibold text-slate-800 text-sm tracking-tight">Active Emergency Escalation</p>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 animate-pulse">
                          CRITICAL DISPATCH
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-normal">
                        {new Date(alert.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {/* FIXED: Replaced corrupted formatting block with proper standard Google Maps dynamic coordinates layout template */}
                    <a 
                      href={alert.location?.lat ? `https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}` : "#"} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-slate-600 hover:text-red-600 font-semibold text-xs transition px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-2xs active:scale-95"
                    >
                      View Map 📍
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Node Core Diagnostics</h3>
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
              </div>
              <div className="space-y-3.5 text-xs font-semibold text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-2.5">
                  <span className="text-slate-400 font-normal">📍 Spatial GPS Stream</span> 
                  <span className={gpsStatus.startsWith("Active") ? "text-red-600 font-bold" : "text-amber-500 font-bold"}>{gpsStatus}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2.5">
                  <span className="text-slate-400 font-normal">🌐 Active Cloud Handshake</span> 
                  <span className={isOnline ? "text-red-600 font-bold" : "text-rose-600 font-bold"}>{isOnline ? "Established" : "Disconnected"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2.5">
                  <span className="text-slate-400 font-normal">🎤 Ambient Threat Intake</span> 
                  <span className={micStatus === "Ready" ? "text-red-600 font-bold" : "text-amber-500 font-bold"}>{micStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-normal">🔋 Internal Grid Reserves</span> 
                  <span className="text-red-600 font-bold">{batteryLevel}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl shadow-xs text-slate-800 p-6 relative overflow-hidden border border-red-100">
              <div className="absolute top-0 right-0 p-4 opacity-10 text-5xl text-red-500">💡</div>
              <h3 className="font-semibold text-sm uppercase tracking-wider text-red-600 mb-2">System Insight</h3>
              <p className="text-slate-500 text-xs font-normal leading-relaxed">
                Trigger vectors intercept spatial nodes, bypassing non-essential threads to broadcast core location variables instantly.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05),0_10px_32px_-4px_rgba(0,0,0,0.03)] space-y-5">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-400">Incident Matrix Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">Emergency Relays (Comma-separated)</label>
                  <input 
                    className="w-full border border-slate-200 focus:border-red-500 focus:bg-white outline-hidden rounded-xl p-3.5 text-xs font-medium transition-all bg-slate-50/60 text-slate-800" 
                    placeholder="e.g. +919876543210, +919123456789"
                    value={emergencyContacts}
                    onChange={(e) => setEmergencyContacts(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1.5">Duress Threat Mask PIN (4-Digit)</label>
                  <input 
                    type="password"
                    maxLength={4}
                    className="w-full border border-slate-200 focus:border-red-500 focus:bg-white outline-hidden rounded-xl p-3.5 text-xs font-medium tracking-widest transition-all bg-slate-50/60 text-slate-800" 
                    placeholder="••••"
                    value={distressPin}
                    onChange={(e) => setDistressPin(e.target.value)}
                  />
                  <p className="text-[11px] text-amber-700 font-medium mt-2 leading-relaxed">
                    Submission at login portals forces outward validation while secretly updating secondary background telemetry streams.
                  </p>
                </div>
              </div>

              {saveMessage && (
                <p className="text-xs text-red-600 font-bold text-center mt-2">{saveMessage}</p>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-3.5 font-semibold text-xs uppercase tracking-wider transition-all duration-150 shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {loading ? "Updating Node..." : "Commit Configurations"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}