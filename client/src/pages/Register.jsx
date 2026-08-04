import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    distressPin: "",
    emergencyContacts: "",
  });

  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "password") {
      let score = 0;
      if (value.length > 5) score++;
      if (value.length > 9) score++;
      if (/[A-Z]/.test(value)) score++;
      if (/[0-9]/.test(value)) score++;
      setPasswordStrength(score);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        distressPin: formData.distressPin,
        emergencyContacts: formData.emergencyContacts
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });

      alert("Account created successfully");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const barColor =
    passwordStrength <= 1
      ? "bg-red-500"
      : passwordStrength === 2
      ? "bg-orange-500"
      : passwordStrength === 3
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    /* OUTER WRAPPER: Matches full-bleed light slate background layout */
    <div className="w-full max-w-none min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 px-4 m-0 p-0 overflow-x-hidden">

      {/* CARD: Clean white card panel matching your login card shadow mechanics */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 shadow-xl rounded-3xl p-8">

        {/* HEADER */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sahyatri
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create your safety account
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleRegister} className="space-y-4">

          {/* NAME */}
          <div>
            <label className="block mb-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Full Name
            </label>
            <input
              name="name"
              type="text"
              placeholder="John Doe"
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* EMAIL */}
          <div>
            <label className="block mb-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              placeholder="name@example.com"
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="block mb-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Password
            </label>
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />

            {/* STRENGTH BAR */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${barColor} transition-all duration-300`}
                style={{ width: `${passwordStrength * 25}%` }}
              />
            </div>
          </div>

          {/* DISTRESS PIN */}
          <div>
            <label className="block mb-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Distress PIN
            </label>
            <input
              name="distressPin"
              type="password"
              maxLength={4}
              placeholder="4-digit PIN"
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />
            <p className="text-[11px] text-red-500 font-medium mt-1.5 leading-relaxed">
              Used only for emergency silent SOS activation.
            </p>
          </div>

          {/* CONTACTS */}
          <div>
            <label className="block mb-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Emergency Contacts
            </label>
            <input
              name="emergencyContacts"
              type="text"
              placeholder="Comma separated numbers"
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition text-sm text-slate-900 placeholder-slate-400"
              required
            />
          </div>

          {/* BUTTON: Solid Black / Deep Slate Action styling */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 mt-2 rounded-xl transition text-sm shadow-md cursor-pointer disabled:bg-slate-300 disabled:text-slate-500"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* FOOTER: Custom red text for the directional Login toggle link */}
        <div className="text-center mt-6 text-sm text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-red-600 hover:underline font-semibold transition-colors">
            Login
          </Link>
        </div>

      </div>
    </div>
  );
}