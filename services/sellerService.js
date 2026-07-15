import { prisma } from "./prisma.js";
import { productResponse, storeResponse } from "../utils/formatters.js";
import { httpError } from "../utils/httpError.js";

export async function getSellerDashboard(ownerId) {
    const store = await prisma.store.findUnique({
        where: { ownerId },
        include: {
            products: {
                where: { isActive: true },
                orderBy: { createdAt: "desc" }
            }
        }
    });

    if (!store) {
        throw httpError(404, "Este vendedor aun no tiene una tienda registrada");
    }

    const [metrics, orderItems] = await Promise.all([
        prisma.storeMetric.groupBy({
            by: ["type"],
            where: { storeId: store.id },
            _sum: { value: true }
        }),
        prisma.orderItem.findMany({
            where: { storeId: store.id },
            include: { order: true }
        })
    ]);

    const metricTotals = metrics.reduce((result, metric) => {
        result[metric.type] = metric._sum.value || 0;
        return result;
    }, {});

    const totalRevenue = orderItems.reduce((total, item) => {
        return total + Number(item.unitPrice) * item.quantity;
    }, 0);

    const products = store.products.map(productResponse);

    return {
        store: storeResponse(store),
        stats: {
            products: products.length,
            totalStock: products.reduce((total, product) => total + product.stock, 0),
            lowStock: products.filter((product) => product.stock > 0 && product.stock <= 5).length,
            views: metricTotals.STORE_VIEW || 0,
            catalogClicks: metricTotals.CATALOG_CLICK || 0,
            orders: new Set(orderItems.map((item) => item.orderId)).size,
            revenue: Number(totalRevenue.toFixed(2))
        },
        recentProducts: products.slice(0, 5),
        lowStockProducts: products.filter((product) => product.stock > 0 && product.stock <= 5)
    };
}
