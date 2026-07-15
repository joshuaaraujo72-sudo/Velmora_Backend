import {
    deleteProduct,
    getProductById,
    listProducts,
    updateProduct
} from "../services/productService.js";

export async function index(req, res, next) {
    try {
        const products = await listProducts(req.query);
        res.status(200).json({ products });
    } catch (error) {
        next(error);
    }
}

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
