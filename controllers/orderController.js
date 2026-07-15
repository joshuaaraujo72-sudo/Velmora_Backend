import { createOrder, listMyOrders } from "../services/orderService.js";

export async function store(req, res, next) {
    try {
        const order = await createOrder(req.user.id, req.body);
        res.status(201).json({ order });
    } catch (error) {
        next(error);
    }
}

export async function mine(req, res, next) {
    try {
        const orders = await listMyOrders(req.user.id);
        res.status(200).json({ orders });
    } catch (error) {
        next(error);
    }
}
