import axios from "axios";

const QUEUE_KEY = "sahyatri_offline_sos_queue";

// Get all queued items
export const getQueuedAlerts = () => {
  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (err) {
    console.error("Failed to read offline queue:", err);
    return [];
  }
};

// Queue a new alert
export const queueOfflineAlert = async (location, tripId, audioBlob) => {
  const queue = getQueuedAlerts();
  
  let audioBase64 = null;
  if (audioBlob) {
    audioBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(audioBlob);
    });
  }

  const alertItem = {
    id: `offline_${Date.now()}`,
    location,
    tripId: tripId || null,
    audioBase64,
    createdAt: new Date().toISOString(),
  };

  queue.push(alertItem);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log("🚨 SOS Alert queued offline:", alertItem);
};

// Sync queue to server
export const syncOfflineQueue = async () => {
  const queue = getQueuedAlerts();
  if (queue.length === 0) return;

  const token = localStorage.getItem("token");
  if (!token) {
    console.log("Offline sync skipped: No authenticated user");
    return;
  }

  console.log(`📡 Syncing ${queue.length} offline SOS alerts...`);

  for (const item of queue) {
    try {
      // 1. Trigger SOS
      const sosRes = await axios.post(
        "http://localhost:5000/api/sos/trigger",
        {
          location: item.location,
          tripId: item.tripId,
          isOfflineSync: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const alertId = sosRes.data?.alert?._id;

      // 2. Upload audio if it exists and alert was created
      if (alertId && item.audioBase64) {
        // Convert base64 back to blob
        const response = await fetch(item.audioBase64);
        const audioBlob = await response.blob();

        const formData = new FormData();
        formData.append("audio", audioBlob);

        const uploadRes = await axios.post(
          "http://localhost:5000/api/recordings/upload",
          formData
        );

        const audioUrl = uploadRes.data.audioUrl;

        // Link audio to alert
        await axios.put(
          `http://localhost:5000/api/alerts/${alertId}/audio`,
          { audioUrl }
        );
        console.log(`🎤 Synced audio for alert ${alertId}`);
      }

      console.log(`✅ Synced offline alert ${item.id}`);
    } catch (err) {
      console.error(`Failed to sync offline alert ${item.id}:`, err.message);
      // Stop sync if server errors or has connectivity issues
      return;
    }
  }

  // Clear queue if fully synced
  localStorage.setItem(QUEUE_KEY, JSON.stringify([]));
  alert("✅ All pending offline SOS alerts synced successfully!");
};

// Register online/offline status listeners
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    console.log("🌐 Internet connection restored. Syncing queue...");
    syncOfflineQueue();
  });
}
