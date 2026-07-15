import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllEvents = async () => {
    return await prisma.event.findMany({
        orderBy: {
            startsAt: "asc"
        }
    });
};

export const deleteExistingEvent = async (id, creatorId) => {

    const event = await prisma.event.findUnique({
        where: {
            id: Number(id)
        }
    });

    if (!event) {
        throw new Error("Evento no encontrado.");
    }

    if (event.creatorId !== Number(creatorId)) {
        throw new Error("Solo el creador puede eliminar este evento.");
    }

    const today = new Date();

    if (event.startsAt > today) {
        throw new Error("Solo puedes eliminar eventos que ya finalizaron.");
    }

    return await prisma.event.delete({
        where: {
            id: Number(id)
        }
    });
};

export const createNewEvent = async (eventData) => {

    const user = await prisma.user.findUnique({
        where: {
            id: eventData.creatorId
        }
    });

    if (!user) {
        throw new Error("El usuario no existe.");
    }

    if (user.role !== "VENDEDOR") {
        throw new Error("Solo los vendedores pueden crear eventos.");
    }

    return await prisma.event.create({
        data: eventData
    });
};