import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await login(
        formData.email,
        formData.password
      );

      alert(
        res?.distressMode
          ? "🚨 Silent SOS Triggered"
          : "Login Successful"
      );

      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Login Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    /* OUTER WRAPPER: Shifted from pitch black to full bleed light slate background */
    <div className="w-full max-w-none min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 px-4 m-0 p-0 overflow-x-hidden">

      {/* CARD: Crisp clean white card with subtle gray borders and depth shadows */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 shadow-xl rounded-3xl p-8">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sahyatri
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Secure login to your safety system
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleLogin} className="space-y-4">

          {/* EMAIL */}
          <div>
            <label className="block mb-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email address"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* PASSWORD / DISTRESS PIN */}
          <div>
            <label className="block mb-2 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Password / Distress PIN
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 mt-2 rounded-xl transition text-sm shadow-md cursor-pointer disabled:bg-slate-300 disabled:text-slate-500"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        {/* FOOTER */}
        <div className="text-center mt-6 text-sm text-slate-500">
          Don’t have an account?{" "}
          <Link to="/register" className="text-red-600 hover:underline font-medium">
            Create Account
          </Link>
        </div>

      </div>
    </div>
  );
}