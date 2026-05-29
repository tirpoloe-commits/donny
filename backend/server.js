import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DATA_DIR = join(__dirname, "data");
const DATA_FILE = join(DATA_DIR, "runtime.json");

const seed = {
  settings: {
    whatsapp: "51999999999",
    gateway: "Pendiente de definir",
    ga: "",
    pixel: "",
    gtm: "",
    metaDescription: "Ecommerce profesional con catalogo, carrito, cotizaciones y atencion por WhatsApp."
  },
  products: [
    {
      id: "prod-kit-starter",
      name: "Kit Profesional Starter",
      category: "Kits",
      price: 299,
      stock: 24,
      sku: "KIT-STARTER",
      slug: "kit-profesional-starter",
      description: "Pack completo para iniciar operaciones con presentacion comercial lista.",
      featured: true
    },
    {
      id: "prod-premium-a",
      name: "Producto Premium A",
      category: "Premium",
      price: 189,
      stock: 18,
      sku: "PREM-A",
      slug: "producto-premium-a",
      description: "Producto destacado con acabado superior y alta rotacion comercial.",
      featured: false
    },
    {
      id: "prod-accesorio-essential",
      name: "Accesorio Essential",
      category: "Accesorios",
      price: 59,
      stock: 42,
      sku: "ACC-ESS",
      slug: "accesorio-essential",
      description: "Complemento practico para aumentar el valor de cada compra.",
      featured: false
    },
    {
      id: "prod-pack-corporativo",
      name: "Pack Corporativo",
      category: "Empresas",
      price: 549,
      stock: 12,
      sku: "PACK-CORP",
      slug: "pack-corporativo",
      description: "Solucion pensada para pedidos institucionales y compras por volumen.",
      featured: false
    },
    {
      id: "prod-servicio-instalacion",
      name: "Servicio de Instalacion",
      category: "Servicios",
      price: 120,
      stock: 99,
      sku: "SERV-INST",
      slug: "servicio-instalacion",
      description: "Asistencia tecnica para completar la experiencia post compra.",
      featured: false
    },
    {
      id: "prod-eco-line",
      name: "Producto Eco Line",
      category: "Eco",
      price: 89,
      stock: 30,
      sku: "ECO-LINE",
      slug: "producto-eco-line",
      description: "Alternativa eficiente con enfoque sostenible y precio competitivo.",
      featured: false
    }
  ],
  orders: [],
  leads: []
};

function ensureStore() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
}

function readStore() {
  ensureStore();
  return JSON.parse(readFileSync(DATA_FILE, "utf8"));
}

function writeStore(store) {
  writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function productPayload(body) {
  const name = String(body.name || "").trim();
  const rawSlug = String(body.slug || "").trim();
  const imageUrl = String(body.imageUrl || "").trim();
  const slug = rawSlug || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id: body.id || makeId("prod"),
    name,
    category: String(body.category || "").trim(),
    price: Number(body.price || 0),
    stock: Number(body.stock || 0),
    sku: String(body.sku || "").trim(),
    slug,
    imageUrl: imageUrl || (/^https?:\/\//.test(rawSlug) ? rawSlug : ""),
    description: String(body.description || "").trim(),
    featured: Boolean(body.featured)
  };
}

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigin =
        !origin ||
        origin === FRONTEND_URL ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        origin.includes("onrender.com");

      if (allowedOrigin) {
        callback(null, true);
        return;
      }
      callback(new Error("Origen no permitido por CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.options("*", cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ztw-commerce-backend" });
});

app.get("/api/storefront", (_req, res) => {
  const store = readStore();
  res.json({
    products: store.products,
    settings: store.settings
  });
});

app.get("/api/admin", (_req, res) => {
  res.json(readStore());
});

app.post("/api/products", (req, res) => {
  const store = readStore();
  const payload = productPayload(req.body);
  if (!payload.name || !payload.category || !payload.sku) {
    res.status(400).json({ message: "Faltan campos obligatorios del producto." });
    return;
  }
  store.products.unshift(payload);
  writeStore(store);
  res.status(201).json(payload);
});

app.put("/api/products/:id", (req, res) => {
  const store = readStore();
  const index = store.products.findIndex((product) => product.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ message: "Producto no encontrado." });
    return;
  }
  const payload = productPayload({ ...req.body, id: req.params.id });
  store.products[index] = payload;
  writeStore(store);
  res.json(payload);
});

app.delete("/api/products/:id", (req, res) => {
  const store = readStore();
  store.products = store.products.filter((product) => product.id !== req.params.id);
  writeStore(store);
  res.status(204).end();
});

app.post("/api/orders", (req, res) => {
  const store = readStore();
  const order = {
    id: makeId("order"),
    createdAt: new Date().toISOString(),
    status: "Nuevo",
    customer: req.body.customer,
    phone: req.body.phone,
    email: req.body.email,
    address: req.body.address,
    items: Array.isArray(req.body.items) ? req.body.items : [],
    total: Number(req.body.total || 0)
  };
  store.orders.unshift(order);
  writeStore(store);
  res.status(201).json(order);
});

app.post("/api/leads", (req, res) => {
  const store = readStore();
  const lead = {
    id: makeId("lead"),
    createdAt: new Date().toISOString(),
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    message: req.body.message
  };
  store.leads.unshift(lead);
  writeStore(store);
  res.status(201).json(lead);
});

app.put("/api/settings", (req, res) => {
  const store = readStore();
  store.settings = {
    whatsapp: String(req.body.whatsapp || "").trim(),
    gateway: String(req.body.gateway || "").trim(),
    ga: String(req.body.ga || "").trim(),
    pixel: String(req.body.pixel || "").trim(),
    gtm: String(req.body.gtm || "").trim(),
    metaDescription: String(req.body.metaDescription || "").trim()
  };
  writeStore(store);
  res.json(store.settings);
});

app.listen(PORT, () => {
  console.log(`ZTW backend running on port ${PORT}`);
});
