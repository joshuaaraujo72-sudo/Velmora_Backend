# Velmora Backend

API REST para las funcionalidades principales de Velmora: registro, login, tiendas, catalogo de productos, eventos, descuentos, carrito, ordenes y dashboard de vendedor.

## Stack

- Node.js
- Express
- Prisma ORM
- PostgreSQL

## Variables de entorno

Crear un archivo `.env` local basado en `.env.example`.

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@HOST:5432/postgres?sslmode=require"
JWT_SECRET="clave-secreta"
FRONTEND_URL="http://localhost:5173"
PORT=3000
NODE_ENV=development
```

En Render, estas variables deben configurarse en **Environment**. No subir `.env` al repositorio.

## Comandos locales

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

## Despliegue en Render

Build Command:

```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

Start Command:

```bash
npm start
```

Variables necesarias en Render:

```txt
DATABASE_URL
JWT_SECRET
FRONTEND_URL
NODE_ENV=production
```

## Endpoints principales

```txt
GET  /
GET  /health

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me

GET  /api/home

GET  /api/stores
POST /api/stores
GET  /api/stores/:id
PUT  /api/stores/:id
GET  /api/stores/:id/products
POST /api/stores/:id/products
POST /api/stores/:id/metrics

GET    /api/products
GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id

GET  /api/events
GET  /api/events/:id
POST /api/events
DELETE /api/events/:id

GET  /api/discounts
POST /api/discounts

POST /api/cart/checkout/summary
POST /api/cart/orders

POST /api/orders
GET  /api/orders/my

GET /api/seller/dashboard

GET  /api/users
POST /api/users
```

## Relacion con el frontend

El frontend React consume este API usando una variable:

```env
VITE_API_URL=https://url-del-backend-en-render
```

La base de datos nunca debe conectarse directamente desde React.
