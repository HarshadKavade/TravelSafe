import api from "../utils/api";

export const getRoutes = async (
  start,
  destination
) => {
  const res = await api.post("/routes", {
    start,
    destination,
  });

  return res.data;
};