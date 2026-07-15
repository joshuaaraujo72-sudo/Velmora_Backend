import { Router } from "express";
import { index } from "../controllers/categoryController.js";

const router = Router();

router.get("/", index);

export default router;
