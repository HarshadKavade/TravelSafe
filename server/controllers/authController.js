import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {

  try {

    const {
      name,
      email,
      password,
      distressPin,
      emergencyContacts
    } = req.body;

    const existingUser =
      await User.findOne({ email });

    if (existingUser) {

      return res.status(400).json({
        message: "User already exists"
      });
    }

    /* =========================
       HASH PASSWORDS
    ========================= */

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );

    const hashedDistressPin =
      distressPin
        ? await bcrypt.hash(
            distressPin,
            10
          )
        : null;

    /* =========================
       CREATE USER
    ========================= */

    const user =
      await User.create({

        name,

        email,

        password:
          hashedPassword,

        distressPin:
          hashedDistressPin,

        emergencyContacts

      });

    res.status(201).json({

      message:
        "User registered successfully",

      userId:
        user._id

    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};

export const login = async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    /* =========================
       FIND USER
    ========================= */

    const user =
      await User.findOne({
        email
      });

    if (!user) {

      return res.status(404).json({
        message:
          "User not found"
      });
    }

    /* =========================
       NORMAL PASSWORD CHECK
    ========================= */

    const isPasswordValid =
      await bcrypt.compare(
        password,
        user.password
      );

    /* =========================
       DISTRESS PIN CHECK
    ========================= */

    const isDistressPin =
      user.distressPin
        ? await bcrypt.compare(
            password,
            user.distressPin
          )
        : false;

    /* =========================
       INVALID LOGIN
    ========================= */

    if (
      !isPasswordValid &&
      !isDistressPin
    ) {

      return res.status(400).json({
        message:
          "Invalid credentials"
      });
    }

    /* =========================
       JWT TOKEN
    ========================= */

    const token = jwt.sign(

      {
        id: user._id
      },

      process.env.JWT_SECRET,

      {
        expiresIn: "7d"
      }
    );

    /* =========================
       DISTRESS LOGIN
    ========================= */

    if (isDistressPin) {

      console.log(
        "🚨 DISTRESS LOGIN DETECTED"
      );

      // Future:
      // Trigger SOS
      // Notify Guardians
      // Start Tracking
    }

    /* =========================
       RESPONSE
    ========================= */

    res.json({

      message:
        isDistressPin
          ? "Distress Login Successful"
          : "Login Successful",

      distressMode:
        isDistressPin,

      token,

      user

    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });
  }
};

/* ======================================================================
   ADD NEW ENDPOINT ROUTE HANDLER: UPDATE PROFILE
====================================================================== */
export const updateProfile = async (req, res) => {
  try {
    // req.user.id or req.user._id comes from your authentication middleware layer
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ message: "Not authorized, missing token context" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User profile not found" });
    }

    // Safely update specific primitive fields if they exist in request body
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    // Explicit check and mutation assignment for the emergency contacts array
    if (req.body.emergencyContacts) {
      user.emergencyContacts = req.body.emergencyContacts;
    }

    // Safely hash the distress PIN if a new one is provided
    if (req.body.distressPin) {
      user.distressPin = await bcrypt.hash(req.body.distressPin, 10);
    }

    const updatedUser = await user.save();

    // Send the fresh updated user document straight back to the client
    res.json(updatedUser);

  } catch (err) {
    res.status(500).json({
      message: `Error updating profile data: ${err.message}`
    });
  }
};