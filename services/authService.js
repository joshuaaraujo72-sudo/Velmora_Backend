import { prisma } from "./prisma.js";
import { hashPassword, verifyPassword } from "./passwordService.js";
import { createToken } from "./tokenService.js";
import { publicUser } from "../utils/formatters.js";
import { httpError } from "../utils/httpError.js";

const validRoles = new Set(["BUYER", "SELLER"]);

function normalizeRole(role) {
    const value = String(role || "BUYER").toUpperCase();

    if (value === "COMPRADOR") {
        return "BUYER";
    }

    if (value === "VENDEDOR") {
        return "SELLER";
    }

    return validRoles.has(value) ? value : "BUYER";
}

export async function registerUser(data) {
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");
    const role = normalizeRole(data.role);

    if (!name || !email || !password) {
        throw httpError(400, "Nombre, correo y contrasena son obligatorios");
    }

    if (password.length < 6) {
        throw httpError(400, "La contrasena debe tener al menos 6 caracteres");
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        throw httpError(409, "Ya existe una cuenta con ese correo");
    }

    const user = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash: hashPassword(password),
            role
        }
    });

    return {
        user: publicUser(user),
        token: createToken(user)
    };
}

export async function loginUser(data) {
    const email = String(data.email || "").trim().toLowerCase();
    const password = String(data.password || "");

    if (!email || !password) {
        throw httpError(400, "Correo y contrasena son obligatorios");
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !verifyPassword(password, user.passwordHash)) {
        throw httpError(401, "Credenciales incorrectas");
    }

    return {
        user: publicUser(user),
        token: createToken(user)
    };
}
