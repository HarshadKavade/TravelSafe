import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";

import tripRoutes from "./routes/tripRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import sosRoutes from "./routes/sosRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import recordingRoutes from "./routes/recordingRoutes.js";
dotenv.config();

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/recordings",recordingRoutes);
connectDB();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});