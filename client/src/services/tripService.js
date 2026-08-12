import api from "../utils/api";

export const createTrip = async (tripData) => {
  const res = await api.post("/trips", tripData);
  return res.data;
};

export const getTrips = async () => {
  const res = await api.get("/trips");
  return res.data;
};

export const startTrip = async (id) => {
  const res = await api.put(`/trips/${id}/start`);
  return res.data;
};

export const completeTrip = async (id) => {
  const res = await api.put(`/trips/${id}/complete`);
  return res.data;
};