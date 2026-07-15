import express from "express";
import cors from "cors";
import eventRoutes from "./routes/eventRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.json({
        message: "Velmora Backend funcionando"
    });
});

app.use("/events", eventRoutes);
app.use("/", cartRoutes);

app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
