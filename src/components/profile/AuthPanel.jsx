import { useState } from "react";
import {
  signInProfile, signUpProfile, sendPasswordReset, verifySignupCode, resendSignupCode, pendingVerifyEmail, clearPendingVerify,
} from "../../services/customers.js";
import "../../styles/profile.css";

/**
 * Sign in / create profile / confirm email code / forgot password.
 * onDone(session) is called after a successful sign in or sign up.
 */
export default function AuthPanel({ initialMode = "signin", onDone, heading, intro }) {
  const pending = typeof window !== "undefined" ? pendingVerifyEmail() : "";
  const [mode, setMode] = useState(pending ? "verify" : initialMode); // signin | create | verify | forgot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [code, setCode] = useState("");
  const [form, setForm] = useState({ name: "", email: pending || "", phone: "", password: "", marketing: false });

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function resend() {
    setError("");
    try {
      await resendSignupCode(form.email);
      setNotice("A new code is on its way.");
    } catch (err) {
      setError(err.message || "Couldn't send a new code.");
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      if (mode === "signin") {
        if (!form.email || !form.password) throw new Error("Enter your email and password.");
        setBusy(true);
        const session = await signInProfile(form.email, form.password);
        onDone?.(session, false);
      } else if (mode === "create") {
        if (!form.name.trim()) throw new Error("Please enter your full name.");
        if (!form.email.trim()) throw new Error("Please enter your email.");
        if (!form.phone.trim()) throw new Error("Please enter your phone / WhatsApp number.");
        if (form.password.length < 8) throw new Error("Choose a password of at least 8 characters.");
        setBusy(true);
        try {
          const session = await signUpProfile(form);
          onDone?.(session, true);
        } catch (err) {
          if (!err.needsCode) throw err;
          setMode("verify");
          setNotice(`We emailed a 6-digit code to ${form.email.trim()}.`);
        }
      } else if (mode === "verify") {
        if (!/^\d{6}$/.test(code.trim())) throw new Error("Enter the 6-digit code from the email.");
        setBusy(true);
        const session = await verifySignupCode(form.email, code.trim());
        onDone?.(session, true);
      } else {
        if (!form.email.trim()) throw new Error("Enter the email you signed up with.");
        setBusy(true);
        await sendPasswordReset(form.email);
        setNotice("If that email has a profile, a reset link is on its way.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const titles = {
    create: "Create your profile",
    forgot: "Reset password",
    verify: "Check your email",
    signin: "Welcome back",
  };
  const intros = {
    forgot: "We'll email you a link to choose a new password.",
    verify: "Enter the 6-digit code we sent you to finish creating your profile.",
    other: "Your profile keeps your orders, your courses and your certificates in one place.",
  };

  return (
    <form className="pf-auth" onSubmit={submit} noValidate>
      <h2>{heading && mode !== "verify" ? heading : titles[mode]}</h2>
      <p className="pf-sub">{(mode === "forgot" || mode === "verify" ? intros[mode] : intro) || intros.other}</p>

      {(mode === "signin" || mode === "create") && (
        <div className="pf-tabs" role="tablist">
          <button type="button" role="tab" className={`pf-tab${mode === "signin" ? " active" : ""}`} onClick={() => switchMode("signin")}>
            Sign in
          </button>
          <button type="button" role="tab" className={`pf-tab${mode === "create" ? " active" : ""}`} onClick={() => switchMode("create")}>
            Create profile
          </button>
        </div>
      )}

      {mode === "create" && (
        <div className="pf-field">
          <label htmlFor="pfName">Full name</label>
          <input id="pfName" type="text" autoComplete="name" value={form.name} onChange={set("name")} placeholder="e.g. Wanjiru Kamau" />
          <span className="pf-hint">This is the name printed on your certificates.</span>
        </div>
      )}

      {mode !== "verify" && (
        <div className="pf-field">
          <label htmlFor="pfEmail">Email</label>
          <input id="pfEmail" type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
        </div>
      )}

      {mode === "verify" && (
        <div className="pf-field">
          <label htmlFor="pfCode">6-digit code sent to {form.email}</label>
          <input
            id="pfCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            style={{ letterSpacing: "0.4em", fontSize: 22, textAlign: "center" }}
          />
        </div>
      )}

      {mode === "create" && (
        <div className="pf-field">
          <label htmlFor="pfPhone">Phone / WhatsApp</label>
          <input id="pfPhone" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="07xx xxx xxx" />
        </div>
      )}

      {(mode === "signin" || mode === "create") && (
        <div className="pf-field">
          <label htmlFor="pfPass">Password</label>
          <input
            id="pfPass"
            type="password"
            autoComplete={mode === "create" ? "new-password" : "current-password"}
            value={form.password}
            onChange={set("password")}
            placeholder={mode === "create" ? "At least 8 characters" : "Your password"}
          />
        </div>
      )}

      {mode === "create" && (
        <label className="pf-check">
          <input type="checkbox" checked={form.marketing} onChange={(e) => setForm((f) => ({ ...f, marketing: e.target.checked }))} />
          <span>Email me about my cart, new stock and offers. I can unsubscribe at any time.</span>
        </label>
      )}

      {error && <p className="pf-error" role="alert">{error}</p>}
      {notice && <p className="pf-ok" role="status">{notice}</p>}

      <button className="pf-btn block" type="submit" disabled={busy}>
        {busy ? "Please wait…" : mode === "create" ? "Create profile" : mode === "forgot" ? "Send reset link" : mode === "verify" ? "Confirm my email" : "Sign in"}
      </button>

      <p className="pf-foot">
        {mode === "signin" && (
          <button type="button" className="pf-link" onClick={() => switchMode("forgot")}>
            Forgot password?
          </button>
        )}
        {mode === "forgot" && (
          <button type="button" className="pf-link" onClick={() => switchMode("signin")}>
            Back to sign in
          </button>
        )}
        {mode === "verify" && (
          <>
            <button type="button" className="pf-link" onClick={resend}>Send a new code</button>
            {" · "}
            <button type="button" className="pf-link" onClick={() => { clearPendingVerify(); switchMode("signin"); }}>Back to sign in</button>
          </>
        )}
      </p>
    </form>
  );
}
