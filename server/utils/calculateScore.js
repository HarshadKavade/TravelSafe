import { getNearbySafetyData } from "../services/geoapifyService.js";

const POSITIVE_CATEGORIES = {
  "service.police": { key: "policeStations", weight: 8 },
  "healthcare.hospital": { key: "hospitals", weight: 5 },
  "healthcare.pharmacy": { key: "pharmacies", weight: 2 },
  "service.financial.bank": { key: "banks", weight: 1.5 },
  "service.financial.atm": { key: "atms", weight: 1 },
};

const NEGATIVE_CATEGORIES = {
  "catering.bar": { key: "bars", weight: -3 },
  "catering.pub": { key: "pubs", weight: -2 },
  "adult": { key: "adultVenues", weight: -6 },
  "commercial.smoking": { key: "smokingShops", weight: -1 },
};

/**
 * Route safety score based on nearby positive (police, hospitals,
 * pharmacies, banks/ATMs) and negative (bars, pubs, adult venues,
 * smoking shops) POI presence.
 * route.coordinates expected as [[lat, lng], ...]
 */
export const calculateSafetyScore = async (route) => {
  try {
    const coords = route.coordinates || [];

    if (!coords.length) {
      return {
        totalScore: 50,
        breakdown: { note: "no coordinates" },
      };
    }

    // adaptive sampling: dense enough for short routes, capped for long ones
    const step = Math.max(1, Math.floor(coords.length / 10));
    const samplePoints = coords.filter((_, i) => i % step === 0);

    const allData = await Promise.all(
      samplePoints.map(async ([lat, lng]) => {
        try {
          return await getNearbySafetyData(lat, lng);
        } catch {
          return [];
        }
      })
    );

    const merged = allData.flat();

    const unique = new Map();
    merged.forEach((p) => {
      const key = p.id ?? `${p.lat}_${p.lon}`;
      unique.set(key, p);
    });

    // init counts for every tracked category
    const counts = {};
    Object.values(POSITIVE_CATEGORIES).forEach((c) => (counts[c.key] = 0));
    Object.values(NEGATIVE_CATEGORIES).forEach((c) => (counts[c.key] = 0));

    let rawScore = 0;

    unique.forEach((p) => {
      const cats = p.categories || [];

      cats.forEach((cat) => {
        if (POSITIVE_CATEGORIES[cat]) {
          const { key, weight } = POSITIVE_CATEGORIES[cat];
          counts[key]++;
          rawScore += weight;
        }
        if (NEGATIVE_CATEGORIES[cat]) {
          const { key, weight } = NEGATIVE_CATEGORIES[cat];
          counts[key]++;
          rawScore += weight; // weight is already negative
        }
      });
    });

    // bound to 0–100, centered at neutral 50
    const totalScore = Math.max(0, Math.min(100, Math.round(50 + rawScore)));

    return {
      totalScore,
      breakdown: {
        ...counts,
        totalPOIs: unique.size,
        pointsSampled: samplePoints.length,
        rawScore,
      },
    };
  } catch (err) {
    return {
      totalScore: 50,
      breakdown: { error: err.message, fallback: true },
    };
  }
};