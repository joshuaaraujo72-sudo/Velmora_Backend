import prisma from "./prismaService.js";

const toInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const roundMoney = (value) => Math.round(value * 100) / 100;

const normalizeCartItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "El carrito debe tener productos" };
  }

  const normalizedItems = [];

  for (const item of items) {
    const productId = toInteger(item.productId);
    const quantity = toInteger(item.quantity);

    if (!productId || !quantity || quantity <= 0) {
      return {
        error: "Cada item debe tener productId y quantity numericos",
      };
    }

    const existingItem = normalizedItems.find(
      (cartItem) => cartItem.productId === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      normalizedItems.push({ productId, quantity });
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

  const products = await prisma.product.findMany({
    where: {
      id: { in: normalizedItems.map((item) => item.productId) },
    },
    include: {
      store: true,
    },
  });

  if (products.length !== normalizedItems.length) {
    return { error: "Uno o mas productos no existen", status: 404 };
  }

  const cartItems = normalizedItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return { ...item, product };
  });

  for (const item of cartItems) {
    if (!item.product.active || !item.product.store.active) {
      return {
        error: `El producto ${item.product.name} no esta disponible`,
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
    const subtotal = roundMoney(item.product.price * item.quantity);

    return {
      productId: item.product.id,
      storeId: item.product.storeId,
      storeName: item.product.store.name,
      productName: item.product.name,
      category: item.product.category,
      unitPrice: item.product.price,
      quantity: item.quantity,
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

export const registerOrder = async ({ items, userId = null }) => {
  const result = await buildCheckoutSummary(items);

  if (result.error) {
    return result;
  }

  const { summary } = result;
  const parsedUserId = userId ? toInteger(userId) : null;

  if (userId && !parsedUserId) {
    return { error: "userId debe ser numerico", status: 400 };
  }

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        userId: parsedUserId,
        subtotal: summary.subtotal,
        total: summary.total,
        items: {
          create: summary.items.map((item) => ({
            productId: item.productId,
            storeId: item.storeId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
            total: item.total,
          })),
        },
      },
      include: {
        items: true,
        user: true,
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
