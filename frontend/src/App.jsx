import { useEffect, useState } from "react";
import { Storefront } from "./Storefront.jsx";
import { AdminPanel } from "./AdminPanel.jsx";
import { AdminLogin } from "./AdminLogin.jsx";

function App() {
  const [page, setPage] = useState("storefront"); // storefront, admin-login, admin
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);

  useEffect(() => {
    // Verificar si hay token guardado en localStorage al cargar
    const token = localStorage.getItem("ztw_admin_token");
    if (token) {
      setIsAdminAuthed(true);
    }
  }, []);

  function handleAdminClick() {
    if (isAdminAuthed) {
      setPage("admin");
    } else {
      setPage("admin-login");
    }
  }

  function handleAdminLogin() {
    setIsAdminAuthed(true);
    setPage("admin");
  }

  function handleAdminLogout() {
    localStorage.removeItem("ztw_admin_token");
    setIsAdminAuthed(false);
    setPage("storefront");
  }

  if (page === "storefront") {
    return <Storefront onAdminClick={handleAdminClick} />;
  }

  if (page === "admin-login") {
    return <AdminLogin onLogin={handleAdminLogin} />;
  }

  if (page === "admin") {
    return <AdminPanel onLogout={handleAdminLogout} />;
  }

  return <Storefront onAdminClick={handleAdminClick} />;
}

export default App;

