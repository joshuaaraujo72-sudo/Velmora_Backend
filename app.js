import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import eventRoutes from "./routes/eventRoutes.js";

app.use("/events", eventRoutes);
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        message: "Velmora Backend funcionando"
    });
});

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});