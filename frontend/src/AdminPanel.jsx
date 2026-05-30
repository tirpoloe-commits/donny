import { useEffect, useState } from "react";
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

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [leads, setLeads] = useState([]);
  const [settings, setSettings] = useState(emptySettings);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [settingsForm, setSettingsForm] = useState(emptySettings);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdmin();
  }, []);

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
    } finally {
      setLoading(false);
    }
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
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

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary">
        <div className="spinner-border text-success" role="status" />
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-body-secondary">
      <header className="bg-white border-bottom sticky-top">
        <div className="container-xxl px-3 py-3 d-flex justify-content-between align-items-center">
          <h1 className="h3 mb-0">Panel Administrativo</h1>
          <button className="btn btn-outline-danger" type="button" onClick={onLogout}>
            Salir
          </button>
        </div>
      </header>

      <main className="container-xxl px-3 py-4">
        <div className="nav nav-pills gap-2 mb-4">
          {[
            ["products", "Productos"],
            ["orders", "Pedidos"],
            ["leads", "Leads"],
            ["settings", "Configuracion"]
          ].map(([key, label]) => (
            <button
              key={key}
              className={`nav-link ${tab === key ? "active" : ""}`}
              type="button"
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="row g-4">
            <div className="col-lg-5">
              <form className="card" onSubmit={saveProduct}>
                <div className="card-body vstack gap-3">
                  <h5>Formulario de producto</h5>
                  <input
                    className="form-control"
                    placeholder="Nombre"
                    value={productForm.name}
                    onChange={(event) =>
                      setProductForm({
                        ...productForm,
                        name: event.target.value,
                        slug: productForm.slug || slugify(event.target.value)
                      })
                    }
                    required
                  />
                  <input
                    className="form-control"
                    placeholder="Categoria"
                    value={productForm.category}
                    onChange={(event) => setProductForm({ ...productForm, category: event.target.value })}
                    required
                  />
                  <input
                    className="form-control"
                    placeholder="Precio"
                    type="number"
                    value={productForm.price}
                    onChange={(event) => setProductForm({ ...productForm, price: event.target.value })}
                    required
                  />
                  <input
                    className="form-control"
                    placeholder="Stock"
                    type="number"
                    value={productForm.stock}
                    onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })}
                    required
                  />
                  <input
                    className="form-control"
                    placeholder="SKU"
                    value={productForm.sku}
                    onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })}
                    required
                  />
                  <input
                    className="form-control"
                    placeholder="URL amigable del producto"
                    value={productForm.slug}
                    onChange={(event) => setProductForm({ ...productForm, slug: event.target.value })}
                  />
                  <input
                    className="form-control"
                    placeholder="Imagen URL (https://...)"
                    value={productForm.imageUrl || ""}
                    onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })}
                  />
                  <textarea
                    className="form-control"
                    placeholder="Descripcion"
                    rows="3"
                    value={productForm.description}
                    onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
                    required
                  />
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      id="featured"
                      type="checkbox"
                      checked={productForm.featured}
                      onChange={(event) => setProductForm({ ...productForm, featured: event.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="featured">
                      Destacado
                    </label>
                  </div>
                  <button className="btn btn-success" type="submit">
                    Guardar producto
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setProductForm(emptyProduct)}
                  >
                    Nuevo
                  </button>
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
                      <p className="small text-secondary mb-3">
                        {product.category} | SKU {product.sku} | Stock {product.stock}
                      </p>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-success"
                          type="button"
                          onClick={() => setProductForm(product)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          onClick={() => removeProduct(product.id)}
                        >
                          Eliminar
                        </button>
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
            {orders.length ? (
              orders.map((order) => (
                <div className="card" key={order.id}>
                  <div className="card-body">
                    <div className="d-flex justify-content-between gap-3">
                      <strong>{order.customer}</strong>
                      <span>{money.format(order.total)}</span>
                    </div>
                    <p className="small text-secondary mb-0">
                      {order.phone} | {order.email} | {order.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-secondary">No hay pedidos registrados.</p>
            )}
          </div>
        )}

        {tab === "leads" && (
          <div className="vstack gap-3">
            {leads.length ? (
              leads.map((lead) => (
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
              ))
            ) : (
              <p className="text-secondary">No hay leads registrados.</p>
            )}
          </div>
        )}

        {tab === "settings" && (
          <form className="card" onSubmit={saveSettings}>
            <div className="card-body row g-3">
              <h5 className="col-12">Configuracion de tienda</h5>
              <div className="col-md-6">
                <label className="form-label">WhatsApp comercial</label>
                <input
                  className="form-control"
                  value={settingsForm.whatsapp}
                  onChange={(event) => setSettingsForm({ ...settingsForm, whatsapp: event.target.value })}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Pasarela</label>
                <input
                  className="form-control"
                  value={settingsForm.gateway}
                  onChange={(event) => setSettingsForm({ ...settingsForm, gateway: event.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Google Analytics</label>
                <input
                  className="form-control"
                  value={settingsForm.ga}
                  onChange={(event) => setSettingsForm({ ...settingsForm, ga: event.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Meta Pixel</label>
                <input
                  className="form-control"
                  value={settingsForm.pixel}
                  onChange={(event) => setSettingsForm({ ...settingsForm, pixel: event.target.value })}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Tag Manager</label>
                <input
                  className="form-control"
                  value={settingsForm.gtm}
                  onChange={(event) => setSettingsForm({ ...settingsForm, gtm: event.target.value })}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Metadescripcion</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={settingsForm.metaDescription}
                  onChange={(event) => setSettingsForm({ ...settingsForm, metaDescription: event.target.value })}
                />
              </div>
              <div className="col-12">
                <button className="btn btn-success" type="submit">
                  Guardar configuracion
                </button>
              </div>
            </div>
          </form>
        )}
      </main>

      {notice && <div className="toast-message shadow">{notice}</div>}
    </div>
  );
}
