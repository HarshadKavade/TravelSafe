import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({

  userId: String,

  name: String,

  location: {
    lat: Number,
    lng: Number
  },

  tripId: String,

  audioUrl: String,

  isOfflineSync: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

export default mongoose.model(
  "Alert",
  alertSchema
);