import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";

console.log("✓ All imports loaded successfully");

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DATA_DIR = join(__dirname, "data");
const DB_FILE = join(DATA_DIR, "store.db");
const LEGACY_FILE = join(DATA_DIR, "runtime.json");

console.log(`✓ Setup: PORT=${PORT}, DATA_DIR=${DATA_DIR}`);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_in_prod";

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

function ensureDataDir() {
  console.log(`📁 Ensuring data directory exists: ${DATA_DIR}`);
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
    console.log("✓ Data directory created");
  } else {
    console.log("✓ Data directory already exists");
  }
}

function readLegacyStore() {
  if (!existsSync(LEGACY_FILE)) return null;
  try {
    return JSON.parse(readFileSync(LEGACY_FILE, "utf8"));
  } catch (error) {
    console.warn("No se pudo leer runtime.json:", error.message);
    return null;
  }
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function productPayload(body) {
  const name = String(body.name || "").trim();
  const rawSlug = String(body.slug || "").trim();
  const imageUrl = String(body.imageUrl || "").trim();
  const slug = rawSlug ||
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

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

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    stock: Number(row.stock),
    sku: row.sku,
    slug: row.slug,
    imageUrl: row.imageUrl,
    description: row.description,
    featured: Boolean(row.featured)
  };
}

function rowToOrder(row) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    status: row.status,
    customer: row.customer,
    phone: row.phone,
    email: row.email,
    address: row.address,
    items: JSON.parse(row.items || "[]"),
    total: Number(row.total)
  };
}

function rowToLead(row) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    name: row.name,
    email: row.email,
    phone: row.phone,
    message: row.message
  };
}

function settingsFromRow(row) {
  if (!row) return seed.settings;
  return {
    whatsapp: row.whatsapp,
    gateway: row.gateway,
    ga: row.ga,
    pixel: row.pixel,
    gtm: row.gtm,
    metaDescription: row.metaDescription
  };
}

ensureDataDir();
console.log("✓ ensureDataDir() completed");

const db = new Database(DB_FILE);
console.log("✓ Database connection established");

function initializeDb() {
  console.log("🔄 Initializing database...");
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      whatsapp TEXT,
      gateway TEXT,
      ga TEXT,
      pixel TEXT,
      gtm TEXT,
      metaDescription TEXT
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      sku TEXT,
      slug TEXT,
      imageUrl TEXT,
      description TEXT,
      featured INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      status TEXT,
      customer TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      total REAL,
      items TEXT
    );
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      createdAt TEXT,
      name TEXT,
      email TEXT,
      phone TEXT,
      message TEXT
    );
  `);
    console.log("✓ Database tables initialized");
  } catch (error) {
    console.error("✗ Database initialization failed:", error.message);
    throw error;
  }
}

function seedDatabase() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM products").get().count;
  if (count > 0) return;
  const legacy = readLegacyStore();
  const data = legacy || seed;

  const insertSettings = db.prepare(`
    INSERT OR REPLACE INTO settings
      (id, whatsapp, gateway, ga, pixel, gtm, metaDescription)
    VALUES (1, ?, ?, ?, ?, ?, ?)
  `);
  const insertProduct = db.prepare(`
    INSERT INTO products
      (id, name, category, price, stock, sku, slug, imageUrl, description, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders
      (id, createdAt, status, customer, phone, email, address, total, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertLead = db.prepare(`
    INSERT OR IGNORE INTO leads
      (id, createdAt, name, email, phone, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((initial) => {
    insertSettings.run(
      initial.settings.whatsapp,
      initial.settings.gateway,
      initial.settings.ga,
      initial.settings.pixel,
      initial.settings.gtm,
      initial.settings.metaDescription
    );

    for (const product of initial.products) {
      insertProduct.run(
        product.id,
        product.name,
        product.category,
        product.price,
        product.stock,
        product.sku,
        product.slug,
        product.imageUrl || "",
        product.description,
        product.featured ? 1 : 0
      );
    }

    for (const order of initial.orders || []) {
      insertOrder.run(
        order.id,
        order.createdAt,
        order.status,
        order.customer,
        order.phone,
        order.email,
        order.address,
        order.total,
        JSON.stringify(order.items || [])
      );
    }

    for (const lead of initial.leads || []) {
      insertLead.run(
        lead.id,
        lead.createdAt,
        lead.name,
        lead.email,
        lead.phone,
        lead.message
      );
    }
  });

  transaction(data);
}

console.log("🚀 Starting server initialization...");
try {
  initializeDb();
  seedDatabase();
  console.log("✓ Database initialization and seeding completed");
} catch (error) {
  console.error("✗ Fatal error during initialization:", error);
  process.exit(1);
}

const app = express();

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) return res.status(401).json({ message: "No autorizado" });
  try {
    const payload = jwt.verify(m[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigin =
        !origin ||
        origin === FRONTEND_URL ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^https?:\/\/192\.168\.[0-9]+\.[0-9]+(:\d+)?$/.test(origin) ||
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

app.post("/api/login", (req, res) => {
  const password = String((req.body && req.body.password) || "");
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ message: "Credenciales inválidas" });
    return;
  }
  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ztw-commerce-backend" });
});

app.get("/api/storefront", (_req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY rowid DESC").all().map(rowToProduct);
  const settings = settingsFromRow(db.prepare("SELECT * FROM settings WHERE id = 1").get());
  res.json({ products, settings });
});

app.get("/api/admin", requireAuth, (_req, res) => {
  const products = db.prepare("SELECT * FROM products ORDER BY rowid DESC").all().map(rowToProduct);
  const orders = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all().map(rowToOrder);
  const leads = db.prepare("SELECT * FROM leads ORDER BY createdAt DESC").all().map(rowToLead);
  const settings = settingsFromRow(db.prepare("SELECT * FROM settings WHERE id = 1").get());
  res.json({ products, orders, leads, settings });
});

app.post("/api/products", requireAuth, (req, res) => {
  const payload = productPayload(req.body);
  if (!payload.name || !payload.category || !payload.sku) {
    res.status(400).json({ message: "Faltan campos obligatorios del producto." });
    return;
  }

  db.prepare(`
    INSERT INTO products
      (id, name, category, price, stock, sku, slug, imageUrl, description, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    payload.id,
    payload.name,
    payload.category,
    payload.price,
    payload.stock,
    payload.sku,
    payload.slug,
    payload.imageUrl,
    payload.description,
    payload.featured ? 1 : 0
  );

  res.status(201).json(payload);
});

app.put("/api/products/:id", requireAuth, (req, res) => {
  const payload = productPayload({ ...req.body, id: req.params.id });
  const result = db.prepare(`
    UPDATE products SET
      name = ?,
      category = ?,
      price = ?,
      stock = ?,
      sku = ?,
      slug = ?,
      imageUrl = ?,
      description = ?,
      featured = ?
    WHERE id = ?
  `).run(
    payload.name,
    payload.category,
    payload.price,
    payload.stock,
    payload.sku,
    payload.slug,
    payload.imageUrl,
    payload.description,
    payload.featured ? 1 : 0,
    payload.id
  );

  if (result.changes === 0) {
    res.status(404).json({ message: "Producto no encontrado." });
    return;
  }

  res.json(payload);
});

app.delete("/api/products/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

app.post("/api/orders", (req, res) => {
  const order = {
    id: makeId("order"),
    createdAt: new Date().toISOString(),
    status: "Nuevo",
    customer: String(req.body.customer || "").trim(),
    phone: String(req.body.phone || "").trim(),
    email: String(req.body.email || "").trim(),
    address: String(req.body.address || "").trim(),
    items: Array.isArray(req.body.items) ? req.body.items : [],
    total: Number(req.body.total || 0)
  };

  db.prepare(`
    INSERT INTO orders
      (id, createdAt, status, customer, phone, email, address, total, items)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    order.id,
    order.createdAt,
    order.status,
    order.customer,
    order.phone,
    order.email,
    order.address,
    order.total,
    JSON.stringify(order.items)
  );

  res.status(201).json(order);
});

app.post("/api/leads", (req, res) => {
  const lead = {
    id: makeId("lead"),
    createdAt: new Date().toISOString(),
    name: String(req.body.name || "").trim(),
    email: String(req.body.email || "").trim(),
    phone: String(req.body.phone || "").trim(),
    message: String(req.body.message || "").trim()
  };

  db.prepare(`
    INSERT INTO leads
      (id, createdAt, name, email, phone, message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    lead.id,
    lead.createdAt,
    lead.name,
    lead.email,
    lead.phone,
    lead.message
  );

  res.status(201).json(lead);
});

app.put("/api/settings", requireAuth, (req, res) => {
  const nextSettings = {
    whatsapp: String(req.body.whatsapp || "").trim(),
    gateway: String(req.body.gateway || "").trim(),
    ga: String(req.body.ga || "").trim(),
    pixel: String(req.body.pixel || "").trim(),
    gtm: String(req.body.gtm || "").trim(),
    metaDescription: String(req.body.metaDescription || "").trim()
  };

  db.prepare(`
    INSERT INTO settings
      (id, whatsapp, gateway, ga, pixel, gtm, metaDescription)
    VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      whatsapp = excluded.whatsapp,
      gateway = excluded.gateway,
      ga = excluded.ga,
      pixel = excluded.pixel,
      gtm = excluded.gtm,
      metaDescription = excluded.metaDescription
  `).run(
    nextSettings.whatsapp,
    nextSettings.gateway,
    nextSettings.ga,
    nextSettings.pixel,
    nextSettings.gtm,
    nextSettings.metaDescription
  );

  res.json(nextSettings);
});

app.listen(PORT, () => {
  console.log(`✓ ZTW backend running on port ${PORT}`);
  console.log(`🌐 FRONTEND_URL: ${FRONTEND_URL}`);
});
