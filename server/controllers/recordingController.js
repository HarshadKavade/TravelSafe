import cloudinary
from "../config/cloudinary.js";

export const uploadRecording =
  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          message: "No audio file uploaded"
        });
      }

      // convert buffer to base64
      const file =
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      // upload to cloudinary
      const result =
        await cloudinary.uploader.upload(
          file,
          {
            resource_type: "video",
            folder: "sahyatri-recordings"
          }
        );

      res.json({
        success: true,
        audioUrl: result.secure_url
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        message: err.message
      });
    }
};