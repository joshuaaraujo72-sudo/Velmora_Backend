import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createNewUser = async (userData) => {
    return await prisma.user.create({
        data: userData
    });
};

export const getAllUsers = async () => {
    return await prisma.user.findMany();
};