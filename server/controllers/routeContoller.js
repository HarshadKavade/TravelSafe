import { getRoutesFromORS } from "../services/routeService.js";
import { calculateSafetyScore } from "../utils/calculateScore.js";

/* =========================
   BASIC ORS ROUTES (no scoring)
========================= */
export const getRoutes = async (req, res) => {
  try {
    const { start, end, mode } = req.body;

    const routes = await getRoutesFromORS(start, end, mode);

    console.log("Routes Found:", routes.length);

    res.json({
      success: true,
      total: routes.length,
      routes,
    });
  } catch (err) {
    console.log("getRoutes error:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch routes",
    });
  }
};

/* =========================
   SAFE ROUTES WITH SCORING
========================= */
export const getSafeRoutes = async (req, res) => {
  try {
    const { start, end, mode } = req.body;

    const routes = await getRoutesFromORS(start, end, mode);

    console.log("Routes Found:", routes.length);

    const scoredRoutes = await Promise.all(
      routes.map(async (route, index) => {
        // ORS gives [lng, lat] → convert to [lat, lng]
        const coordinates = route.geometry.coordinates.map(
          ([lng, lat]) => [lat, lng]
        );

        const result = await calculateSafetyScore({ coordinates });

        return {
          id: route.id ?? index,
          geometry: route.geometry,
          summary: route.summary,

          distance: route.distance,
          duration: route.duration,

          score: result.totalScore,
          breakdown: result.breakdown,
        };
      })
    );

    // Sort safest first
    scoredRoutes.sort((a, b) => b.score - a.score);

    const safestRoute = scoredRoutes[0] || null;

    res.json({
      success: true,
      safest: safestRoute,
      allRoutes: scoredRoutes,
    });
  } catch (err) {
    console.log("Safe Route Error:", err.message);

    res.status(500).json({
      success: false,
      message: "Failed to calculate safe routes",
    });
  }
};