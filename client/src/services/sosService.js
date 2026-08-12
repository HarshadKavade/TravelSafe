import axios from "axios";

export const triggerSOS = async (token) => {

  navigator.geolocation.getCurrentPosition(async (pos) => {

    const location = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude
    };

    try {

      const res = await axios.post(
        "http://localhost:5000/api/sos/trigger",
        { location },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log(res.data);

    } catch (err) {
      console.log(err);
    }
  });
};