import express from "express";
import cors from "cors";
import { loadEnv } from "./config/env.js";
import { prisma } from "./services/prisma.js";
import authRoutes from "./routes/authRoutes.js";
import homeRoutes from "./routes/homeRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import storeRoutes from "./routes/storeRoutes.js";

loadEnv();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: process.env.NODE_ENV === "production" ? allowedOrigins : true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({
        message: "Velmora Backend funcionando",
        docs: "/health"
    });
});

app.get("/health", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: "ok",
            database: "connected"
        });
    } catch (error) {
        console.error("Health check error:", error);
        res.status(500).json({
            status: "error",
            database: "disconnected"
        });
    }
});

app.use("/api/auth", authRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/seller", sellerRoutes);
app.use("/api/stores", storeRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: "Ruta no encontrada"
    });
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.status || 500).json({
        message: error.publicMessage || "Error interno del servidor"
    });
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
