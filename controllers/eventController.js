import { createEvent, deleteEventById, getEventById, listEvents } from "../services/eventService.js";

export async function index(req, res, next) {
    try {
        const events = await listEvents(req.query);
        res.status(200).json({ events });
    } catch (error) {
        next(error);
    }
}

export async function show(req, res, next) {
    try {
        const event = await getEventById(req.params.id);
        res.status(200).json({ event });
    } catch (error) {
        next(error);
    }
}

export async function store(req, res, next) {
    try {
        const event = await createEvent(req.body);
        res.status(201).json({ event });
    } catch (error) {
        next(error);
    }
}

export async function destroy(req, res, next) {
    try {
        const event = await deleteEventById(req.params.id);
        res.status(200).json({ event });
    } catch (error) {
        next(error);
    }
}
