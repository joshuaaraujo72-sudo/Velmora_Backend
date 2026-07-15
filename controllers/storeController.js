import {
    createProduct,
    createStore,
    getStoreById,
    listStoreProducts,
    listStores,
    registerStoreMetric,
    updateStore
} from "../services/storeService.js";

export async function index(req, res, next) {
    try {
        const stores = await listStores(req.query);
        res.status(200).json({ stores });
    } catch (error) {
        next(error);
    }
}

export async function show(req, res, next) {
    try {
        const store = await getStoreById(req.params.id);
        res.status(200).json({ store });
    } catch (error) {
        next(error);
    }
}

export async function store(req, res, next) {
    try {
        const createdStore = await createStore(req.user.id, req.body);
        res.status(201).json({ store: createdStore });
    } catch (error) {
        next(error);
    }
}

export async function update(req, res, next) {
    try {
        const updatedStore = await updateStore(req.user.id, req.params.id, req.body);
        res.status(200).json({ store: updatedStore });
    } catch (error) {
        next(error);
    }
}

export async function products(req, res, next) {
    try {
        const storeProducts = await listStoreProducts(req.params.id);
        res.status(200).json({ products: storeProducts });
    } catch (error) {
        next(error);
    }
}

export async function addProduct(req, res, next) {
    try {
        const product = await createProduct(req.user.id, req.params.id, req.body);
        res.status(201).json({ product });
    } catch (error) {
        next(error);
    }
}

export async function metric(req, res, next) {
    try {
        const result = await registerStoreMetric(req.params.id, req.body.type);
        res.status(201).json({ metric: result });
    } catch (error) {
        next(error);
    }
}
