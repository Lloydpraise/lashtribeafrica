import { useEffect, useRef, useState } from "react";
import Sidebar, { NAV_ITEMS } from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import MobileTabs from "./components/MobileTabs.jsx";
import Dashboard from "./sections/Dashboard.jsx";
import Products from "./sections/Products.jsx";
import Courses from "./sections/Courses.jsx";
import Customers from "./sections/Customers.jsx";
import Orders from "./sections/Orders.jsx";
import SiteSettings from "./sections/SiteSettings.jsx";
import Kits from "./sections/Kits.jsx";
import Offers from "./sections/Offers.jsx";
import Policies from "./sections/Policies.jsx";
import AdminLogin from "./AdminLogin.jsx";
import { supabase } from "../services/service.js";
import "./admin.css";
import "./admin-mobile.css";
import "./admin-customers.css";

const HAS_DB = Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

const SECTIONS = {
  dashboard: { title: "Dashboard", subtitle: "Ecommerce + Academy overview", Component: Dashboard },
  products: {
    title: "Products",
    subtitle: "Ecommerce catalog",
    Component: Products,
    action: (
      <button
        className="admin-btn"
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("admin:add-product"))}
      >
        + Add Product
      </button>
    ),
  },
  courses: {
    title: "Courses",
    subtitle: "Video & story courses, pricing and bundles",
    Component: Courses,
    action: (
      <button
        className="admin-btn"
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("admin:add-course"))}
      >
        + New Course
      </button>
    ),
  },
  customers: { title: "Customers", subtitle: "People who've bought from you", Component: Customers },
  orders: { title: "Orders", subtitle: "Ecommerce + Academy purchases", Component: Orders },
  settings: { title: "Site Settings", subtitle: "Hero, countdown & announcement ticker", Component: SiteSettings },
  kits: { title: "Kits", subtitle: "Kit Strip bundles — pick which one is live", Component: Kits },
  offers: { title: "Offers", subtitle: "% off and free shipping promotions", Component: Offers },
  policies: { title: "Policies", subtitle: "Privacy, shipping & terms pages", Component: Policies },
};

function sectionFromHash() {
  const key = window.location.hash.replace("#", "");
  return SECTIONS[key] ? key : "dashboard";
}

function AdminShell({ onLogout }) {
  const [active, setActive] = useState("dashboard");
  const contentRef = useRef(null);

  useEffect(() => {
    setActive(sectionFromHash());

    const onHashChange = () => setActive(sectionFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Phone layout turns tables into stacked cards; each cell needs its column
  // name for that, so copy the header text onto the cells (cheap, idempotent).
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return undefined;
    const labelCells = () => {
      root.querySelectorAll(".admin-table").forEach((table) => {
        const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent.trim());
        table.querySelectorAll("tbody tr").forEach((row) => {
          Array.from(row.children).forEach((cell, i) => {
            if (cell.dataset.label === undefined) cell.dataset.label = heads[i] || "";
          });
        });
      });
    };
    labelCells();
    const observer = new MutationObserver(labelCells);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  function navigate(key) {
    window.location.hash = key;
    setActive(key);
    window.scrollTo(0, 0);
  }

  const { title, subtitle, Component, action } = SECTIONS[active] ?? SECTIONS.dashboard;

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <Sidebar active={active} onNavigate={navigate} />
        <div className="admin-main">
          <Topbar title={title} subtitle={subtitle} action={action} onLogout={onLogout} />
          <div className="admin-content" ref={contentRef}>
            <Component />
          </div>
        </div>
      </div>
      <MobileTabs active={active} onNavigate={navigate} />
    </div>
  );
}

// Gate: the whole admin needs a Supabase sign-in by an account listed in academy_admins.
// (If the site has no database configured, the admin opens as before.)
export default function AdminApp() {
  const [auth, setAuth] = useState(HAS_DB ? "checking" : "in");

  async function check() {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) return setAuth("out");
      const { data: isAdmin } = await supabase.rpc("is_academy_admin");
      setAuth(isAdmin === true ? "in" : "out");
    } catch {
      setAuth("out");
    }
  }

  useEffect(() => {
    if (!HAS_DB) return undefined;
    check();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setAuth("out");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setAuth("out");
  }

  if (auth === "checking") {
    return <div className="admin-root admin-login-root"><p className="form-hint">Checking your session…</p></div>;
  }
  if (auth === "out") return <AdminLogin onSignedIn={() => setAuth("in")} />;
  return <AdminShell onLogout={HAS_DB ? logout : undefined} />;
}

export { NAV_ITEMS };
