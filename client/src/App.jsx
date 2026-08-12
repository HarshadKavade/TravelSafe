import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GuardianDashboard from "./pages/GuardianDashboard";
import TripPage from "./pages/TripPage"; // ✅ Import

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Guardian */}
          <Route
            path="/guardian"
            element={<GuardianDashboard />}
          />

          {/* Trip Planner */}
          <Route
            path="/trip"
            element={<TripPage />}
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}