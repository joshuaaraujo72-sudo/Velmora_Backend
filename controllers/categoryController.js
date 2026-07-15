import { listCategories } from "../services/categoryService.js";

export async function index(req, res, next) {
    try {
        const result = await listCategories(req.query);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}
