import { createNewUser, getAllUsers } from "../services/userService.js";

export async function createUser(req, res, next) {
    try {
        const result = await createNewUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        next(error);
    }
}

export async function getUsers(req, res, next) {
    try {
        const users = await getAllUsers();
        res.status(200).json({ users });
    } catch (error) {
        next(error);
    }
}
