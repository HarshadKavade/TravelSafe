import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    start: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      address: String,
    },

    destination: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
      address: String,
    },

    route: {
      type: Object,
      default: null,
    },

    distanceKm: {
      type: Number,
      default: null,
    },

    durationMin: {
      type: Number,
      default: null,
    },

    safetyScore: {
      type: Number,
      default: 0,
    },

    safetyBreakdown: {
      type: Object,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "planned",
        "active",
        "completed",
        "cancelled",
      ],
      default: "planned",
    },

    startedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Trip", tripSchema);