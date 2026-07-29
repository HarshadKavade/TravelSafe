import User from "../models/User.js";
import Alert from "../models/Alert.js";

import { io } from "../server.js";

import { sendWhatsApp } from "../utils/sendWhatsApp.js";

export const triggerSOS = async (req, res) => {

  try {

    /* =========================
       AUTH USER
    ========================= */

    const userId = req.user.id;

    /* =========================
       REQUEST DATA
    ========================= */

    const {
      location,
      tripId,
      audioUrl,
      isOfflineSync
    } = req.body;

    /* =========================
       VALIDATION
    ========================= */

    if (
      !location ||
      !location.lat ||
      !location.lng
    ) {
      return res.status(400).json({
        success: false,
        message: "Location is required"
      });
    }

    /* =========================
       GET USER
    ========================= */

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    /* =========================
       CREATE ALERT OBJECT
    ========================= */

    const emergency = {

      userId,

      name: user.name,

      location: {
        lat: location.lat,
        lng: location.lng
      },

      tripId: tripId || null,

      audioUrl: audioUrl || null,

      isOfflineSync:
        isOfflineSync || false,

      createdAt: new Date()
    };

    /* =========================
       SAVE ALERT
    ========================= */

    const savedAlert =
      await Alert.create(emergency);

    /* =========================
       GOOGLE MAP LINK
    ========================= */

    const mapLink =
      `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    /* =========================
       GUARDIAN DASHBOARD LINK
    ========================= */

    const dashboardLink =
      "http://localhost:5173/guardian";

    /* =========================
       WHATSAPP MESSAGE
    ========================= */

    const message = `
🚨 SAHYATRI SOS ALERT 🚨

${user.name} may be in danger.

📍 Live Location:
${mapLink}

🕒 Time:
${new Date().toLocaleString()}

🚕 Trip ID:
${tripId || "N/A"}

🛰️ Guardian Dashboard:
${dashboardLink}

⚠️ Immediate attention required.
`;

    /* =========================
       SEND WHATSAPP ALERTS
    ========================= */

    await sendWhatsApp(
      user.emergencyContacts,
      message
    );

    /* =========================
       REALTIME SOCKET ALERT
    ========================= */

    io.emit("emergency-triggered", {
      type: "SOS_ALERT",
      alert: savedAlert
    });

    /* =========================
       RESPONSE
    ========================= */

    res.status(200).json({

      success: true,

      message:
        "SOS triggered successfully",

      alert: savedAlert
    });

  } catch (err) {

    console.log("SOS ERROR:", err);

    res.status(500).json({

      success: false,

      message: err.message
    });
  }
};