import { prisma } from "./prisma.js";
import { httpError } from "../utils/httpError.js";

function cleanText(value) {
    const text = String(value || "").trim();
    return text || null;
}

export async function listDiscounts({ category } = {}) {
    return prisma.discount.findMany({
        where: {
            isActive: true,
            ...(category && category !== "Todos" ? { category } : {})
        },
        orderBy: { createdAt: "desc" }
    });
}

export async function createDiscount(data) {
    const storeName = cleanText(data.storeName);
    const title = cleanText(data.title);
    const description = cleanText(data.description);
    const category = cleanText(data.category);

    if (!storeName || !title || !description || !category) {
        throw httpError(400, "Tienda, titulo, descripcion y categoria son obligatorios");
    }

    return prisma.discount.create({
        data: {
            storeName,
            title,
            description,
            category,
            validUntil: cleanText(data.validUntil),
            imageUrl: cleanText(data.imageUrl),
            storeUrl: cleanText(data.storeUrl)
        }
    });
}
