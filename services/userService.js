import { prisma } from "./prisma.js";
import { registerUser } from "./authService.js";
import { publicUser } from "../utils/formatters.js";

export async function createNewUser(userData) {
    return registerUser(userData);
}

export async function getAllUsers() {
    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" }
    });

    return users.map(publicUser);
}
