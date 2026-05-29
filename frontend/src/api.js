const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
const API_URL = configuredUrl.startsWith("http") ? configuredUrl : `https://${configuredUrl}`;

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error de servidor" }));
    throw new Error(error.message || "Error de servidor");
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  storefront: () => request("/api/storefront"),
  admin: () => request("/api/admin"),
  createOrder: (payload) => request("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
  createLead: (payload) => request("/api/leads", { method: "POST", body: JSON.stringify(payload) }),
  createProduct: (payload) => request("/api/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  updateSettings: (payload) => request("/api/settings", { method: "PUT", body: JSON.stringify(payload) })
};
