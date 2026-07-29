import Alert from "../models/Alert.js";

/* =========================
   GET ALERTS
========================= */

export const getAlerts =
  async (req, res) => {

    try {

      const alerts =
        await Alert.find()
        .sort({ createdAt: -1 });

      res.json(alerts);

    } catch (err) {

      res.status(500).json({
        message: err.message
      });
    }
};

/* =========================
   UPDATE AUDIO URL
========================= */

export const updateAlertAudio =
  async (req, res) => {

    try {

      const { alertId } = req.params;

      const { audioUrl } = req.body;

      const updatedAlert =
        await Alert.findByIdAndUpdate(

          alertId,

          { audioUrl },

          { new: true }
        );

      res.json({
        success: true,
        alert: updatedAlert
      });

    } catch (err) {

      res.status(500).json({
        message: err.message
      });
    }
};