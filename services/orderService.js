import { prisma } from "./prisma.js";
import { httpError } from "../utils/httpError.js";

function orderResponse(order) {
    return {
        ...order,
        total: Number(order.total),
        items: order.items?.map((item) => ({
            ...item,
            unitPrice: Number(item.unitPrice),
            product: item.product
                ? {
                    ...item.product,
                    price: Number(item.product.price)
                }
                : undefined
        }))
    };
}

export async function createOrder(buyerId, data) {
    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
        throw httpError(400, "La orden debe tener al menos un producto");
    }

    return prisma.$transaction(async (tx) => {
        const productIds = items.map((item) => item.productId);
        const products = await tx.product.findMany({
            where: {
                id: { in: productIds },
                isActive: true
            }
        });

        const productsById = new Map(products.map((product) => [product.id, product]));

        const orderItems = items.map((item) => {
            const product = productsById.get(item.productId);
            const quantity = Number(item.quantity || 1);

            if (!product) {
                throw httpError(404, "Uno de los productos no existe");
            }

            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw httpError(400, "La cantidad debe ser un entero positivo");
            }

            if (product.stock < quantity) {
                throw httpError(400, `Stock insuficiente para ${product.name}`);
            }

            return {
                product,
                quantity,
                selectedSize: item.selectedSize || null,
                selectedColor: item.selectedColor || null,
                subtotal: Number(product.price) * quantity
            };
        });

        const total = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

        const order = await tx.order.create({
            data: {
                buyerId,
                total,
                status: "CONFIRMED",
                items: {
                    create: orderItems.map((item) => ({
                        productId: item.product.id,
                        storeId: item.product.storeId,
                        quantity: item.quantity,
                        unitPrice: item.product.price,
                        selectedSize: item.selectedSize,
                        selectedColor: item.selectedColor
                    }))
                }
            },
            include: {
                items: {
                    include: {
                        product: true,
                        store: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        await Promise.all(orderItems.map((item) => {
            return tx.product.update({
                where: { id: item.product.id },
                data: {
                    stock: {
                        decrement: item.quantity
                    }
                }
            });
        }));

        return orderResponse(order);
    });
}

export async function listMyOrders(buyerId) {
    const orders = await prisma.order.findMany({
        where: { buyerId },
        orderBy: { createdAt: "desc" },
        include: {
            items: {
                include: {
                    product: true,
                    store: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            }
        }
    });

    return orders.map(orderResponse);
}
