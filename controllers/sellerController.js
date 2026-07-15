import { getSellerDashboard } from "../services/sellerService.js";

export async function dashboard(req, res, next) {
    try {
        const data = await getSellerDashboard(req.user.id);
        res.status(200).json(data);
    } catch (error) {
        next(error);
    }
}
