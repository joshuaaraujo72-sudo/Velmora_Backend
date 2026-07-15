import { prisma } from "./prisma.js";
import { productResponse, storeResponse } from "../utils/formatters.js";

export async function getHomeData() {
    const [stores, products, storeCount, productCount] = await Promise.all([
        prisma.store.findMany({
            where: { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 6,
            include: {
                products: {
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" },
                    take: 3
                }
            }
        }),
        prisma.product.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 8,
            include: {
                store: {
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true
                    }
                }
            }
        }),
        prisma.store.count({ where: { status: "ACTIVE" } }),
        prisma.product.count({ where: { isActive: true } })
    ]);

    return {
        summary: {
            stores: storeCount,
            products: productCount
        },
        featuredStores: stores.map(storeResponse),
        latestProducts: products.map(productResponse)
    };
}
