# Velmora Backend

API REST para las funcionalidades principales de Velmora: registro, login, tiendas, catalogo de productos, datos para la pagina principal y dashboard de vendedor.

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

Usar este repositorio como Web Service.

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

GET    /api/products/:id
PUT    /api/products/:id
DELETE /api/products/:id

POST /api/orders
GET  /api/orders/my

GET /api/seller/dashboard
```

## Flujo esperado para probar

1. Registrar un vendedor con `POST /api/auth/register`.
2. Guardar el token recibido.
3. Crear la tienda con `POST /api/stores`.
4. Crear productos con `POST /api/stores/:id/products`.
5. Consultar `GET /api/stores` para ver la tienda publicada.
6. Consultar `GET /api/stores/:id` para ver el catalogo.
7. Consultar `GET /api/seller/dashboard` para revisar estadisticas del vendedor.

## Relacion con el frontend

El frontend React debe consumir este API usando una variable:

```env
VITE_API_URL=https://url-del-backend-en-render
```

La base de datos nunca debe conectarse directamente desde React.
