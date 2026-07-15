import { prisma } from "./prisma.js";
import { httpError } from "../utils/httpError.js";

function cleanText(value) {
    const text = String(value || "").trim();
    return text || null;
}

function eventResponse(event) {
    return {
        ...event,
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt.toISOString()
    };
}

export async function listEvents({ featured } = {}) {
    const events = await prisma.event.findMany({
        where: {
            ...(featured === "true" ? { isFeatured: true } : {})
        },
        orderBy: { startsAt: "asc" }
    });

    return events.map(eventResponse);
}

export async function getEventById(id) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
        throw httpError(404, "Evento no encontrado");
    }

    return eventResponse(event);
}

export async function createEvent(data) {
    const title = cleanText(data.title || data.titulo);
    const description = cleanText(data.description || data.descripcion);
    const startsAt = new Date(data.startsAt || data.fechaInicio);
    const endsAt = new Date(data.endsAt || data.fechaFin || data.startsAt || data.fechaInicio);

    if (!title || !description || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        throw httpError(400, "Titulo, descripcion y fechas validas son obligatorias");
    }

    const event = await prisma.event.create({
        data: {
            title,
            description,
            type: cleanText(data.type || data.tipo) || "EVENTO",
            storeName: cleanText(data.storeName || data.tienda),
            imageUrl: cleanText(data.imageUrl || data.imagen),
            startsAt,
            endsAt,
            isFeatured: Boolean(data.isFeatured)
        }
    });

    return eventResponse(event);
}

export async function deleteEventById(id) {
    await getEventById(id);

    const event = await prisma.event.delete({
        where: { id }
    });

    return eventResponse(event);
}
