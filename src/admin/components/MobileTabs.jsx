import { useEffect, useState } from "react";
import { ICONS, NAV_ITEMS } from "./Sidebar.jsx";

// Phone-only navigation: a fixed bottom tab bar with the four busiest
// sections plus a "More" sheet for the rest. Hidden on desktop by CSS
// (see admin-mobile.css), where the sidebar is used instead.

const PRIMARY = ["dashboard", "products", "courses", "orders"];

export default function MobileTabs({ active, onNavigate }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = PRIMARY.map((key) => NAV_ITEMS.find((item) => item.key === key)).filter(Boolean);
  const moreItems = NAV_ITEMS.filter((item) => !PRIMARY.includes(item.key));
  const moreActive = moreItems.some((item) => item.key === active);

  useEffect(() => {
    setMoreOpen(false);
  }, [active]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <div className="m-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div
            className="m-sheet"
            role="dialog"
            aria-label="More sections"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="m-sheet-grip" aria-hidden="true" />
            {moreItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`m-sheet-item${active === item.key ? " active" : ""}`}
                onClick={() => onNavigate(item.key)}
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                  {ICONS[item.key]}
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="m-tabs" aria-label="Admin sections">
        {primaryItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`m-tab${active === item.key ? " active" : ""}`}
            aria-current={active === item.key ? "page" : undefined}
            onClick={() => onNavigate(item.key)}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              {ICONS[item.key]}
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
        <button
          type="button"
          className={`m-tab${moreActive || moreOpen ? " active" : ""}`}
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((open) => !open)}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="3" cy="8" r="1.3" />
            <circle cx="8" cy="8" r="1.3" />
            <circle cx="13" cy="8" r="1.3" />
          </svg>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
