import { prisma } from "../services/prisma.js";
import { verifyToken } from "../services/tokenService.js";
import { httpError } from "../utils/httpError.js";

export async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;
        const payload = verifyToken(token);

        if (!payload) {
            throw httpError(401, "Debes iniciar sesion");
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        if (!user) {
            throw httpError(401, "Usuario no encontrado");
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

export function requireSeller(req, res, next) {
    if (req.user?.role !== "SELLER") {
        next(httpError(403, "Solo una cuenta de vendedor puede realizar esta accion"));
        return;
    }

    next();
}
