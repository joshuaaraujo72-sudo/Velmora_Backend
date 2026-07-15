import express from "express";
import {
  getEvents,
  createEvent,
  deleteEvent,
} from "../controllers/eventController.js";

const router = express.Router();

// Obtener todos los eventos
router.get("/", getEvents);

// Registrar un evento
router.post("/", createEvent);

// Eliminar un evento
router.delete("/:id", deleteEvent);

export default router;