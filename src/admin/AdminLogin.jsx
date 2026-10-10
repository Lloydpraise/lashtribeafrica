import { useState } from "react";
import { supabase } from "../services/service.js";

// Admin sign-in. Uses Supabase Auth, then checks the account is listed in public.academy_admins.
// Customer and order data is protected by row-level security that only admits those accounts.
export default function AdminLogin({ onSignedIn, notice }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error("That email and password don't match.");
      const { data: isAdmin, error: rpcError } = await supabase.rpc("is_academy_admin");
      if (rpcError) throw new Error("Signed in, but the admin check failed. Has migration 0005 been run?");
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account isn't an admin. Add it to academy_admins (see supabase/migrations/README.md).");
      }
      onSignedIn();
    } catch (err) {
      setError(err.message || "Couldn't sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-root admin-login-root">
      <form className="admin-login-card" onSubmit={submit}>
        <div className="admin-sidebar-brand" style={{ color: "#000", padding: 0 }}>
          LASHTRIBE <em>Africa</em>
        </div>
        <div className="admin-login-tag">Admin sign in</div>
        {notice && <p className="form-hint" style={{ marginBottom: 12 }}>{notice}</p>}
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label htmlFor="adminEmail">Email</label>
          <input id="adminEmail" type="text" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-field" style={{ marginBottom: 14 }}>
          <label htmlFor="adminPass">Password</label>
          <input id="adminPass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="admin-gate-error" role="alert">{error}</p>}
        <button className="admin-btn" type="submit" disabled={busy} style={{ width: "100%", marginTop: 6 }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
