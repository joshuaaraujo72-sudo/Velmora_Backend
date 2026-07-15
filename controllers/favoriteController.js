import {
    addFavorite,
    listFavorites,
    removeFavorite
} from "../services/favoriteService.js";

export async function index(req, res, next) {
    try {
        const favorites = await listFavorites(req.user.id);
        res.status(200).json({ favorites });
    } catch (error) {
        next(error);
    }
}

export async function store(req, res, next) {
    try {
        const favorite = await addFavorite(req.user.id, req.params.productId);
        res.status(201).json({ favorite });
    } catch (error) {
        next(error);
    }
}

export async function destroy(req, res, next) {
    try {
        const favorite = await removeFavorite(req.user.id, req.params.productId);
        res.status(200).json({ favorite });
    } catch (error) {
        next(error);
    }
}
