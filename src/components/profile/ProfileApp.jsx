import { useCallback, useEffect, useMemo, useState } from "react";
import AuthPanel from "./AuthPanel.jsx";
import {
  HAS_DB, formatKsh, getSession, onAuthChange, startAuthBridge, signOutProfile,
  fetchMyCustomer, updateMyProfile, changePassword,
  fetchMyOrders, fetchMyCourses, fetchMyCertificates, issueCertificate,
} from "../../services/customers.js";
import "../../styles/profile.css";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "orders", label: "Orders" },
  { key: "courses", label: "My courses" },
  { key: "certificates", label: "Certificates" },
];

const STATUS_LABEL = {
  pending: "Awaiting payment",
  paid: "Paid",
  fulfilled: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

function tabFromHash() {
  const key = window.location.hash.replace("#", "");
  return TABS.some((t) => t.key === key) ? key : "overview";
}

// ---------------------------------------------------------------- overview
function Overview({ session, customer, orders, courses, certificates, onSaved }) {
  const [form, setForm] = useState({ name: "", phone: "", area: "", marketing: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [pw, setPw] = useState({ next: "", again: "" });
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    setForm({
      name: customer?.full_name || session.user.user_metadata?.full_name || "",
      // what they typed when creating the profile, in case the customer record has no phone yet
      phone: customer?.phone || session.user.user_metadata?.phone || "",
      area: customer?.delivery_area || "",
      marketing: Boolean(customer?.marketing_opt_in),
    });
  }, [customer, session]);

  const spent = useMemo(
    () => orders.filter((o) => ["paid", "fulfilled"].includes(o.status)).reduce((s, o) => s + Number(o.total), 0),
    [orders],
  );

  async function save(event) {
    event.preventDefault();
    setMsg({ type: "", text: "" });
    if (!form.name.trim()) return setMsg({ type: "error", text: "Your name can't be empty." });
    setSaving(true);
    try {
      const row = await updateMyProfile(form);
      onSaved(row);
      setMsg({ type: "ok", text: "Saved." });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setPwMsg({ type: "", text: "" });
    if (pw.next.length < 8) return setPwMsg({ type: "error", text: "Use at least 8 characters." });
    if (pw.next !== pw.again) return setPwMsg({ type: "error", text: "The two passwords don't match." });
    try {
      await changePassword(pw.next);
      setPw({ next: "", again: "" });
      setPwMsg({ type: "ok", text: "Password updated." });
    } catch (err) {
      setPwMsg({ type: "error", text: err.message });
    }
  }

  return (
    <>
      <div className="pf-stats">
        <div className="pf-stat"><span>Orders</span><b>{orders.filter((o) => !["cancelled", "refunded"].includes(o.status)).length}</b></div>
        <div className="pf-stat"><span>Total spent</span><b>{formatKsh(spent)}</b></div>
        <div className="pf-stat"><span>Courses</span><b>{courses.length}</b></div>
        <div className="pf-stat"><span>Certificates</span><b>{certificates.length}</b></div>
      </div>

      <form className="pf-card" onSubmit={save}>
        <h3>Your details</h3>
        <div className="pf-grid-2">
          <div className="pf-field">
            <label htmlFor="pfdName">Full name</label>
            <input id="pfdName" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <span className="pf-hint">Printed on your certificates.</span>
          </div>
          <div className="pf-field">
            <label htmlFor="pfdEmail">Email</label>
            <input id="pfdEmail" type="email" value={session.user.email || ""} readOnly />
          </div>
          <div className="pf-field">
            <label htmlFor="pfdPhone">Phone / WhatsApp</label>
            <input id="pfdPhone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07xx xxx xxx" />
          </div>
          <div className="pf-field">
            <label htmlFor="pfdArea">Delivery area</label>
            <input id="pfdArea" type="text" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. Nairobi CBD" />
          </div>
        </div>
        <label className="pf-check">
          <input type="checkbox" checked={form.marketing} onChange={(e) => setForm({ ...form, marketing: e.target.checked })} />
          <span>Send me restock alerts and offers.</span>
        </label>
        {msg.text && <p className={msg.type === "error" ? "pf-error" : "pf-ok"}>{msg.text}</p>}
        <button className="pf-btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save details"}</button>
      </form>

      <form className="pf-card" onSubmit={savePassword}>
        <h3>Change password</h3>
        <div className="pf-grid-2">
          <div className="pf-field">
            <label htmlFor="pfpNew">New password</label>
            <input id="pfpNew" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </div>
          <div className="pf-field">
            <label htmlFor="pfpAgain">Repeat new password</label>
            <input id="pfpAgain" type="password" autoComplete="new-password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} />
          </div>
        </div>
        {pwMsg.text && <p className={pwMsg.type === "error" ? "pf-error" : "pf-ok"}>{pwMsg.text}</p>}
        <button className="pf-btn ghost" type="submit">Update password</button>
      </form>
    </>
  );
}

// ------------------------------------------------------------------ orders
function Orders({ orders }) {
  function buyAgain(order) {
    const cart = window.LashtribeCart ? window.LashtribeCart.getCart() : {};
    let added = 0;
    for (const item of order.order_items) {
      if (item.item_type === "product" && item.product_id) {
        cart[item.product_id] = (Number(cart[item.product_id]) || 0) + Number(item.quantity);
        added += 1;
      }
    }
    if (!added || !window.LashtribeCart) return;
    window.LashtribeCart.setCart(cart);
    window.location.href = "/ecommerce/checkout";
  }

  if (!orders.length) {
    return (
      <div className="pf-empty">
        <h3>No orders yet</h3>
        <p>When you place an order it will show up here.</p>
        <a className="pf-btn" href="/shop">Shop products</a>
      </div>
    );
  }

  return orders.map((order) => (
    <div className="pf-order" key={order.id}>
      <div className="pf-order-top">
        <div>
          <div className="pf-order-no">
            {order.order_no}
            <span className={`pf-status ${order.status}`}>{STATUS_LABEL[order.status] || order.status}</span>
          </div>
          <div className="pf-order-date">Placed {fmtDate(order.placed_at)}</div>
        </div>
        <div className="pf-order-total">{formatKsh(order.total)}</div>
      </div>
      <ul>
        {order.order_items.map((item) => (
          <li key={item.id}>
            <span>
              {item.name}
              {item.quantity > 1 && <small> × {item.quantity}</small>}
              {item.item_type !== "product" && <small> · {item.item_type}</small>}
            </span>
            <span>{formatKsh(item.line_total)}</span>
          </li>
        ))}
      </ul>
      <div className="pf-order-foot">
        <span>
          {order.status === "pending"
            ? "We'll confirm your payment shortly. Courses unlock as soon as it's confirmed."
            : order.discount > 0
              ? `You saved ${formatKsh(order.discount)} with offers.`
              : ""}
        </span>
        {order.order_items.some((i) => i.item_type === "product" && i.product_id) && (
          <button className="pf-btn ghost small" type="button" onClick={() => buyAgain(order)}>Buy again</button>
        )}
      </div>
    </div>
  ));
}

// ----------------------------------------------------------------- courses
async function downloadPdf(cert) {
  const { downloadCertificatePdf } = await import("../../services/certificatePdf.js");
  await downloadCertificatePdf(cert);
}

function Courses({ courses, onCertificate }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function getCert(course) {
    setBusy(course.course_id);
    setError("");
    try {
      await onCertificate(course.course_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  if (!courses.length) {
    return (
      <div className="pf-empty">
        <h3>No courses yet</h3>
        <p>Courses you buy or start will show up here with your progress.</p>
        <a className="pf-btn" href="/academy">Browse the Academy</a>
      </div>
    );
  }

  return (
    <>
      {error && <p className="pf-error">{error}</p>}
      {courses.map((c) => {
        const total = Number(c.total_lessons) || 0;
        const done = Number(c.completed_lessons) || 0;
        const pct = total ? Math.round((done / total) * 100) : 0;
        const finished = total > 0 && done >= total;
        return (
          <div className="pf-course" key={c.course_id}>
            <div className="pf-course-cover" style={c.cover_url ? { backgroundImage: `url(${c.cover_url})` } : undefined} />
            <div>
              <h4>{c.course_title}</h4>
              <div className={`pf-progress${finished ? " done" : ""}`}><i style={{ width: `${pct}%` }} /></div>
              <small>
                {done} of {total} lessons · {pct}%
                {c.last_activity_at ? ` · last studied ${fmtDate(c.last_activity_at)}` : ""}
              </small>
            </div>
            <div className="pf-course-actions">
              <a className="pf-btn small" href={`/academy/learn/?course=${encodeURIComponent(c.course_slug)}`}>
                {finished ? "Review" : done ? "Continue" : "Start"}
              </a>
              {c.certificate_no ? (
                <button className="pf-btn ghost small" type="button" onClick={() => downloadPdf({ ...c, id: c.certificate_id })}>
                  Certificate PDF
                </button>
              ) : finished ? (
                <button className="pf-btn ghost small" type="button" disabled={busy === c.course_id} onClick={() => getCert(c)}>
                  {busy === c.course_id ? "Issuing…" : "Get certificate"}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------ certificates
function Certificates({ certificates }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function download(cert) {
    setBusy(cert.id);
    setError("");
    try {
      await downloadPdf(cert);
    } catch (err) {
      setError(err.message || "Couldn't build the PDF.");
    } finally {
      setBusy("");
    }
  }

  if (!certificates.length) {
    return (
      <div className="pf-empty">
        <h3>No certificates yet</h3>
        <p>Finish every lesson in a course to earn your certificate.</p>
        <a className="pf-btn" href="#courses">See my courses</a>
      </div>
    );
  }

  return (
    <>
      {error && <p className="pf-error">{error}</p>}
      {certificates.map((cert) => (
        <div className="pf-cert" key={cert.id}>
          <div>
            <h4>{cert.course_title}</h4>
            <small>{cert.certificate_no} · issued {fmtDate(cert.issued_at)}</small>
            <small>Verify at /verify?code={cert.verify_code}</small>
          </div>
          <button className="pf-btn small" type="button" disabled={busy === cert.id} onClick={() => download(cert)}>
            {busy === cert.id ? "Preparing…" : "Download PDF"}
          </button>
        </div>
      ))}
    </>
  );
}

// -------------------------------------------------------------------- root
export default function ProfileApp() {
  const [phase, setPhase] = useState("loading"); // loading | out | recovery | ready | error
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState("overview");
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [courses, setCourses] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [cust, ord, crs, certs] = await Promise.all([
        fetchMyCustomer(), fetchMyOrders(), fetchMyCourses(), fetchMyCertificates(),
      ]);
      setCustomer(cust);
      setOrders(ord);
      setCourses(crs);
      setCertificates(certs);
      setError("");
    } catch (err) {
      setError(err.message || "Couldn't load your profile. Has migration 0011 been run?");
    }
  }, []);

  useEffect(() => {
    if (!HAS_DB) {
      setPhase("error");
      setError("The store isn't connected to its database yet.");
      return undefined;
    }
    startAuthBridge();
    setTab(tabFromHash());
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);

    getSession().then((s) => {
      setSession(s);
      setPhase(s ? "ready" : "out");
      if (s) load();
    });
    const off = onAuthChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setPhase("recovery");
      else if (!next) setPhase("out");
      else {
        setPhase("ready");
        load();
      }
    });
    return () => {
      window.removeEventListener("hashchange", onHash);
      off();
    };
  }, [load]);

  async function handleCertificate(courseId) {
    await issueCertificate(courseId);
    await load();
  }

  async function signOut() {
    await signOutProfile();
    window.location.href = "/";
  }

  if (phase === "loading") {
    return <div className="pf-page"><p className="pf-hint">Loading your profile…</p></div>;
  }

  if (phase === "error") {
    return <div className="pf-page"><p className="pf-error">{error}</p></div>;
  }

  if (phase === "out") {
    return (
      <div className="pf-page">
        <div className="pf-card" style={{ maxWidth: 440, margin: "30px auto" }}>
          <AuthPanel heading="Your Lashtribe profile" onDone={() => {}} />
        </div>
      </div>
    );
  }

  if (phase === "recovery") {
    return (
      <div className="pf-page">
        <div className="pf-card" style={{ maxWidth: 440, margin: "30px auto" }}>
          <h3>Choose a new password</h3>
          <RecoveryForm onDone={() => setPhase("ready")} />
        </div>
      </div>
    );
  }

  const firstName = (customer?.full_name || session?.user?.user_metadata?.full_name || "").split(" ")[0];

  return (
    <div className="pf-page">
      <div className="pf-page-head">
        <div>
          <div className="pf-eyebrow">My profile</div>
          <h1>{firstName ? `Hello, ${firstName}` : "Your profile"}</h1>
        </div>
        <button className="pf-btn ghost small" type="button" onClick={signOut}>Sign out</button>
      </div>

      <div className="pf-page-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            className={`pf-page-tab${tab === t.key ? " active" : ""}`}
            onClick={() => { window.location.hash = t.key; setTab(t.key); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="pf-error">{error}</p>}

      {tab === "overview" && (
        <Overview session={session} customer={customer} orders={orders} courses={courses} certificates={certificates} onSaved={setCustomer} />
      )}
      {tab === "orders" && <Orders orders={orders} />}
      {tab === "courses" && <Courses courses={courses} onCertificate={handleCertificate} />}
      {tab === "certificates" && <Certificates certificates={certificates} />}
    </div>
  );
}

function RecoveryForm({ onDone }) {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (pw.length < 8) return setMsg("Use at least 8 characters.");
    try {
      await changePassword(pw);
      onDone();
    } catch (err) {
      setMsg(err.message);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="pf-field">
        <label htmlFor="pfrNew">New password</label>
        <input id="pfrNew" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
      </div>
      {msg && <p className="pf-error">{msg}</p>}
      <button className="pf-btn block" type="submit">Save password</button>
    </form>
  );
}
