import { useState } from "react";
import { api } from "./api";

export function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api.login(password);
      if (data && data.token) {
        localStorage.setItem("ztw_admin_token", data.token);
        onLogin();
      } else {
        setError("No se obtuvo token de autenticacion");
      }
    } catch (err) {
      setError(err.message || "Error al iniciar sesion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-body-tertiary">
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="card-body p-5 text-center">
          <h1 className="h3 mb-4">ZTW Admin</h1>
          <p className="text-secondary mb-4">Ingresa la contraseña para acceder al panel administrativo</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <input
                className="form-control form-control-lg"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
            </div>

            {error && <div className="alert alert-danger mb-3 small">{error}</div>}

            <button
              className="btn btn-success w-100 btn-lg"
              type="submit"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <p className="text-secondary small mt-4 mb-0">
            Demo password: <code>admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
