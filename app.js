import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

const promotionTypes = new Set(["PERCENTAGE", "FIXED_AMOUNT", "TWO_FOR_ONE"]);
const promotionStatuses = new Set(["DRAFT", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"]);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const toInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Math.round(value * 100) / 100;

const isPromotionLive = (promotion, now = new Date()) =>
  promotion.status === "ACTIVE" &&
  promotion.startsAt <= now &&
  (!promotion.endsAt || promotion.endsAt >= now) &&
  (!promotion.maxUses || promotion.usedCount < promotion.maxUses);

const getLivePromotionWhere = () => {
  const now = new Date();

  return {
    status: "ACTIVE",
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
  };
};

const calculatePromotionAmount = (promotion, baseAmount, unitPrice, quantity) => {
  if (promotion.type === "PERCENTAGE") {
    return baseAmount * (promotion.value / 100);
  }

  if (promotion.type === "FIXED_AMOUNT") {
    return Math.min(promotion.value, baseAmount);
  }

  if (promotion.type === "TWO_FOR_ONE") {
    return Math.floor(quantity / 2) * unitPrice;
  }

  return 0;
};

const isDiscountEligibleForProduct = (discount, product) => {
  const productRules = discount.products || [];
  const hasProductRules = productRules.length > 0;
  const productMatches =
    !hasProductRules || productRules.some((item) => item.productId === product.id);
  const categoryMatches = !discount.category || discount.category === product.category;

  return discount.storeId === product.storeId && productMatches && categoryMatches;
};

const getBestAutomaticDiscount = (product, quantity, discounts) => {
  const itemSubtotal = product.price * quantity;

  return discounts
    .filter((discount) => isDiscountEligibleForProduct(discount, product))
    .map((discount) => ({
      discount,
      amount: roundMoney(
        calculatePromotionAmount(discount, itemSubtotal, product.price, quantity)
      ),
    }))
    .sort((a, b) => b.amount - a.amount)[0] || null;
};

const isCouponEligibleForProduct = (coupon, product) => {
  const storeMatches = !coupon.storeId || coupon.storeId === product.storeId;
  const categoryMatches = !coupon.category || coupon.category === product.category;

  return storeMatches && categoryMatches;
};

const loadCartProducts = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return { error: { status: 400, message: "El carrito debe tener productos" } };
  }

  const normalizedItems = [];

  for (const item of items) {
    const productId = toInteger(item.productId);
    const quantity = toInteger(item.quantity);

    if (!productId || !quantity || quantity <= 0) {
      return {
        error: {
          status: 400,
          message: "Cada item debe tener productId y quantity numericos",
        },
      };
    }

    const existing = normalizedItems.find((cartItem) => cartItem.productId === productId);

    if (existing) {
      existing.quantity += quantity;
    } else {
      normalizedItems.push({ productId, quantity });
    }
  }

  const products = await prisma.product.findMany({
    where: {
      id: { in: normalizedItems.map((item) => item.productId) },
    },
    include: {
      store: true,
    },
  });

  if (products.length !== normalizedItems.length) {
    return { error: { status: 404, message: "Uno o mas productos no existen" } };
  }

  const cartItems = normalizedItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return { ...item, product };
  });

  for (const item of cartItems) {
    if (!item.product.active || !item.product.store.active) {
      return {
        error: {
          status: 400,
          message: `El producto ${item.product.name} no esta disponible`,
        },
      };
    }

    if (item.product.stock < item.quantity) {
      return {
        error: {
          status: 400,
          message: `Stock insuficiente para ${item.product.name}`,
        },
      };
    }
  }

  return { cartItems };
};

const buildCheckoutSummary = async ({ items, couponCode, userId = null }) => {
  const loaded = await loadCartProducts(items);

  if (loaded.error) {
    return loaded;
  }

  const { cartItems } = loaded;
  const productIds = cartItems.map((item) => item.productId);
  const storeIds = [...new Set(cartItems.map((item) => item.product.storeId))];
  const categories = [...new Set(cartItems.map((item) => item.product.category))];

  const liveDiscounts = await prisma.discount.findMany({
    where: {
      AND: [
        getLivePromotionWhere(),
        { storeId: { in: storeIds } },
        { OR: [{ category: null }, { category: { in: categories } }] },
      ],
    },
    include: {
      store: true,
      products: true,
    },
  });

  const itemSummaries = cartItems.map((item) => {
    const subtotal = item.product.price * item.quantity;
    const bestDiscount = getBestAutomaticDiscount(
      item.product,
      item.quantity,
      liveDiscounts
    );

    return {
      productId: item.product.id,
      storeId: item.product.storeId,
      productName: item.product.name,
      category: item.product.category,
      unitPrice: item.product.price,
      quantity: item.quantity,
      subtotal: roundMoney(subtotal),
      automaticDiscountId: bestDiscount?.discount.id || null,
      automaticDiscountAmount: bestDiscount?.amount || 0,
    };
  });

  const subtotal = roundMoney(
    itemSummaries.reduce((sum, item) => sum + item.subtotal, 0)
  );
  const automaticDiscountAmount = roundMoney(
    itemSummaries.reduce((sum, item) => sum + item.automaticDiscountAmount, 0)
  );

  let coupon = null;
  let couponDiscountAmount = 0;

  if (couponCode) {
    coupon = await prisma.coupon.findUnique({
      where: { code: String(couponCode).trim().toUpperCase() },
      include: { store: true },
    });

    if (!coupon || !isPromotionLive(coupon)) {
      return {
        error: {
          status: 400,
          message: "El cupon no existe, no esta activo o ya vencio",
        },
      };
    }

    if (subtotal < coupon.minPurchaseAmount) {
      return {
        error: {
          status: 400,
          message: `El cupon requiere una compra minima de S/ ${coupon.minPurchaseAmount.toFixed(2)}`,
        },
      };
    }

    if (coupon.perUserLimit) {
      if (!userId) {
        return {
          error: {
            status: 400,
            message: "Este cupon requiere iniciar sesion para validar su limite de uso",
          },
        };
      }

      const redemptions = await prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (redemptions >= coupon.perUserLimit) {
        return {
          error: {
            status: 400,
            message: "Ya alcanzaste el limite de uso para este cupon",
          },
        };
      }
    }

    const eligibleItems = cartItems.filter((item) =>
      isCouponEligibleForProduct(coupon, item.product)
    );

    if (eligibleItems.length === 0) {
      return {
        error: {
          status: 400,
          message: "El cupon no aplica a las tiendas o categorias del carrito",
        },
      };
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    couponDiscountAmount = roundMoney(
      calculatePromotionAmount(coupon, eligibleSubtotal, 0, 0)
    );
  }

  let finalAutomaticDiscount = automaticDiscountAmount;
  let finalCouponDiscount = couponDiscountAmount;
  let discountPolicy = "AUTOMATIC_ONLY";

  if (coupon) {
    discountPolicy = coupon.stackable ? "STACKED" : "BEST_DISCOUNT";

    if (!coupon.stackable && automaticDiscountAmount > 0) {
      if (couponDiscountAmount >= automaticDiscountAmount) {
        finalAutomaticDiscount = 0;
      } else {
        finalCouponDiscount = 0;
      }
    }
  }

  const discountAmount = roundMoney(finalAutomaticDiscount + finalCouponDiscount);
  const total = roundMoney(Math.max(subtotal - discountAmount, 0));

  return {
    summary: {
      items: itemSummaries,
      coupon: coupon
        ? {
            id: coupon.id,
            code: coupon.code,
            description: coupon.description,
            stackable: coupon.stackable,
          }
        : null,
      subtotal,
      automaticDiscountAmount: finalAutomaticDiscount,
      couponDiscountAmount: finalCouponDiscount,
      discountAmount,
      total,
      discountPolicy,
      productIds,
    },
  };
};

app.get("/", (req, res) => {
  return res.status(200).json({ mensaje: "Backend Velmora funcionando" });
});

app.get("/stores", async (req, res) => {
  try {
    const stores = await prisma.store.findMany({
      include: {
        products: true,
        discounts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(stores);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener las tiendas" });
  }
});

app.post("/stores", async (req, res) => {
  const { ownerId, name, category, description, logoUrl, website } = req.body;
  const parsedOwnerId = ownerId ? toInteger(ownerId) : null;

  if (ownerId && !parsedOwnerId) {
    return res.status(400).json({ error: "ownerId debe ser numerico" });
  }

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "El nombre de la tienda es obligatorio" });
  }

  if (typeof category !== "string" || category.trim() === "") {
    return res.status(400).json({ error: "La categoria de la tienda es obligatoria" });
  }

  try {
    const store = await prisma.store.create({
      data: {
        ownerId: parsedOwnerId,
        name: name.trim(),
        category: category.trim(),
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        website: website?.trim() || null,
      },
    });

    return res.status(201).json(store);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "No se pudo crear la tienda" });
  }
});

app.get("/products", async (req, res) => {
  const { storeId, category } = req.query;
  const where = {};

  if (storeId) {
    const parsedStoreId = toInteger(storeId);

    if (!parsedStoreId) {
      return res.status(400).json({ error: "storeId debe ser numerico" });
    }

    where.storeId = parsedStoreId;
  }

  if (category) {
    where.category = String(category);
  }

  try {
    const products = await prisma.product.findMany({
      where,
      include: { store: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los productos" });
  }
});

app.post("/products", async (req, res) => {
  const { storeId, name, category, price, stock, imageUrl, description } = req.body;
  const parsedStoreId = toInteger(storeId);

  if (!parsedStoreId) {
    return res.status(400).json({ error: "storeId es obligatorio y numerico" });
  }

  if (typeof name !== "string" || name.trim() === "") {
    return res.status(400).json({ error: "El nombre del producto es obligatorio" });
  }

  if (typeof category !== "string" || category.trim() === "") {
    return res.status(400).json({ error: "La categoria del producto es obligatoria" });
  }

  if (toMoney(price) <= 0) {
    return res.status(400).json({ error: "El precio debe ser mayor a 0" });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: parsedStoreId } });

    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }

    const product = await prisma.product.create({
      data: {
        storeId: parsedStoreId,
        name: name.trim(),
        category: category.trim(),
        price: toMoney(price),
        stock: stock ? toInteger(stock) || 0 : 0,
        imageUrl: imageUrl?.trim() || null,
        description: description?.trim() || null,
      },
      include: { store: true },
    });

    return res.status(201).json(product);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "No se pudo crear el producto" });
  }
});

app.get("/discounts", async (req, res) => {
  const { category, storeId, active = "true", search } = req.query;
  const andFilters = [];
  const where = { AND: andFilters };

  if (active === "true") {
    andFilters.push(getLivePromotionWhere());
  } else if (active === "false") {
    andFilters.push({ NOT: getLivePromotionWhere() });
  }

  if (category) {
    andFilters.push({ category: String(category) });
  }

  if (storeId) {
    const parsedStoreId = toInteger(storeId);

    if (!parsedStoreId) {
      return res.status(400).json({ error: "storeId debe ser numerico" });
    }

    andFilters.push({ storeId: parsedStoreId });
  }

  if (search) {
    andFilters.push({
      OR: [
        { title: { contains: String(search), mode: "insensitive" } },
        { description: { contains: String(search), mode: "insensitive" } },
      ],
    });
  }

  try {
    const discounts = await prisma.discount.findMany({
      where,
      include: {
        store: true,
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(discounts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los descuentos" });
  }
});

app.get("/discounts/:id", async (req, res) => {
  const id = toInteger(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "El id debe ser numerico" });
  }

  try {
    const discount = await prisma.discount.findUnique({
      where: { id },
      include: {
        store: true,
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!discount) {
      return res.status(404).json({ error: "Descuento no encontrado" });
    }

    return res.status(200).json(discount);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo obtener el descuento" });
  }
});

app.post("/discounts", async (req, res) => {
  const {
    storeId,
    title,
    description,
    type,
    value,
    category,
    startsAt,
    endsAt,
    minPurchaseAmount,
    maxUses,
    productIds = [],
    stackable = false,
  } = req.body;

  const parsedStoreId = toInteger(storeId);

  if (!parsedStoreId) {
    return res.status(400).json({ error: "storeId es obligatorio y numerico" });
  }

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "El titulo es obligatorio" });
  }

  if (!promotionTypes.has(type)) {
    return res.status(400).json({ error: "Tipo de descuento invalido" });
  }

  if (type !== "TWO_FOR_ONE" && toMoney(value) <= 0) {
    return res.status(400).json({ error: "El valor del descuento debe ser mayor a 0" });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: parsedStoreId } });

    if (!store) {
      return res.status(404).json({ error: "Tienda no encontrada" });
    }

    const parsedProductIds = productIds.map(toInteger).filter(Boolean);

    const created = await prisma.discount.create({
      data: {
        storeId: parsedStoreId,
        title: title.trim(),
        description: description?.trim() || null,
        type,
        value: toMoney(value),
        category: category?.trim() || null,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        minPurchaseAmount: toMoney(minPurchaseAmount),
        maxUses: maxUses ? toInteger(maxUses) : null,
        stackable: Boolean(stackable),
        products: {
          create: parsedProductIds.map((productId) => ({
            product: { connect: { id: productId } },
          })),
        },
      },
      include: {
        store: true,
        products: {
          include: { product: true },
        },
      },
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "No se pudo crear el descuento" });
  }
});

app.put("/discounts/:id", async (req, res) => {
  const id = toInteger(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "El id debe ser numerico" });
  }

  const { title, description, type, value, category, startsAt, endsAt, status } = req.body;

  if (type && !promotionTypes.has(type)) {
    return res.status(400).json({ error: "Tipo de descuento invalido" });
  }

  if (status && !promotionStatuses.has(status)) {
    return res.status(400).json({ error: "Estado de descuento invalido" });
  }

  try {
    const existing = await prisma.discount.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: "Descuento no encontrado" });
    }

    const updated = await prisma.discount.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        description: description !== undefined ? String(description).trim() : undefined,
        type,
        value: value !== undefined ? toMoney(value) : undefined,
        category: category !== undefined ? String(category).trim() || null : undefined,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        status,
      },
      include: {
        store: true,
        products: {
          include: { product: true },
        },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "No se pudo modificar el descuento" });
  }
});

app.delete("/discounts/:id", async (req, res) => {
  const id = toInteger(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "El id debe ser numerico" });
  }

  try {
    const existing = await prisma.discount.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: "Descuento no encontrado" });
    }

    await prisma.discount.delete({ where: { id } });

    return res.status(200).json({ mensaje: "Descuento eliminado correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "No se pudo eliminar el descuento" });
  }
});

app.get("/stores/:storeId/discounts", async (req, res) => {
  const storeId = toInteger(req.params.storeId);

  if (!storeId) {
    return res.status(400).json({ error: "storeId debe ser numerico" });
  }

  try {
    const discounts = await prisma.discount.findMany({
      where: {
        storeId,
      },
      include: {
        products: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(discounts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los descuentos de la tienda" });
  }
});

app.get("/coupons", async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      where: getLivePromotionWhere(),
      include: { store: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(coupons);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los cupones" });
  }
});

app.post("/coupons", async (req, res) => {
  const {
    code,
    description,
    type,
    value,
    storeId,
    category,
    startsAt,
    endsAt,
    minPurchaseAmount,
    maxUses,
    perUserLimit,
    stackable = false,
  } = req.body;

  if (typeof code !== "string" || code.trim() === "") {
    return res.status(400).json({ error: "El codigo del cupon es obligatorio" });
  }

  if (!promotionTypes.has(type)) {
    return res.status(400).json({ error: "Tipo de cupon invalido" });
  }

  const parsedStoreId = storeId ? toInteger(storeId) : null;

  if (storeId && !parsedStoreId) {
    return res.status(400).json({ error: "storeId debe ser numerico" });
  }

  try {
    if (parsedStoreId) {
      const store = await prisma.store.findUnique({ where: { id: parsedStoreId } });

      if (!store) {
        return res.status(404).json({ error: "Tienda no encontrada" });
      }
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        type,
        value: toMoney(value),
        storeId: parsedStoreId,
        category: category?.trim() || null,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        minPurchaseAmount: toMoney(minPurchaseAmount),
        maxUses: maxUses ? toInteger(maxUses) : null,
        perUserLimit: perUserLimit ? toInteger(perUserLimit) : null,
        stackable: Boolean(stackable),
      },
      include: {
        store: true,
      },
    });

    return res.status(201).json(coupon);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error: "No se pudo crear el cupon" });
  }
});

app.post("/coupons/validate", async (req, res) => {
  const { code, items, userId } = req.body;
  const parsedUserId = userId ? toInteger(userId) : null;

  if (typeof code !== "string" || code.trim() === "") {
    return res.status(400).json({ error: "El codigo del cupon es obligatorio" });
  }

  if (userId && !parsedUserId) {
    return res.status(400).json({ error: "userId debe ser numerico" });
  }

  try {
    const result = await buildCheckoutSummary({
      items,
      couponCode: code,
      userId: parsedUserId,
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    return res.status(200).json({
      valid: true,
      message: "Cupon validado correctamente",
      ...result.summary,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo validar el cupon" });
  }
});

app.post("/checkout/summary", async (req, res) => {
  const { items, couponCode, userId } = req.body;
  const parsedUserId = userId ? toInteger(userId) : null;

  if (userId && !parsedUserId) {
    return res.status(400).json({ error: "userId debe ser numerico" });
  }

  try {
    const result = await buildCheckoutSummary({
      items,
      couponCode,
      userId: parsedUserId,
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    return res.status(200).json(result.summary);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo calcular el checkout" });
  }
});

app.post("/orders", async (req, res) => {
  const { userId, items, couponCode } = req.body;
  const parsedUserId = userId ? toInteger(userId) : null;

  if (userId && !parsedUserId) {
    return res.status(400).json({ error: "userId debe ser numerico" });
  }

  try {
    const result = await buildCheckoutSummary({
      items,
      couponCode,
      userId: parsedUserId,
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const { summary } = result;

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: parsedUserId,
          couponId: summary.coupon?.id || null,
          discountId:
            summary.items.find((item) => item.automaticDiscountId)?.automaticDiscountId ||
            null,
          subtotal: summary.subtotal,
          automaticDiscountAmount: summary.automaticDiscountAmount,
          couponDiscountAmount: summary.couponDiscountAmount,
          discountAmount: summary.discountAmount,
          total: summary.total,
          items: {
            create: summary.items.map((item) => ({
              productId: item.productId,
              storeId: item.storeId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
              discountAmount: item.automaticDiscountAmount,
              total: roundMoney(item.subtotal - item.automaticDiscountAmount),
            })),
          },
        },
        include: {
          items: true,
          coupon: true,
          discount: true,
        },
      });

      for (const item of summary.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (summary.coupon) {
        await tx.coupon.update({
          where: { id: summary.coupon.id },
          data: { usedCount: { increment: 1 } },
        });

        await tx.couponRedemption.create({
          data: {
            couponId: summary.coupon.id,
            userId: parsedUserId,
            orderId: createdOrder.id,
            discountAmount: summary.couponDiscountAmount,
          },
        });
      }

      const discountIds = [
        ...new Set(summary.items.map((item) => item.automaticDiscountId).filter(Boolean)),
      ];

      for (const discountId of discountIds) {
        await tx.discount.update({
          where: { id: discountId },
          data: { usedCount: { increment: 1 } },
        });
      }

      return createdOrder;
    });

    return res.status(201).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo registrar el pedido" });
  }
});

app.listen(port, () => {
  console.log(`Servidor Velmora funcionando en http://localhost:${port}`);
});

