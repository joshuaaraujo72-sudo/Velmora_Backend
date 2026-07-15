import { PrismaClient } from "@prisma/client";
import { loadEnv } from "../config/env.js";

loadEnv();

export const prisma = new PrismaClient();
