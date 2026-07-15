export function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
    };
}

export function productResponse(product) {
    return {
        ...product,
        price: Number(product.price)
    };
}

export function storeResponse(store) {
    return {
        ...store,
        products: store.products?.map(productResponse)
    };
}
