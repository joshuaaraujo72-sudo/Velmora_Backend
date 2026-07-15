import { loginUser, registerUser } from "../services/authService.js";

export async function register(req, res, next) {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const result = await loginUser(req.body);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
}

export function me(req, res) {
    res.status(200).json({
        user: req.user
    });
}
