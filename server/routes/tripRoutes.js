import express from "express";

import {
  createTrip,
  getMyTrips,
  startTrip,
  completeTrip,
} from "../controllers/tripController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createTrip);

router.get("/", protect, getMyTrips);

router.put("/:id/start", protect, startTrip);

router.put("/:id/complete", protect, completeTrip);

export default router;