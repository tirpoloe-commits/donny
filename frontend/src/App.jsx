import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const emptyProduct = {
  id: "",
  name: "",
  category: "",
  price: "",
  stock: "",
  sku: "",
  slug: "",
  imageUrl: "",
  description: "",
  featured: false
};

const emptySettings = {
  whatsapp: "",
  gateway: "",
  ga: "",
  pixel: "",
  gtm: "",
  metaDescription: ""
};

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN"
});

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function productImage(product) {
  return product.imageUrl || (/^https?:\/\//.test(product.slug || "") ? product.slug : "");
}

function App() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(emptySettings);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [query, setQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [adminTab, setAdminTab] = useState("products");
  const [productForm, setProductForm] = useState(emptyProduct);
  const [settingsForm, setSettingsForm] = useState(emptySettings);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const featured = products.find((product) => product.featured) || products[0];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch = activeCategory === "Todas" || product.category === activeCategory;
      const text = `${product.name} ${product.sku} ${product.description}`.toLowerCase();
      return categoryMatch && text.includes(query.toLowerCase());
    });
  }, [activeCategory, products, query]);

  const cartItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((candidate) => candidate.id === item.id);
        return product ? { ...product, quantity: item.quantity } : null;
      })
      .filter(Boolean);
  }, [cart, products]);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    loadStorefront();
  }, []);

  useEffect(() => {
    document.title = "ZTW Commerce | Ecommerce profesional";
    const meta = document.querySelector('meta[name="description"]');
    if (meta && settings.metaDescription) meta.setAttribute("content", settings.metaDescription);
    injectMeasurement(settings);
  }, [settings]);

  async function loadStorefront() {
    try {
      const data = await api.storefront();
      setProducts(data.products);
      setSettings(data.settings);
      setSettingsForm(data.settings);
    } catch (error) {
      showNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAdmin() {
    try {
      const data = await api.admin();
      setProducts(data.products);
      setOrders(data.orders);
      setLeads(data.leads);
      setSettings(data.settings);
      setSettingsForm(data.settings);
    } catch (error) {
      showNotice(error.message);
    }
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function addToCart(productId) {
    setCart((current) => {
      const existing = current.find((item) => item.id === productId);
      if (existing) return current.map((item) => (item.id === productId ? { ...item, quantity: item.quantity + 1 } : item));
      return [...current, { id: productId, quantity: 1 }];
    });
    showNotice("Producto agregado al carrito.");
  }

  function updateQuantity(productId, quantity) {
    setCart((current) => {
      if (quantity <= 0) return current.filter((item) => item.id !== productId);
      return current.map((item) => (item.id === productId ? { ...item, quantity } : item));
    });
  }

  function whatsappUrl(prefix = "Hola, quiero cotizar estos productos:") {
    const lines = cartItems.length
      ? cartItems.map((item) => `- ${item.name} x${item.quantity}`)
      : ["Quiero recibir informacion comercial."];
    const text = encodeURIComponent(`${prefix}\n${lines.join("\n")}\nTotal referencial: ${money.format(subtotal)}`);
    return `https://wa.me/${settings.whatsapp}?text=${text}`;
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!cartItems.length) {
      showNotice("Agrega productos antes de registrar el pedido.");
      return;
    }
    const form = new FormData(event.currentTarget);
    try {
      await api.createOrder({
        customer: form.get("customer"),
        phone: form.get("phone"),
        email: form.get("email"),
        address: form.get("address"),
        total: subtotal,
        items: cartItems.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      });
      setCart([]);
      event.currentTarget.reset();
      showNotice("Pedido registrado correctamente.");
      await loadAdmin();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function submitLead(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api.createLead({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        message: form.get("message")
      });
      event.currentTarget.reset();
      showNotice("Consulta enviada correctamente.");
      await loadAdmin();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const payload = {
      ...productForm,
      price: Number(productForm.price),
      stock: Number(productForm.stock)
    };
    try {
      if (payload.id) await api.updateProduct(payload.id, payload);
      else await api.createProduct(payload);
      setProductForm(emptyProduct);
      showNotice("Producto guardado.");
      await loadAdmin();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function removeProduct(productId) {
    try {
      await api.deleteProduct(productId);
      showNotice("Producto eliminado.");
      await loadAdmin();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    try {
      const nextSettings = await api.updateSettings(settingsForm);
      setSettings(nextSettings);
      showNotice("Configuracion actualizada.");
    } catch (error) {
      showNotice(error.message);
    }
  }

  function openAdmin() {
    setAdminOpen(true);
    loadAdmin();
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  return (
    <>
      <header className="site-header sticky-top">
        <div className="promo-strip">
          <div className="container-xxl d-flex flex-wrap align-items-center justify-content-between gap-2 px-3">
            <strong>DELIVERY GRATIS!</strong>
            <span>Compras mayores a S/199</span>
            <a href={whatsappUrl("Hola, quiero informacion comercial:")} target="_blank" rel="noreferrer">Atencion por WhatsApp</a>
          </div>
        </div>
        <div className="main-header bg-white">
          <div className="container-xxl px-3">
            <div className="d-flex align-items-center justify-content-between gap-3 py-3">
              <a className="brand-lockup" href="#inicio">
                <span className="brand-mark">Z</span>
                <span>
                  <strong>ZTW Commerce</strong>
                  <small>Delivery & ecommerce</small>
                </span>
              </a>
              <div className="delivery-box d-none d-lg-flex">
                <span>Ingresa tu direccion</span>
                <strong>Direccion de Delivery</strong>
              </div>
              <div className="header-actions">
                <button className="btn btn-link header-link" type="button" onClick={openAdmin}>Admin</button>
                <button className="cart-pill" type="button" onClick={() => setCartOpen(true)}>
                  <span>Mi carrito</span>
                  <strong>{totalUnits}</strong>
                </button>
              </div>
            </div>
          </div>
        </div>
        <nav className="category-nav">
          <div className="container-xxl px-3">
            <div className="category-scroll">
              <a href="#catalogo">Catalogo</a>
              <a href="#categorias">Categorias</a>
              <a href="#contacto">Contacto</a>
              {["Todas", ...categories].map((category) => (
                <button
                  key={category}
                  className={activeCategory === category ? "active" : ""}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    document.querySelector("#catalogo")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="category-hero" id="inicio">
          <div className="container-xxl px-3">
            <div className="breadcrumb-row">
              <a href="#inicio">Home</a>
              <span>/</span>
              <a href="#categorias">Categorias</a>
              <span>/</span>
              <strong>{activeCategory === "Todas" ? "Todo" : activeCategory}</strong>
            </div>
            <div className="banner-panel">
              <div>
                <span className="banner-tag">Llena tu carrito</span>
                <h1>{activeCategory === "Todas" ? "Productos para comprar online" : activeCategory}</h1>
                <p>Selecciona la categoria de productos que deseas ver, agrega al carrito o cotiza por WhatsApp.</p>
              </div>
              <div className="featured-ticket">
                <small>Producto destacado</small>
                <strong>{featured?.name}</strong>
                <span>{featured ? money.format(featured.price) : ""}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="service-strip">
          <div className="container-xxl px-3">
            <div className="row g-2">
              {[
                ["Envio regular", "Entrega programada"],
                ["Delivery Express", "Atencion rapida"],
                ["WhatsApp", "Cotizacion comercial"],
                ["Admin", "Gestion de tienda"]
              ].map(([title, detail]) => (
                <div className="col-6 col-lg-3" key={title}>
                  <div className="service-item">
                    <strong>{title}</strong>
                    <span>{detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="categories-section" id="categorias">
          <div className="container-xxl px-3">
            <div className="section-title-row">
              <h2>Linea de productos</h2>
              <span>Selecciona la categoria de productos que deseas ver.</span>
            </div>
            <div className="category-chip-grid">
              {["Todas", ...categories].map((category) => (
                <button
                  key={category}
                  className={`category-chip ${activeCategory === category ? "active" : ""}`}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                >
                  <span>{category}</span>
                  <strong>{category === "Todas" ? products.length : products.filter((item) => item.category === category).length}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="catalog-page" id="catalogo">
          <div className="container-xxl px-3">
            <div className="catalog-layout">
              <aside className="filter-panel">
                <h2>Filtros</h2>
                <div className="filter-group">
                  <strong>Ofertas / Novedades</strong>
                  <label><input type="checkbox" readOnly /> En oferta (0)</label>
                  <label><input type="checkbox" readOnly checked /> Nuevos ({products.filter((product) => product.featured).length || 4})</label>
                </div>
                <div className="filter-group">
                  <strong>Linea de productos</strong>
                  <button className={activeCategory === "Todas" ? "active" : ""} type="button" onClick={() => setActiveCategory("Todas")}>
                    Seleccionar todos <span>{products.length}</span>
                  </button>
                  {categories.map((category) => (
                    <button className={activeCategory === category ? "active" : ""} key={category} type="button" onClick={() => setActiveCategory(category)}>
                      {category} <span>{products.filter((item) => item.category === category).length}</span>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="catalog-content">
                <div className="catalog-toolbar">
                  <div>
                    <h2>{activeCategory === "Todas" ? "Todo" : activeCategory}</h2>
                    <p>Selecciona la categoria de productos que deseas ver.</p>
                  </div>
                  <div className="toolbar-controls">
                    <input className="form-control" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar producto o SKU" />
                    <select className="form-select" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)}>
                      <option>Todas</option>
                      {categories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                </div>

                <div className="product-grid">
                  {filteredProducts.map((product, index) => (
                    <article className="product-card" key={product.id}>
                      <div className="product-badges">
                        {(product.featured || index % 3 === 0) && <span>Nuevo</span>}
                      </div>
                      <ProductMedia product={product} />
                      <div className="product-copy">
                        <small>{product.category} | {product.sku}</small>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>
                        <div className="price-row">
                          <strong>{money.format(product.price)}</strong>
                          <span>un</span>
                        </div>
                        <button className="add-cart-button" type="button" onClick={() => addToCart(product.id)}>
                          Agregar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="payment-band">
          <div className="container-xxl px-3">
            <div className="row g-4 align-items-center">
              <div className="col-lg-8">
                <h2>Flujo flexible para cerrar ventas.</h2>
                <p>
                  Registra pedidos, envia cotizaciones por WhatsApp y prepara la pasarela que quieras usar en Render.
                </p>
              </div>
              <div className="col-lg-4">
                <div className="payment-card">
                  <span>Pasarela configurada</span>
                  <strong>{settings.gateway || "Pendiente de definir"}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="contact-section" id="contacto">
          <div className="container-xxl px-3">
            <div className="row g-5">
              <div className="col-lg-5">
                <h2>Contactanos</h2>
                <p>Recibe consultas comerciales y guarda el seguimiento en el backend.</p>
                <div className="contact-card">
                  <strong>219-5600</strong>
                  <span>central@ztw-commerce.com</span>
                </div>
              </div>
              <div className="col-lg-7">
                <form className="lead-card" onSubmit={submitLead}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nombre</label>
                      <input className="form-control" name="name" required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input className="form-control" name="email" type="email" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Telefono</label>
                      <input className="form-control" name="phone" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Mensaje</label>
                      <textarea className="form-control" name="message" rows="4" required />
                    </div>
                    <div className="col-12">
                      <button className="add-cart-button form-submit" type="submit">Enviar consulta</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        subtotal={subtotal}
        onQuantity={updateQuantity}
        onSubmit={submitOrder}
        whatsappUrl={whatsappUrl}
      />

      <AdminDrawer
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        tab={adminTab}
        setTab={setAdminTab}
        products={products}
        orders={orders}
        leads={leads}
        productForm={productForm}
        setProductForm={setProductForm}
        settingsForm={settingsForm}
        setSettingsForm={setSettingsForm}
        saveProduct={saveProduct}
        removeProduct={removeProduct}
        saveSettings={saveSettings}
      />

      {notice && <div className="toast-message shadow">{notice}</div>}
    </>
  );
}

function CartDrawer({ open, onClose, items, subtotal, onQuantity, onSubmit, whatsappUrl }) {
  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer-panel">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h4 mb-0">Carrito</h2>
          <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Cerrar</button>
        </div>
        <div className="vstack gap-3">
          {items.length ? items.map((item) => (
            <div className="card" key={item.id}>
              <div className="card-body">
                <div className="d-flex justify-content-between gap-3">
                  <strong>{item.name}</strong>
                  <span>{money.format(item.price * item.quantity)}</span>
                </div>
                <div className="d-flex align-items-center gap-2 mt-3">
                  <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => onQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => onQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
            </div>
          )) : <p className="text-secondary">Tu carrito esta vacio.</p>}
        </div>
        <div className="border-top border-bottom py-3 my-4 d-flex justify-content-between">
          <span>Subtotal</span>
          <strong>{money.format(subtotal)}</strong>
        </div>
        <form className="vstack gap-3" onSubmit={onSubmit}>
          <input className="form-control" name="customer" placeholder="Nombre completo" required />
          <input className="form-control" name="phone" placeholder="Telefono" required />
          <input className="form-control" name="email" type="email" placeholder="Email" required />
          <textarea className="form-control" name="address" rows="3" placeholder="Direccion de entrega" required />
          <button className="btn btn-success btn-lg" type="submit">Registrar pedido</button>
          <a className="btn btn-outline-success btn-lg" href={whatsappUrl()} target="_blank" rel="noreferrer">Enviar por WhatsApp</a>
        </form>
      </aside>
    </div>
  );
}

function AdminDrawer(props) {
  const {
    open,
    onClose,
    tab,
    setTab,
    products,
    orders,
    leads,
    productForm,
    setProductForm,
    settingsForm,
    setSettingsForm,
    saveProduct,
    removeProduct,
    saveSettings
  } = props;

  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer-panel admin-panel">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="h4 mb-0">Panel administrativo</h2>
          <button className="btn btn-outline-secondary" type="button" onClick={onClose}>Cerrar</button>
        </div>
        <div className="nav nav-pills gap-2 mb-4">
          {[
            ["products", "Productos"],
            ["orders", "Pedidos"],
            ["content", "Contenidos"],
            ["leads", "Leads"]
          ].map(([key, label]) => (
            <button key={key} className={`nav-link ${tab === key ? "active" : ""}`} type="button" onClick={() => setTab(key)}>{label}</button>
          ))}
        </div>

        {tab === "products" && (
          <div className="row g-4">
            <div className="col-lg-5">
              <form className="card" onSubmit={saveProduct}>
                <div className="card-body vstack gap-3">
                  <input className="form-control" placeholder="Nombre" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value, slug: productForm.slug || slugify(event.target.value) })} required />
                  <input className="form-control" placeholder="Categoria" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} required />
                  <input className="form-control" placeholder="Precio" type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} required />
                  <input className="form-control" placeholder="Stock" type="number" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} required />
                  <input className="form-control" placeholder="SKU" value={productForm.sku} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} required />
                  <input className="form-control" placeholder="URL amigable del producto" value={productForm.slug} onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })} />
                  <input className="form-control" placeholder="Imagen URL (https://...)" value={productForm.imageUrl || ""} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} />
                  <textarea className="form-control" placeholder="Descripcion" rows="3" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} required />
                  <div className="form-check">
                    <input className="form-check-input" id="featured" type="checkbox" checked={productForm.featured} onChange={(event) => setProductForm({ ...productForm, featured: event.target.checked })} />
                    <label className="form-check-label" htmlFor="featured">Destacado</label>
                  </div>
                  <button className="btn btn-success" type="submit">Guardar producto</button>
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setProductForm(emptyProduct)}>Nuevo</button>
                </div>
              </form>
            </div>
            <div className="col-lg-7">
              <div className="vstack gap-3">
                {products.map((product) => (
                  <div className="card" key={product.id}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between gap-3">
                        <strong>{product.name}</strong>
                        <span>{money.format(product.price)}</span>
                      </div>
                      <p className="small text-secondary mb-3">{product.category} | SKU {product.sku} | Stock {product.stock}</p>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-success" type="button" onClick={() => setProductForm(product)}>Editar</button>
                        <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removeProduct(product.id)}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="vstack gap-3">
            {orders.length ? orders.map((order) => (
              <div className="card" key={order.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-3">
                    <strong>{order.customer}</strong>
                    <span>{money.format(order.total)}</span>
                  </div>
                  <p className="small text-secondary mb-0">{order.phone} | {order.email} | {order.status}</p>
                </div>
              </div>
            )) : <p className="text-secondary">No hay pedidos registrados.</p>}
          </div>
        )}

        {tab === "content" && (
          <form className="card" onSubmit={saveSettings}>
            <div className="card-body row g-3">
              <div className="col-md-6">
                <label className="form-label">WhatsApp comercial</label>
                <input className="form-control" value={settingsForm.whatsapp} onChange={(event) => setSettingsForm({ ...settingsForm, whatsapp: event.target.value })} required />
              </div>
              <div className="col-md-6">
                <label className="form-label">Pasarela</label>
                <input className="form-control" value={settingsForm.gateway} onChange={(event) => setSettingsForm({ ...settingsForm, gateway: event.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Google Analytics</label>
                <input className="form-control" value={settingsForm.ga} onChange={(event) => setSettingsForm({ ...settingsForm, ga: event.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Meta Pixel</label>
                <input className="form-control" value={settingsForm.pixel} onChange={(event) => setSettingsForm({ ...settingsForm, pixel: event.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Tag Manager</label>
                <input className="form-control" value={settingsForm.gtm} onChange={(event) => setSettingsForm({ ...settingsForm, gtm: event.target.value })} />
              </div>
              <div className="col-12">
                <label className="form-label">Metadescripcion</label>
                <textarea className="form-control" rows="3" value={settingsForm.metaDescription} onChange={(event) => setSettingsForm({ ...settingsForm, metaDescription: event.target.value })} />
              </div>
              <div className="col-12">
                <button className="btn btn-success" type="submit">Guardar configuracion</button>
              </div>
            </div>
          </form>
        )}

        {tab === "leads" && (
          <div className="vstack gap-3">
            {leads.length ? leads.map((lead) => (
              <div className="card" key={lead.id}>
                <div className="card-body">
                  <div className="d-flex justify-content-between gap-3">
                    <strong>{lead.name}</strong>
                    <span>{lead.phone}</span>
                  </div>
                  <p className="small text-secondary">{lead.email}</p>
                  <p className="mb-0">{lead.message}</p>
                </div>
              </div>
            )) : <p className="text-secondary">No hay leads registrados.</p>}
          </div>
        )}
      </aside>
    </div>
  );
}

function injectMeasurement(settings) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: "ztw_page_ready" });

  if (settings.ga && !document.querySelector(`[data-measurement="ga-${settings.ga}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(settings.ga)}`;
    script.dataset.measurement = `ga-${settings.ga}`;
    document.head.appendChild(script);
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", settings.ga);
  }

  if (settings.gtm && !document.querySelector(`[data-measurement="gtm-${settings.gtm}"]`)) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(settings.gtm)}`;
    script.dataset.measurement = `gtm-${settings.gtm}`;
    document.head.appendChild(script);
  }

  if (settings.pixel && !document.querySelector(`[data-measurement="pixel-${settings.pixel}"]`)) {
    window.fbq = function fbq() {
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
    };
    window.fbq.queue = [];
    window.fbq.loaded = true;
    window.fbq.version = "2.0";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.dataset.measurement = `pixel-${settings.pixel}`;
    document.head.appendChild(script);
    window.fbq("init", settings.pixel);
    window.fbq("track", "PageView");
  }
}

export default App;

function ProductMedia({ product }) {
  const [failed, setFailed] = useState(false);
  const image = productImage(product);

  if (!image || failed) {
    return (
      <div className="product-art">
        <span>{initials(product.name)}</span>
      </div>
    );
  }

  return (
    <div className="product-art has-image">
      <img src={image} alt={product.name} loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}
