import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  distressPin: {
    type: String,
    default: null
  },

  emergencyContacts: [String],

  createdAt: {
    type: Date,
    default: Date.now
  }

});

export default mongoose.model(
  "User",
  userSchema
);