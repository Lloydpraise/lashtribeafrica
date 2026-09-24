import { useEffect, useState } from "react";
import Sidebar, { NAV_ITEMS } from "./components/Sidebar.jsx";
import Topbar from "./components/Topbar.jsx";
import Dashboard from "./sections/Dashboard.jsx";
import Products from "./sections/Products.jsx";
import Courses from "./sections/Courses.jsx";
import Customers from "./sections/Customers.jsx";
import Orders from "./sections/Orders.jsx";
import SiteSettings from "./sections/SiteSettings.jsx";
import "./admin.css";

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
    subtitle: "Academy catalog",
    Component: Courses,
    action: <button className="admin-btn" type="button" disabled title="Coming soon">+ Add Course</button>,
  },
  customers: { title: "Customers", subtitle: "People who've bought from you", Component: Customers },
  orders: { title: "Orders", subtitle: "Ecommerce + Academy purchases", Component: Orders },
  settings: { title: "Site Settings", subtitle: "Storefront content", Component: SiteSettings },
};

function sectionFromHash() {
  const key = window.location.hash.replace("#", "");
  return SECTIONS[key] ? key : "dashboard";
}

export default function AdminApp() {
  const [active, setActive] = useState("dashboard");

  useEffect(() => {
    setActive(sectionFromHash());

    const onHashChange = () => setActive(sectionFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function navigate(key) {
    window.location.hash = key;
    setActive(key);
  }

  const { title, subtitle, Component, action } = SECTIONS[active] ?? SECTIONS.dashboard;

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <Sidebar active={active} onNavigate={navigate} />
        <div className="admin-main">
          <Topbar title={title} subtitle={subtitle} action={action} />
          <div className="admin-content">
            <Component />
          </div>
        </div>
      </div>
    </div>
  );
}

export { NAV_ITEMS };
