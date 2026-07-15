import {
    deleteProduct,
    getProductById,
    updateProduct
} from "../services/productService.js";

export async function show(req, res, next) {
    try {
        const product = await getProductById(req.params.id);
        res.status(200).json({ product });
    } catch (error) {
        next(error);
    }
}

export async function update(req, res, next) {
    try {
        const product = await updateProduct(req.user.id, req.params.id, req.body);
        res.status(200).json({ product });
    } catch (error) {
        next(error);
    }
}

export async function destroy(req, res, next) {
    try {
        const product = await deleteProduct(req.user.id, req.params.id);
        res.status(200).json({ product });
    } catch (error) {
        next(error);
    }
}
