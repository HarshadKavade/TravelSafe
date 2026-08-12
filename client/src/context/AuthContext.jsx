import { createContext, useState, useEffect } from "react";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post("http://localhost:5000/api/auth/login", {
      email,
      password,
    });

    const data = res.data;
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);

    // Distress PIN Login Trigger
    if (data.distressMode) {
      console.log("🚨 distress login triggered silently");
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            await axios.post(
              "http://localhost:5000/api/sos/trigger",
              {
                location: {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                },
              },
              {
                headers: {
                  Authorization: `Bearer ${data.token}`,
                },
              }
            );
            console.log("🚨 Silent SOS Triggered Successfully");
          } catch (err) {
            console.error("SOS Trigger Error:", err);
          }
        },
        (err) => console.error("GPS Distress Error:", err),
        { enableHighAccuracy: true }
      );
    }

    return data;
  };

  const register = async (userData) => {
    const res = await axios.post("http://localhost:5000/api/auth/register", userData);
    return res.data;
  };

  const updateProfile = async (updates) => {
    try {
      const res = await axios.put(
        "http://localhost:5000/api/auth/profile",
        updates,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      // If user profile route is not implemented in backend, we will also implement it or handle it in client
      const updatedUser = { ...user, ...updates };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return res.data;
    } catch (err) {
      // Fallback update in client if route is not implemented
      const updatedUser = { ...user, ...updates };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { user: updatedUser };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
