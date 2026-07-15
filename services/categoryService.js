import { prisma } from "./prisma.js";
import { httpError } from "../utils/httpError.js";

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

function addCount(counts, category) {
    const name = String(category || "").trim();

    if (!name) return;

    counts.set(name, (counts.get(name) || 0) + 1);
}

export async function listCategories({ minPrice, maxPrice } = {}) {
    const min = toPriceFilter(minPrice, "minPrice");
    const max = toPriceFilter(maxPrice, "maxPrice");

    if (min !== undefined && max !== undefined && min > max) {
        throw httpError(400, "minPrice no puede ser mayor que maxPrice");
    }

    const products = await prisma.product.findMany({
        where: {
            isActive: true,
            ...(min !== undefined || max !== undefined
                ? {
                    price: {
                        ...(min !== undefined ? { gte: min } : {}),
                        ...(max !== undefined ? { lte: max } : {})
                    }
                }
                : {})
        },
        select: {
            category: true,
            store: {
                select: {
                    category: true
                }
            }
        }
    });

    const counts = new Map();

    for (const product of products) {
        const categories = new Set([
            product.category,
            product.store?.category
        ]);

        for (const category of categories) {
            addCount(counts, category);
        }
    }

    const categories = [...counts.entries()]
        .map(([name, productCount]) => ({ name, productCount }))
        .sort((a, b) => a.name.localeCompare(b.name));

    return {
        totalProducts: products.length,
        categories
    };
}
