import axios from "axios";

const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY;
const BASE_URL = "https://api.geoapify.com/v2/places";

export async function getNearbySafetyData(lat, lng, radius = 500) {
  if (lat == null || lng == null) return [];

  // ✅ Police + Hospitals
  const categories = [
    "service.police",
    "healthcare.hospital",
  ].join(",");

  const url = `${BASE_URL}?categories=${categories}&filter=circle:${lng},${lat},${radius}&limit=30&apiKey=${GEOAPIFY_KEY}`;

  try {
    const res = await axios.get(url);

    const features = res.data?.features || [];

    return features.map((f) => {
      const p = f.properties || {};

      return {
        id: p.place_id,
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        categories: p.categories || [],
      };
    });
  } catch (err) {
    console.log("Geoapify error:", err.response?.data || err.message);
    return [];
  }
}