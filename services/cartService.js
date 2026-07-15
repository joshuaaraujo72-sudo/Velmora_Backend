import { prisma } from "./prisma.js";

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;

const normalizeCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "El carrito debe tener productos" };
  }

  const normalizedItems = [];

  for (const item of items) {
    const productId = String(item.productId || "").trim();
    const quantity = Number(item.quantity || 1);

    if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
      return {
        error: "Cada item debe tener productId y quantity validos",
      };
    }

    const existingItem = normalizedItems.find(
      (cartItem) =>
        cartItem.productId === productId &&
        cartItem.selectedSize === (item.selectedSize || null) &&
        cartItem.selectedColor === (item.selectedColor || null)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      normalizedItems.push({
        productId,
        quantity,
        selectedSize: item.selectedSize || null,
        selectedColor: item.selectedColor || null,
      });
    }
  }

  return { normalizedItems };
};

const loadCartProducts = async (items) => {
  const normalized = normalizeCartItems(items);

  if (normalized.error) {
    return { error: normalized.error, status: 400 };
  }

  const { normalizedItems } = normalized;
  const uniqueProductIds = [...new Set(normalizedItems.map((item) => item.productId))];

  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueProductIds },
      isActive: true,
    },
    include: {
      store: true,
    },
  });

  if (products.length !== uniqueProductIds.length) {
    return { error: "Uno o mas productos no existen", status: 404 };
  }

  const cartItems = normalizedItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return { ...item, product };
  });

  for (const item of cartItems) {
    if (item.product.store.status !== "ACTIVE") {
      return {
        error: `La tienda ${item.product.store.name} no esta disponible`,
        status: 400,
      };
    }

    if (item.product.stock < item.quantity) {
      return {
        error: `Stock insuficiente para ${item.product.name}`,
        status: 400,
      };
    }
  }

  return { cartItems };
};

export const buildCheckoutSummary = async (items) => {
  const loaded = await loadCartProducts(items);

  if (loaded.error) {
    return loaded;
  }

  const itemSummaries = loaded.cartItems.map((item) => {
    const unitPrice = Number(item.product.price);
    const subtotal = roundMoney(unitPrice * item.quantity);

    return {
      productId: item.product.id,
      storeId: item.product.storeId,
      storeName: item.product.store.name,
      productName: item.product.name,
      category: item.product.category,
      unitPrice,
      quantity: item.quantity,
      selectedSize: item.selectedSize,
      selectedColor: item.selectedColor,
      subtotal,
      total: subtotal,
    };
  });

  const subtotal = roundMoney(
    itemSummaries.reduce((sum, item) => sum + item.subtotal, 0)
  );

  return {
    summary: {
      items: itemSummaries,
      subtotal,
      total: subtotal,
    },
  };
};

export const registerOrder = async ({ items, buyerId }) => {
  const buyer = String(buyerId || "").trim();

  if (!buyer) {
    return { error: "Debes iniciar sesion para registrar el pedido", status: 401 };
  }

  const result = await buildCheckoutSummary(items);

  if (result.error) {
    return result;
  }

  const { summary } = result;

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        buyerId: buyer,
        total: summary.total,
        status: "CONFIRMED",
        items: {
          create: summary.items.map((item) => ({
            productId: item.productId,
            storeId: item.storeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
          })),
        },
      },
      include: {
        items: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    for (const item of summary.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });
    }

    return createdOrder;
  });

  return { order };
};
