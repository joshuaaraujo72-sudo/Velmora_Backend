import { prisma } from "./prisma.js";
import { productResponse } from "../utils/formatters.js";
import { httpError } from "../utils/httpError.js";

function cleanText(value) {
    const text = String(value || "").trim();
    return text || null;
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

function buildProductUpdate(data) {
    const updateData = {};

    if (data.name !== undefined) updateData.name = cleanText(data.name);
    if (data.category !== undefined) updateData.category = cleanText(data.category);
    if (data.price !== undefined) updateData.price = Number(data.price);
    if (data.stock !== undefined) updateData.stock = Number(data.stock);
    if (data.description !== undefined) updateData.description = cleanText(data.description);
    if (data.imageUrl !== undefined) updateData.imageUrl = cleanText(data.imageUrl);
    if (data.sizes !== undefined) updateData.sizes = normalizeArray(data.sizes);
    if (data.colors !== undefined) updateData.colors = normalizeArray(data.colors);

    if (updateData.price !== undefined && (!Number.isFinite(updateData.price) || updateData.price < 0)) {
        throw httpError(400, "El precio debe ser un numero valido");
    }

    if (
        updateData.stock !== undefined &&
        (!Number.isInteger(updateData.stock) || updateData.stock < 0)
    ) {
        throw httpError(400, "El stock debe ser un numero entero positivo");
    }

    if (updateData.name === null) {
        throw httpError(400, "El nombre del producto no puede estar vacio");
    }

    return updateData;
}

function toPriceFilter(value, fieldName) {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const price = Number(value);

    if (!Number.isFinite(price) || price < 0) {
        throw httpError(400, `${fieldName} debe ser un numero valido`);
    }

    return price;
}

async function findProductForOwner(productId, ownerId) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { store: true }
    });

    if (!product || !product.isActive) {
        throw httpError(404, "Producto no encontrado");
    }

    if (product.store.ownerId !== ownerId) {
        throw httpError(403, "No puedes modificar un producto que no te pertenece");
    }

    return product;
}

export async function listProducts({ category, search, minPrice, maxPrice } = {}) {
    const min = toPriceFilter(minPrice, "minPrice");
    const max = toPriceFilter(maxPrice, "maxPrice");

    if (min !== undefined && max !== undefined && min > max) {
        throw httpError(400, "minPrice no puede ser mayor que maxPrice");
    }

    const filters = [{ isActive: true }];

    if (category && category !== "Todas") {
        filters.push({
            OR: [
                { category },
                { store: { is: { category } } }
            ]
        });
    }

    if (min !== undefined || max !== undefined) {
        filters.push({
            price: {
                ...(min !== undefined ? { gte: min } : {}),
                ...(max !== undefined ? { lte: max } : {})
            }
        });
    }

    if (search) {
        filters.push({
            OR: [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } }
            ]
        });
    }

    const products = await prisma.product.findMany({
        where: { AND: filters },
        orderBy: { createdAt: "desc" },
        include: {
            store: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true
                }
            }
        }
    });

    return products.map(productResponse);
}

export async function getProductById(productId) {
    const product = await prisma.product.findFirst({
        where: {
            id: productId,
            isActive: true
        },
        include: {
            store: {
                select: {
                    id: true,
                    name: true,
                    logoUrl: true
                }
            }
        }
    });

    if (!product) {
        throw httpError(404, "Producto no encontrado");
    }

    return productResponse(product);
}

export async function updateProduct(ownerId, productId, data) {
    await findProductForOwner(productId, ownerId);

    const product = await prisma.product.update({
        where: { id: productId },
        data: buildProductUpdate(data)
    });

    return productResponse(product);
}

export async function deleteProduct(ownerId, productId) {
    await findProductForOwner(productId, ownerId);

    const product = await prisma.product.update({
        where: { id: productId },
        data: { isActive: false }
    });

    return productResponse(product);
}
