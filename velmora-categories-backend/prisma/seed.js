import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  {
    name: "Ropa urbana",
    description: "Looks casuales, modernos y comodos para el dia a dia.",
    imageKey: "categoriaUrbana",
    sortOrder: 1,
  },
  {
    name: "Ropa deportiva",
    description: "Prendas comodas para entrenar o vestir con estilo sport.",
    imageKey: "categoriaDeportiva",
    sortOrder: 2,
  },
  {
    name: "Calzado",
    description: "Zapatos, sandalias y zapatillas para cada ocasion.",
    imageKey: "categoriaCalzado",
    sortOrder: 3,
  },
  {
    name: "Accesorios",
    description: "Bolsos, joyeria, lentes y detalles para completar tu outfit.",
    imageKey: "categoriaAccesorios",
    sortOrder: 4,
  },
  {
    name: "Moda elegante",
    description: "Prendas sofisticadas para eventos, reuniones y ocasiones especiales.",
    imageKey: "categoriaElegante",
    sortOrder: 5,
  },
];

const stores = [
  {
    name: "Avanto",
    description: "Prendas sofisticadas para ocasiones especiales.",
    logoKey: "logoAvanto",
  },
  {
    name: "Norda",
    description: "Detalles, bolsos y complementos para cada outfit.",
    logoKey: "logoNorda",
  },
  {
    name: "Maisone",
    description: "Calzado elegante y urbano para temporada.",
    logoKey: "logoMaisone",
  },
  {
    name: "Urban Flow",
    description: "Looks casuales y modernos para el dia a dia.",
    logoKey: "logoVelmora",
  },
];

const products = [
  {
    name: "Chaleco de lino",
    price: 149.9,
    tag: "Nuevo",
    categoryName: "Moda elegante",
    storeName: "Avanto",
    imageKey: "producto1",
    trending: true,
    stock: 18,
  },
  {
    name: "Camisa satinada",
    price: 119.9,
    tag: "Top",
    categoryName: "Moda elegante",
    storeName: "Avanto",
    imageKey: "producto2",
    trending: true,
    stock: 24,
  },
  {
    name: "Bolso bucket",
    price: 169.9,
    tag: "Trend",
    categoryName: "Accesorios",
    storeName: "Norda",
    imageKey: "producto3",
    trending: true,
    stock: 15,
  },
  {
    name: "Zapatillas urban style",
    price: 209.9,
    tag: "Sale",
    categoryName: "Ropa urbana",
    storeName: "Urban Flow",
    imageKey: "producto4",
    trending: true,
    stock: 20,
  },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category,
    });
  }

  for (const store of stores) {
    const existingStore = await prisma.store.findFirst({
      where: { name: store.name },
    });

    if (existingStore) {
      await prisma.store.update({
        where: { id: existingStore.id },
        data: store,
      });
    } else {
      await prisma.store.create({ data: store });
    }
  }

  for (const product of products) {
    const category = await prisma.category.findUnique({
      where: { name: product.categoryName },
    });
    const store = await prisma.store.findFirst({
      where: { name: product.storeName },
    });

    if (!category || !store) continue;

    const existingProduct = await prisma.product.findFirst({
      where: { name: product.name },
    });

    const productData = {
      name: product.name,
      price: product.price,
      tag: product.tag,
      imageKey: product.imageKey,
      trending: product.trending,
      stock: product.stock,
      categoryId: category.id,
      storeId: store.id,
    };

    if (existingProduct) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: productData,
      });
    } else {
      await prisma.product.create({ data: productData });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
