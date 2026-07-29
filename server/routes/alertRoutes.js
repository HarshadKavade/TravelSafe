import express from "express";

import {
  getAlerts,
  updateAlertAudio
}
from "../controllers/alertController.js";

const router = express.Router();

/* =========================
   GET ALERTS
========================= */

router.get("/", getAlerts);

/* =========================
   UPDATE AUDIO URL
========================= */

router.put(
  "/:alertId/audio",
  updateAlertAudio
);

export default router;