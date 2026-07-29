import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendWhatsApp = async (numbers, message) => {
  try {
    for (let num of numbers) {
      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:+91${num}`,
        body: message
      });
    }
  } catch (err) {
    console.log("WhatsApp error:", err.message);
  }
};