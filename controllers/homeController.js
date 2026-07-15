import { getHomeData } from "../services/homeService.js";

export async function index(req, res, next) {
    try {
        const data = await getHomeData();
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
}
