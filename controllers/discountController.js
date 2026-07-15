import { createDiscount, listDiscounts } from "../services/discountService.js";

export async function index(req, res, next) {
    try {
        const discounts = await listDiscounts(req.query);
        res.status(200).json({ discounts });
    } catch (error) {
        next(error);
    }
}

export async function store(req, res, next) {
    try {
        const discount = await createDiscount(req.body);
        res.status(201).json({ discount });
    } catch (error) {
        next(error);
    }
}
