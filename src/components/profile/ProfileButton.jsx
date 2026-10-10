import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AuthPanel from "./AuthPanel.jsx";
import { HAS_DB, getSession, onAuthChange, startAuthBridge } from "../../services/customers.js";
import "../../styles/profile.css";

// The profile icon in the storefront header. Signed out: opens sign in / create profile.
// Signed in: goes to /profile.
export default function ProfileButton() {
  const [session, setSession] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!HAS_DB) return undefined;
    startAuthBridge();
    getSession().then(setSession);
    return onAuthChange((_event, next) => setSession(next));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClick() {
    if (session) {
      window.location.href = "/profile";
      return;
    }
    setOpen(true);
  }

  function handleDone() {
    setOpen(false);
    // On the profile page itself, it picks the new session up on its own; elsewhere stay put.
    if (window.location.pathname.startsWith("/profile")) window.location.reload();
  }

  return (
    <>
      <button
        className={`icon-btn pf-header-btn${session ? " signed-in" : ""}`}
        id="profileBtn"
        type="button"
        aria-label={session ? "My profile" : "Sign in or create a profile"}
        title={session ? "My profile" : "Sign in"}
        onClick={handleClick}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="5.2" r="3" stroke="black" strokeWidth="1.3" />
          <path d="M2.2 14c.5-3 2.8-4.6 5.8-4.6s5.3 1.6 5.8 4.6" stroke="black" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="pf-backdrop" onMouseDown={() => setOpen(false)}>
            <div className="pf-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
              <button className="pf-close" type="button" aria-label="Close" onClick={() => setOpen(false)}>
                ×
              </button>
              <AuthPanel onDone={handleDone} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
