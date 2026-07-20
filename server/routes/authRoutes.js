import express from "express";
import { register, login, updateProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js"; // Ensure this matches your exact auth middleware file name

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Added profile update route locked behind your authorization protection layer
router.put("/profile", protect, updateProfile);

export default router;