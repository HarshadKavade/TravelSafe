import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      
      {/* Glass background */}
      <nav className="backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
        
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* ================= LEFT LOGO ================= */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
          >
            <span className="text-xl">🛡️</span>
            <span className="text-slate-900">
              Sahyatri
            </span>
            <span className="ml-2 text-[10px] px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100 font-semibold">
              SAFE
            </span>
          </Link>

          {/* ================= NAV LINKS ================= */}
          <div className="hidden md:flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm">

            <Link
              to="/"
              className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
            >
              Home
            </Link>

            {user && (
              <>
                <Link
                  to="/trip"
                  className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
                >
                  Plan Trip
                </Link>

                <Link
                  to="/guardian"
                  className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
                >
                  Guardian
                </Link>

                <Link
                  to="/dashboard"
                  className="px-4 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition"
                >
                  Dashboard
                </Link>
              </>
            )}
          </div>

          {/* ================= RIGHT SECTION ================= */}
          <div className="flex items-center gap-3">

            {!user ? (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="text-sm font-semibold bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl shadow-md transition"
                >
                  Get Started
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-3">

                {/* USER AVATAR */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">

                  <div className="w-8 h-8 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <span className="text-sm font-semibold text-slate-700 hidden sm:inline">
                    {user.name}
                  </span>

                </div>

                {/* LOGOUT */}
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-slate-500 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
                >
                  Logout
                </button>

              </div>
            )}

          </div>
        </div>
      </nav>
    </header>
  );
}