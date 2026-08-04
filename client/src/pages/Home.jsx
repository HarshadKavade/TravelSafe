import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";

/* ─── Animated counter ─── */
function Counter({ to, suffix = "", duration = 2 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / (duration * 1000), 1);
      setVal(Math.floor(p * to));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, to, duration]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── Score ring (SVG) ─── */
function ScoreRing({ score, label, color }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <motion.circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.4 }}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="49" textAnchor="middle" fill="#0f172a" fontSize="14" fontWeight="800">
          {score}%
        </text>
      </svg>
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── Route card mock ─── */
function RouteCard({ label, score, km, min, recommended }) {
  const color = score >= 80 ? "#16a34a" : score >= 55 ? "#d97706" : "#dc2626";
  const bg = score >= 80 ? "bg-green-50 border-green-200" : score >= 55 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
        recommended ? "bg-red-50 border-red-200 shadow-sm" : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
        <div>
          <p className="text-xs font-bold text-slate-800">
            {label}
            {recommended && (
              <span className="ml-2 text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                Best
              </span>
            )}
          </p>
          <p className="text-[10px] text-slate-400">{km} km · {min} min</p>
        </div>
      </div>
      <div className="text-xs font-black" style={{ color }}>{score}%</div>
    </motion.div>
  );
}

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-sans">
      <Navbar />

      {/* ══════════════════════════════════════
          HERO
      ══════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-white"
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(220,38,38,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(220,38,38,0.035) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* Soft red glow top-center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-red-100/80 blur-[100px] pointer-events-none" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-5xl w-full flex flex-col items-center text-center"
        >
          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-red-50 border border-red-200 mb-10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-xs font-semibold tracking-[0.18em] uppercase text-red-600">
              Live Protection Active
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[84px] font-black leading-[1.0] tracking-[-0.03em] mb-6 text-slate-900"
          >
            Every route,
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #dc2626 0%, #ea580c 60%, #dc2626 100%)",
              }}
            >
              scored for safety.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="text-slate-500 text-lg md:text-xl max-w-2xl leading-relaxed mb-12"
          >
            Sahyatri analyses police presence, hospitals, and risk zones along
            every possible path — then picks the one most likely to get you home safe.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.38 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              to="/trip"
              className="group relative px-10 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-base transition-all duration-300 shadow-[0_8px_30px_rgba(220,38,38,0.3)] hover:shadow-[0_12px_40px_rgba(220,38,38,0.45)] overflow-hidden"
            >
              <span className="relative z-10">Plan Safe Route →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </Link>
            <Link
              to="/dashboard"
              className="px-10 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold text-base transition-all duration-300 shadow-sm"
            >
              Emergency Dashboard
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-slate-400 to-transparent" />
        </motion.div>
      </section>

      {/* ══════════════════════════════════════
          ROUTE SCORING MOCK — signature element
      ══════════════════════════════════════ */}
      <section className="px-6 py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
              See it in action
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              Two routes. One clear winner.
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-[1.75rem] overflow-hidden border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.07)]"
          >
            {/* Window bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-3 text-[11px] text-slate-400 font-mono">
                sahyatri — route scoring engine
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-0">
              {/* Left: route list + breakdown */}
              <div className="p-8 border-r border-slate-100 space-y-4">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-5">
                  Routes found — 2 alternatives
                </p>
                <RouteCard label="Route A" score={84} km="3.2" min="12" recommended />
                <RouteCard label="Route B" score={51} km="2.9" min="9" />

                <div className="pt-5 border-t border-slate-100 space-y-2.5">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                    Route A breakdown
                  </p>
                  {[
                    ["🚓 Police stations", "2 within 500m", "#16a34a"],
                    ["🏥 Hospitals", "1 within 500m", "#2563eb"],
                    ["🍺 Bars nearby", "0", "#16a34a"],
                    ["🔞 Adult venues", "0", "#16a34a"],
                  ].map(([label, val, color], i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-bold" style={{ color }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: score rings */}
              <div className="p-8 flex flex-col items-center justify-center gap-8 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
                  Safety scores
                </p>
                <div className="flex gap-10 flex-wrap justify-center">
                  <ScoreRing score={84} label="Route A" color="#16a34a" />
                  <ScoreRing score={51} label="Route B" color="#d97706" />
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="w-full bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-center"
                >
                  <p className="text-green-700 text-sm font-bold">
                    ✓ Route A recommended — 65% safer
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS ROW
      ══════════════════════════════════════ */}
      <section className="px-6 py-16 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 50000, suffix: "+", label: "Routes scored" },
            { value: 99, suffix: "%", label: "Uptime" },
            { value: 3, suffix: "s", label: "Avg score time" },
            { value: 12, suffix: "", label: "Safety signals" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-3xl md:text-4xl font-black text-slate-900 tabular-nums">
                <Counter to={s.value} suffix={s.suffix} />
              </span>
              <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section className="px-6 py-28 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-4">
              How it protects you
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
              Built around real risk,
              <br />
              not assumptions.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: "🧭",
                title: "Safety-scored routing",
                body: "Every route is scored against live POI data — police stations add points, bars and isolated zones subtract them. You see the number, not a vague colour.",
                accent: "#dc2626",
              },
              {
                icon: "🚨",
                title: "Silent SOS",
                body: "One tap triggers an alert with your GPS location, trip ID, and auto-recorded audio — without opening a visible alarm that could escalate a situation.",
                accent: "#ea580c",
              },
              {
                icon: "📡",
                title: "Live deviation alerts",
                body: "Leave your planned route by more than your set threshold and your guardians are notified automatically. You control the sensitivity.",
                accent: "#2563eb",
              },
              {
                icon: "📴",
                title: "Offline-first SOS",
                body: "No signal? SOS is queued locally with your last known GPS coordinates and audio evidence, then synced the moment connection returns.",
                accent: "#7c3aed",
              },
              {
                icon: "⏱",
                title: "Periodic check-ins",
                body: "A countdown timer prompts you to confirm you're safe at intervals you choose. Miss the window and your guardians are alerted immediately.",
                accent: "#16a34a",
              },
              {
                icon: "🗺️",
                title: "Multi-route comparison",
                body: "See every available route scored side by side, not just the fastest. Pick the path that trades two minutes for a significantly safer corridor.",
                accent: "#d97706",
              },
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4 }}
                className="p-7 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-5 border"
                  style={{
                    background: `${f.accent}10`,
                    borderColor: `${f.accent}20`,
                  }}
                >
                  {f.icon}
                </div>
                <h3 className="text-base font-black text-slate-900 mb-2.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section className="px-6 py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-3">
              The flow
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              From address to safest path in seconds
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-4 relative">
            {/* Connector line desktop */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-red-200 to-transparent" />

            {[
              { step: "01", label: "Enter start & destination", icon: "📍" },
              { step: "02", label: "ORS returns 2 route options", icon: "🗺️" },
              { step: "03", label: "Geoapify scores each path", icon: "🔬" },
              { step: "04", label: "You see scores, pick your route", icon: "✅" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center text-center gap-3 relative z-10"
              >
                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-3xl shadow-sm">
                  {s.icon}
                </div>
                <span className="text-[10px] font-black text-red-500 tracking-widest">
                  {s.step}
                </span>
                <p className="text-sm font-semibold text-slate-600 leading-snug max-w-[140px]">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA
      ══════════════════════════════════════ */}
    <section className="px-6 py-28 bg-white">
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="max-w-5xl mx-auto"
  >
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-slate-950 to-black px-8 py-16 md:px-16 md:py-24">
      
      {/* Ambient red glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[28rem] w-[28rem] rounded-full bg-red-600/20 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        
        {/* Shield */}
        <div className="relative mb-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-red-600/40 blur-xl"
          />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-red-700/50 bg-red-600/20 text-4xl">
            🛡️
          </div>
        </div>

        <h2 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          The safest route is the{" "}
          <span className="block bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            one you know about.
          </span>
        </h2>

        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
          Sign up free. No credit card required. Start scoring routes in under
          a minute.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
          <Link
            to="/register"
            className="group relative overflow-hidden rounded-2xl bg-white px-10 py-4 text-base font-black text-slate-900 shadow-lg transition-all duration-300 hover:bg-slate-50"
          >
            <span className="relative z-10">Get Started Free</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-red-50/50 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Link>

          <Link
            to="/trip"
            className="rounded-2xl border border-white/15 px-10 py-4 text-base font-bold text-white/80 transition-all duration-300 hover:border-white/30 hover:text-white"
          >
            Try without signing up
          </Link>
        </div>

      </div>
    </div>
  </motion.div>
</section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-100 py-10 px-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <span className="font-bold text-slate-500">Sahyatri © 2026</span>
        <span>Built for women's safety · Powered by OpenRouteService + Geoapify</span>
        <div className="flex gap-5">
          <Link to="/trip" className="hover:text-slate-600 transition-colors">Plan Route</Link>
          <Link to="/dashboard" className="hover:text-slate-600 transition-colors">Dashboard</Link>
          <Link to="/register" className="hover:text-slate-600 transition-colors">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}