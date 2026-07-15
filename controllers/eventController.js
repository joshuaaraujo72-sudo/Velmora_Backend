import {
    getAllEvents,
    createNewEvent,
    deleteExistingEvent
} from "../services/eventService.js";

export const getEvents = async (req, res) => {
    try {
        const events = await getAllEvents();

        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

export const createEvent = async (req, res) => {
    try {
        const event = await createNewEvent(req.body);

        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const result = await deleteExistingEvent(
            req.params.id,
            req.body.creatorId
        );
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};