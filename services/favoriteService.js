import { prisma } from "./prisma.js";
import { productResponse } from "../utils/formatters.js";
import { httpError } from "../utils/httpError.js";

async function ensureProduct(productId) {
    const product = await prisma.product.findFirst({
        where: {
            id: productId,
            isActive: true
        }
    });

    if (!product) {
        throw httpError(404, "Producto no encontrado");
    }

    return product;
}

export async function listFavorites(userId) {
    const favorites = await prisma.favoriteProduct.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            product: {
                include: {
                    store: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true
                        }
                    }
                }
            }
        }
    });

    return favorites.map((favorite) => ({
        id: favorite.id,
        productId: favorite.productId,
        createdAt: favorite.createdAt,
        product: productResponse(favorite.product)
    }));
}

export async function addFavorite(userId, productId) {
    await ensureProduct(productId);

    const favorite = await prisma.favoriteProduct.upsert({
        where: {
            userId_productId: {
                userId,
                productId
            }
        },
        create: {
            userId,
            productId
        },
        update: {}
    });

    return favorite;
}

export async function removeFavorite(userId, productId) {
    const favorite = await prisma.favoriteProduct.findUnique({
        where: {
            userId_productId: {
                userId,
                productId
            }
        }
    });

    if (!favorite) {
        return null;
    }

    await prisma.favoriteProduct.delete({
        where: { id: favorite.id }
    });

    return favorite;
}
