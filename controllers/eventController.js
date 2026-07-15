import { listEvents } from "../services/eventService.js";

export const getEvents = async (req, res) => {
  try {
    const events = await listEvents();
    return res.status(200).json(events);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los eventos" });
  }
};
