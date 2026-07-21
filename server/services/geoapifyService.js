import axios from "axios";

const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY;
const BASE_URL = "https://api.geoapify.com/v2/places";

/**
 * Broad nearby places — general POI lookup (used for map display, etc.)
 */
export async function getNearbyPlaces(lat, lng, radius = 500) {
  if (typeof lat !== "number" || typeof lng !== "number") return [];

  const categories = [
    "service.police",
    "healthcare.hospital",
    "healthcare.pharmacy",
    "commercial.supermarket",
    "catering.restaurant",
    "catering.cafe",
    "parking",
    "accommodation.hotel",
  ].join(",");

  try {
    const res = await axios.get(BASE_URL, {
      params: {
        categories,
        filter: `circle:${lng},${lat},${radius}`,
        bias: `proximity:${lng},${lat}`,
        limit: 50,
        apiKey: GEOAPIFY_KEY,
      },
      timeout: 10000,
    });

    return res.data?.features || [];
  } catch (err) {
    console.log("getNearbyPlaces error:", err.response?.data || err.message);
    return [];
  }
}

/**
 * Safety-relevant lookup — POSITIVE factors (police, hospitals, pharmacies,
 * banks/ATMs — implies monitored/lit areas) and NEGATIVE factors
 * (bars, nightclubs, adult venues, casinos/gambling — correlated with
 * higher harassment/assault risk at night, per general urban safety research).
 *
 * Geoapify has no direct "crime" category, so this uses the closest
 * available proxies. It is NOT a substitute for real crime data —
 * see note at bottom of file for upgrading this later.
 */
export async function getNearbySafetyData(lat, lng, radius = 500) {
  if (typeof lat !== "number" || typeof lng !== "number") return [];

  const categories = [
    // positive
    "service.police",
    "healthcare.hospital",
    "healthcare.pharmacy",
    "service.financial.bank",
    "service.financial.atm",
    // negative
    "catering.bar",
    "catering.pub",
    "adult",
    "commercial.smoking",
  ].join(",");

  try {
    const res = await axios.get(BASE_URL, {
      params: {
        categories,
        filter: `circle:${lng},${lat},${radius}`,
        bias: `proximity:${lng},${lat}`,
        limit: 50,
        apiKey: GEOAPIFY_KEY,
      },
      timeout: 10000,
    });

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
    console.log(
      `getNearbySafetyData error for (${lat}, ${lng}):`,
      err.response?.data || err.message
    );
    return [];
  }
}

/*
 * NOTE on real crime data:
 * Geoapify/OSM have no "criminal incident" category — that data doesn't
 * exist in map POI sources, it lives in police/government open-data
 * portals. If your target city/country publishes one (e.g. data.gov.in,
 * data.police.uk, NYC Open Data), that's a separate fetch + a separate
 * scoring term, not something addable to this Places call. Worth
 * checking if your deployment region has one before launch.
 */