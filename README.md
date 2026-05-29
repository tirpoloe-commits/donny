# ZTW Commerce

Ecommerce profesional listo para probar en Render con frontend React + Vite + Bootstrap y backend Express.

## Estructura

- `frontend/`: tienda React, catalogo, carrito, checkout, WhatsApp, formulario de leads y panel admin.
- `backend/`: API REST para productos, pedidos, leads y configuracion.
- `render.yaml`: blueprint para desplegar frontend y backend en Render.

## Desarrollo local

Necesitas Node.js 20 o superior.

```bash
npm install
npm run install:all
npm run dev
```

URLs locales:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/health`

## Variables

Frontend (`frontend/.env`):

```bash
VITE_API_URL=http://localhost:4000
```

Backend (`backend/.env`):

```bash
PORT=4000
FRONTEND_URL=http://localhost:5173
```

## Render

1. Sube este repositorio a GitHub.
2. En Render, crea un Blueprint usando `render.yaml`.
3. Render creara dos servicios:
   - `ztw-commerce-backend`
   - `ztw-commerce-frontend`
4. Cuando ambos esten activos, abre el frontend y entra a `Admin` para configurar WhatsApp, pasarela y medicion.

## Panel administrativo

Desde `Admin` puedes:

- Crear, editar y eliminar productos.
- Ver pedidos del checkout.
- Ver leads del formulario.
- Configurar WhatsApp comercial.
- Configurar pasarela de pagos.
- Configurar Google Analytics, Meta Pixel y Google Tag Manager.

Nota: el backend usa un archivo JSON local para facilitar pruebas en Render. Para produccion real conviene reemplazarlo por PostgreSQL, MongoDB o una base gestionada.
