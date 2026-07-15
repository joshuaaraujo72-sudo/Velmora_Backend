import { prisma } from "../services/prisma.js";
import { hashPassword } from "../services/passwordService.js";

async function seedDemoStore() {
    const seller = await prisma.user.upsert({
        where: { email: "demo.vendedor@velmora.com" },
        update: {},
        create: {
            name: "Vendedor Demo",
            email: "demo.vendedor@velmora.com",
            passwordHash: hashPassword("123456"),
            role: "SELLER"
        }
    });

    const store = await prisma.store.upsert({
        where: { ownerId: seller.id },
        update: {},
        create: {
            ownerId: seller.id,
            name: "Urban Flow",
            description: "Looks casuales, modernos y comodos para el dia a dia.",
            category: "Ropa urbana",
            storeType: "interna",
            instagram: "@urbanflow",
            phone: "999999999"
        }
    });

    const productCount = await prisma.product.count({ where: { storeId: store.id } });

    if (productCount === 0) {
        await prisma.product.createMany({
            data: [
                {
                    storeId: store.id,
                    name: "Polo oversize",
                    category: "Ropa urbana",
                    price: 69.90,
                    stock: 32,
                    description: "Polo de corte amplio para outfits urbanos.",
                    sizes: ["S", "M", "L", "XL"],
                    colors: ["Negro", "Blanco", "Verde"]
                },
                {
                    storeId: store.id,
                    name: "Casaca urbana",
                    category: "Ropa urbana",
                    price: 129.90,
                    stock: 14,
                    description: "Casaca ligera para combinar con prendas casuales.",
                    sizes: ["S", "M", "L"],
                    colors: ["Negro", "Crema"]
                },
                {
                    storeId: store.id,
                    name: "Zapatillas urban style",
                    category: "Calzado",
                    price: 209.90,
                    stock: 20,
                    description: "Zapatillas comodas para uso diario.",
                    sizes: ["36", "37", "38", "39", "40"],
                    colors: ["Blanco", "Negro"]
                },
                {
                    storeId: store.id,
                    name: "Bolso bucket",
                    category: "Accesorios",
                    price: 169.90,
                    stock: 15,
                    description: "Bolso amplio con acabado urbano y elegante.",
                    sizes: ["Unica"],
                    colors: ["Marron", "Negro", "Crema"]
                }
            ]
        });
    }
}

async function seedEvents() {
    const count = await prisma.event.count();

    if (count > 0) {
        return;
    }

    await prisma.event.createMany({
        data: [
            {
                title: "30% OFF en ropa deportiva",
                description: "Aprovecha 30% de descuento en toda nuestra linea deportiva.",
                type: "PROMOCION",
                storeName: "NOVA",
                startsAt: new Date("2026-07-20"),
                endsAt: new Date("2026-07-26"),
                isFeatured: true
            },
            {
                title: "Lanzamiento Verano 2027",
                description: "Descubre nuestra nueva coleccion Verano 2027.",
                type: "LANZAMIENTO",
                storeName: "URBAN FLOW",
                startsAt: new Date("2026-08-01"),
                endsAt: new Date("2026-08-07"),
                isFeatured: true
            },
            {
                title: "Open House Maisone",
                description: "Te invitamos a nuestro evento especial con sorpresas.",
                type: "EVENTO",
                storeName: "MAISONE",
                startsAt: new Date("2026-08-15"),
                endsAt: new Date("2026-08-15"),
                isFeatured: true
            }
        ]
    });
}

async function seedDiscounts() {
    const count = await prisma.discount.count();

    if (count > 0) {
        return;
    }

    await prisma.discount.createMany({
        data: [
            {
                storeName: "Urban Flow",
                title: "50% OFF",
                description: "Ropa urbana seleccionada",
                category: "Polos",
                validUntil: "Valido hasta el 30 de julio"
            },
            {
                storeName: "Nova Fit",
                title: "35% OFF",
                description: "Prendas deportivas para entrenamiento",
                category: "Deportivas",
                validUntil: "Oferta por tiempo limitado"
            },
            {
                storeName: "Norda",
                title: "2x1",
                description: "Accesorios seleccionados",
                category: "Accesorios",
                validUntil: "Promocion exclusiva online"
            }
        ]
    });
}

async function main() {
    await seedDemoStore();
    await seedEvents();
    await seedDiscounts();
    console.log("Seed de Velmora completado");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
