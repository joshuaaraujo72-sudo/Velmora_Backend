# Backend Velmora

Backend en JavaScript para Velmora usando Node.js, Express, PostgreSQL y Prisma.

## Instalacion

Desde la carpeta `backend`:

```bash
pnpm install
```

Crear `.env` tomando como base `.env.example`:

```env
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/velmora_db"
PORT=3000
```

## Prisma

```bash
pnpm prisma:migrate -- --name init
pnpm prisma:generate
```

## Ejecutar

```bash
pnpm dev
```

Servidor:

```txt
http://localhost:3000
```

## Rutas principales

### Tiendas y productos

```txt
GET  /stores
POST /stores
GET  /products
POST /products
```

### Descuentos exclusivos

```txt
GET    /discounts
GET    /discounts?category=Moda%20elegante
GET    /discounts?storeId=1
GET    /discounts/:id
POST   /discounts
PUT    /discounts/:id
DELETE /discounts/:id
GET    /stores/:storeId/discounts
```

### Cupones

```txt
GET  /coupons
POST /coupons
POST /coupons/validate
```

### Checkout y pedidos

```txt
POST /checkout/summary
POST /orders
```

## Regla de descuentos

El backend calcula los precios finales. El frontend solo muestra el resultado.

Si un cupón no es acumulable y tambien existe un descuento automatico, el backend compara ambos y aplica el mayor. Si el cupón es acumulable, suma descuento automatico y descuento por cupon.

El pedido guarda:

- subtotal
- descuento automatico
- descuento por cupon
- descuento total
- total final
- items comprados
- cupon usado
- descuento automatico usado

Esto evita que una compra antigua cambie si despues se edita o elimina una promocion.

## Pruebas

Usa `requests.http` para crear datos de prueba, validar cupones y registrar pedidos.
