# Backend Velmora

Backend JavaScript con Express, PostgreSQL y Prisma para categorias y productos de Velmora.

## Comandos

```bash
pnpm install
cp .env.example .env
pnpm run prisma:migrate -- --name init
pnpm run prisma:seed
pnpm run dev
```

El servidor usa `PORT=3000` por defecto.

## Endpoints principales

- `GET /`
- `GET /api/categories`
- `GET /api/categories/:id`
- `GET /api/products`
- `GET /api/products?categoryId=1`
- `GET /api/products/trending`
- `GET /api/products/trending?categoryId=1`
- `GET /api/products/trending?search=camisa&minPrice=100&maxPrice=200&sort=price_asc`
- `GET /api/favorites?userKey=guest-demo`
- `POST /api/favorites`
- `DELETE /api/favorites/:productId?userKey=guest-demo`
