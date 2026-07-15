import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const formatPrice = (price) => `S/ ${Number(price).toFixed(2)}`;

const mapProduct = (product) => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: formatPrice(product.price),
  rawPrice: product.price,
  tag: product.tag,
  imageKey: product.imageKey,
  stock: product.stock,
  category: product.category.name,
  categoryId: product.categoryId,
  storeId: product.storeId,
  storeName: product.store.name,
});

const getProductOrderBy = (sort) => {
  if (sort === "price_asc") return { price: "asc" };
  if (sort === "price_desc") return { price: "desc" };
  if (sort === "name_asc") return { name: "asc" };
  if (sort === "newest") return { createdAt: "desc" };
  return { id: "asc" };
};

const applyProductFilters = (req, res, baseWhere = {}) => {
  const categoryIdParam = req.query.categoryId;
  const trendingParam = req.query.trending;
  const minPriceParam = req.query.minPrice;
  const maxPriceParam = req.query.maxPrice;
  const searchParam = req.query.search;
  const sortParam = req.query.sort;
  const where = { active: true, ...baseWhere };

  if (categoryIdParam !== undefined) {
    const categoryId = Number(categoryIdParam);

    if (!Number.isInteger(categoryId)) {
      return { error: res.status(400).json({ error: "categoryId debe ser numerico" }) };
    }

    where.categoryId = categoryId;
  }

  if (trendingParam !== undefined) {
    if (trendingParam !== "true" && trendingParam !== "false") {
      return { error: res.status(400).json({ error: "trending debe ser true o false" }) };
    }

    where.trending = trendingParam === "true";
  }

  if (minPriceParam !== undefined || maxPriceParam !== undefined) {
    where.price = {};

    if (minPriceParam !== undefined) {
      const minPrice = Number(minPriceParam);

      if (!Number.isFinite(minPrice) || minPrice < 0) {
        return { error: res.status(400).json({ error: "minPrice debe ser un numero positivo" }) };
      }

      where.price.gte = minPrice;
    }

    if (maxPriceParam !== undefined) {
      const maxPrice = Number(maxPriceParam);

      if (!Number.isFinite(maxPrice) || maxPrice < 0) {
        return { error: res.status(400).json({ error: "maxPrice debe ser un numero positivo" }) };
      }

      where.price.lte = maxPrice;
    }
  }

  if (searchParam !== undefined && searchParam.trim() !== "") {
    where.name = {
      contains: searchParam.trim(),
      mode: "insensitive",
    };
  }

  return { where, orderBy: getProductOrderBy(sortParam) };
};

app.get("/", (req, res) => {
  return res.status(200).json({ mensaje: "Backend Velmora funcionando" });
});

app.get("/api/categories", async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            products: {
              where: { active: true },
            },
          },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    return res.status(200).json(
      categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        imageKey: category.imageKey,
        active: category.active,
        sortOrder: category.sortOrder,
        productsCount: category._count.products,
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener las categorias" });
  }
});

app.get("/api/categories/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "El id debe ser numerico" });
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { active: true },
          include: { category: true, store: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Categoria no encontrada" });
    }

    return res.status(200).json({
      ...category,
      products: category.products.map(mapProduct),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo obtener la categoria" });
  }
});

app.get("/api/products", async (req, res) => {
  const filters = applyProductFilters(req, res);
  if (filters.error) return filters.error;

  try {
    const products = await prisma.product.findMany({
      where: filters.where,
      include: { category: true, store: true },
      orderBy: filters.orderBy,
    });

    return res.status(200).json(products.map(mapProduct));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los productos" });
  }
});

app.get("/api/products/trending", async (req, res) => {
  const filters = applyProductFilters(req, res, { trending: true });
  if (filters.error) return filters.error;

  try {
    const products = await prisma.product.findMany({
      where: filters.where,
      include: { category: true, store: true },
      orderBy: filters.orderBy,
    });

    return res.status(200).json(products.map(mapProduct));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener las tendencias" });
  }
});

app.get("/api/favorites", async (req, res) => {
  const userKey = req.query.userKey;

  if (typeof userKey !== "string" || userKey.trim() === "") {
    return res.status(400).json({ error: "userKey es obligatorio" });
  }

  try {
    const favorites = await prisma.favoriteProduct.findMany({
      where: { userKey: userKey.trim() },
      include: {
        product: {
          include: { category: true, store: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(favorites.map((favorite) => mapProduct(favorite.product)));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudieron obtener los favoritos" });
  }
});

app.post("/api/favorites", async (req, res) => {
  const { userKey, productId } = req.body;

  if (typeof userKey !== "string" || userKey.trim() === "") {
    return res.status(400).json({ error: "userKey es obligatorio" });
  }

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "productId debe ser numerico" });
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const favorite = await prisma.favoriteProduct.upsert({
      where: {
        userKey_productId: {
          userKey: userKey.trim(),
          productId,
        },
      },
      update: {},
      create: {
        userKey: userKey.trim(),
        productId,
      },
    });

    return res.status(201).json(favorite);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo guardar el favorito" });
  }
});

app.delete("/api/favorites/:productId", async (req, res) => {
  const productId = Number(req.params.productId);
  const userKey = req.query.userKey;

  if (!Number.isInteger(productId)) {
    return res.status(400).json({ error: "productId debe ser numerico" });
  }

  if (typeof userKey !== "string" || userKey.trim() === "") {
    return res.status(400).json({ error: "userKey es obligatorio" });
  }

  try {
    const favorite = await prisma.favoriteProduct.findUnique({
      where: {
        userKey_productId: {
          userKey: userKey.trim(),
          productId,
        },
      },
    });

    if (!favorite) {
      return res.status(404).json({ error: "Favorito no encontrado" });
    }

    await prisma.favoriteProduct.delete({ where: { id: favorite.id } });

    return res.status(200).json({ mensaje: "Favorito eliminado correctamente" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "No se pudo eliminar el favorito" });
  }
});

app.listen(port, () => {
  console.log(`Servidor Velmora funcionando en http://localhost:${port}`);
});
