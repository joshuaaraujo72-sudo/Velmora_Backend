import {
    createNewUser,
    getAllUsers
} from "../services/userService.js";

export const createUser = async (req, res) => {
    try {

        const user = await createNewUser(req.body);

        res.status(201).json(user);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

export const getUsers = async (req, res) => {
    try {

        const users = await getAllUsers();

        res.status(200).json(users);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};