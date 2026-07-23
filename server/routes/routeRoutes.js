import express from "express";
import {
  getRoutes,
  getSafeRoutes
} from "../controllers/routeController.js";

const router = express.Router();

router.post("/", getRoutes);

router.post("/safe", getSafeRoutes);

export default router;