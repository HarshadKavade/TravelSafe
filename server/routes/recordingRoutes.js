import express from "express";

import upload from "../middleware/upload.js";

import {uploadRecording} from "../controllers/recordingController.js";

const router = express.Router();

router.post(
  "/upload",
  upload.single("audio"),
  uploadRecording
);

export default router;