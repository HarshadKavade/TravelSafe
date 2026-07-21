import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/db.js";

import tripRoutes from "./routes/tripRoutes.js";
import authRoutes from "./routes/authRoutes.js";


dotenv.config();

const app = express();

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());
app.use(express.json());

/* =========================
   ROUTES
========================= */

app.use("/api/auth", authRoutes);

app.use("/api/trips", tripRoutes);
/* =========================
   DATABASE
========================= */

connectDB();

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});