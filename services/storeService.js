import { prisma } from "./prisma.js";
import { productResponse, storeResponse } from "../utils/formatters.js";
import { httpError } from "../utils/httpError.js";

function cleanText(value) {
    const text = String(value || "").trim();
    return text || null;
}

function normalizePrice(value) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        throw httpError(400, "El precio debe ser un numero valido");
    }

    return number;
}

function normalizeStock(value) {
    const number = Number(value || 0);

    if (!Number.isInteger(number) || number < 0) {
        throw httpError(400, "El stock debe ser un numero entero positivo");
    }

    return number;
}

function normalizeArray(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        return value.split(",").map((item) => item.trim()).filter(Boolean);
    }

    return [];
}

function productData(data) {
    const name = cleanText(data.name);

    if (!name) {
        throw httpError(400, "El nombre del producto es obligatorio");
    }

    return {
        name,
        category: cleanText(data.category),
        price: normalizePrice(data.price),
        stock: normalizeStock(data.stock),
        description: cleanText(data.description),
        imageUrl: cleanText(data.imageUrl),
        sizes: normalizeArray(data.sizes),
        colors: normalizeArray(data.colors)
    };
}

export async function listStores({ category, search } = {}) {
    const where = {
        status: "ACTIVE",
        ...(category ? { category } : {}),
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                    { category: { contains: search, mode: "insensitive" } }
                ]
            }
            : {})
    };

    const stores = await prisma.store.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
            products: {
                where: { isActive: true },
                orderBy: { createdAt: "desc" },
                take: 3
            },
            _count: {
                select: { products: true }
            }
        }
    });

    return stores.map((store) => ({
        ...storeResponse(store),
        productCount: store._count.products
    }));
}

export async function getStoreById(id) {
    const store = await prisma.store.findFirst({
        where: {
            id,
            status: "ACTIVE"
        },
        include: {
            owner: {
                select: { id: true, name: true }
            },
            products: {
                where: { isActive: true },
                orderBy: { createdAt: "desc" }
            }
        }
    });

    if (!store) {
        throw httpError(404, "Tienda no encontrada");
    }

    return storeResponse(store);
}

export async function createStore(ownerId, data) {
    const name = cleanText(data.name);

    if (!name) {
        throw httpError(400, "El nombre de la tienda es obligatorio");
    }

    const existingStore = await prisma.store.findUnique({ where: { ownerId } });

    if (existingStore) {
        throw httpError(409, "Este vendedor ya tiene una tienda registrada");
    }

    const store = await prisma.store.create({
        data: {
            ownerId,
            name,
            description: cleanText(data.description),
            category: cleanText(data.category),
            storeType: cleanText(data.storeType),
            logoUrl: cleanText(data.logoUrl),
            bannerUrl: cleanText(data.bannerUrl),
            website: cleanText(data.website),
            instagram: cleanText(data.instagram),
            phone: cleanText(data.phone),
            address: cleanText(data.address)
        }
    });

    return storeResponse(store);
}

export async function updateStore(ownerId, storeId, data) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });

    if (!store) {
        throw httpError(404, "Tienda no encontrada");
    }

    if (store.ownerId !== ownerId) {
        throw httpError(403, "No puedes editar una tienda que no te pertenece");
    }

    const updatedStore = await prisma.store.update({
        where: { id: storeId },
        data: {
            name: cleanText(data.name) || store.name,
            description: cleanText(data.description),
            category: cleanText(data.category),
            storeType: cleanText(data.storeType),
            logoUrl: cleanText(data.logoUrl),
            bannerUrl: cleanText(data.bannerUrl),
            website: cleanText(data.website),
            instagram: cleanText(data.instagram),
            phone: cleanText(data.phone),
            address: cleanText(data.address)
        }
    });

    return storeResponse(updatedStore);
}

export async function listStoreProducts(storeId) {
    const products = await prisma.product.findMany({
        where: {
            storeId,
            isActive: true
        },
        orderBy: { createdAt: "desc" }
    });

    return products.map(productResponse);
}

export async function createProduct(ownerId, storeId, data) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });

    if (!store) {
        throw httpError(404, "Tienda no encontrada");
    }

    if (store.ownerId !== ownerId) {
        throw httpError(403, "No puedes crear productos en una tienda que no te pertenece");
    }

    const product = await prisma.product.create({
        data: {
            storeId,
            ...productData(data)
        }
    });

    return productResponse(product);
}

export async function registerStoreMetric(storeId, type = "STORE_VIEW") {
    const store = await prisma.store.findUnique({ where: { id: storeId } });

    if (!store) {
        throw httpError(404, "Tienda no encontrada");
    }

    const metric = await prisma.storeMetric.create({
        data: {
            storeId,
            type,
            value: 1
        }
    });

    return metric;
}
