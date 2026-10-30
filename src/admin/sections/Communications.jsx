import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/EmptyState.jsx";
import { renderEmail, sampleContext, KINDS } from "../../../supabase/functions/_shared/email-render.js";
import { fetchOffers } from "./offers/offers.api.js";
import {
  getSettings, saveSettings, listTemplates, saveTemplate, listOutbox, requeue, sendTest, getStats, audienceCount,
  listCampaigns, saveCampaign, deleteCampaign, sendCampaign, runChecks, emailsLive,
} from "./communications/comms.api.js";
import "./communications/comms.css";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "templates", label: "Automatic emails" },
  { key: "campaigns", label: "Campaigns" },
  { key: "activity", label: "Activity" },
  { key: "settings", label: "Settings" },
];

const PLACEHOLDERS = [
  ["first_name", "their first name"], ["order_no", "order number"], ["ship_date", "shipping date"],
  ["order_status", "cancelled / refunded"], ["course_title", "course name"], ["course_url", "link to the course"],
  ["certificate_no", "certificate number"], ["verify_code", "verification code"], ["next_ship_date", "next shipment"],
  ["order_by_date", "last day to order for it"], ["offer_title", "offer name"], ["offer_ends", "when the offer ends"],
  ["review_url", "the customer's one-time review link"],
  ["site_url", "the website address"],
];

const when = (iso) => (iso ? new Date(iso).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

function Preview({ template, blocks, ctaLabel, ctaUrl, subject, preheader, body, kind, settings, offer }) {
  const html = useMemo(() => {
    const s = sampleContext(settings?.site_url || "https://lashtribeafrica.com");
    return renderEmail({
      subject, preheader, body, ctaLabel, ctaUrl, blocks,
      data: s.data, order: s.order, cart: s.cart, offer: offer || s.offer,
      siteUrl: s.data.site_url,
      unsubscribeUrl: kind !== "service" ? `${s.data.site_url}/unsubscribe?t=example` : "",
      supportEmail: settings?.reply_to || settings?.sender_email || "",
      footerNote: kind === "service"
        ? "You are getting this because of your Lashtribe Africa account, order or course."
        : "You are getting this because you opted in to emails from Lashtribe Africa.",
    }).html;
  }, [template, blocks, ctaLabel, ctaUrl, subject, preheader, body, kind, settings, offer]);
  return <iframe className="cm-preview" title="Email preview" srcDoc={html} sandbox="" />;
}

// ------------------------------------------------------------------ overview
function Overview({ settings, stats, onGo, onRefresh }) {
  const [ran, setRan] = useState("");
  async function check() {
    setRan("Checking…");
    try { await runChecks(); setRan("Done. Cart reminders and date-based emails were queued and sent."); onRefresh(); } catch (e) { setRan(e.message); }
  }
  const checks = [
    [settings?.enabled, "Email sending is switched on", "Settings > turn on 'Email sending'."],
    [Boolean(settings?.function_url && settings?.webhook_secret), "The send function is connected", "Settings > fill in the function address and generate the secret."],
    [Boolean(settings?.sender_email), "Sender address is set", "Settings > sender email (must be verified in Brevo)."],
  ];
  if (!emailsLive(settings)) {
    return (
      <>
        <div className="cm-banner test"><b>Emails awaiting domain transfer.</b> Customer emails start automatically once the domain move is finished. Orders, sign-ups and everything else work normally until then.</div>
        <div className="cm-row">
          <button className="admin-btn secondary" onClick={() => onGo("templates")}>Preview the emails</button>
        </div>
      </>
    );
  }
  return (
    <>
      {!settings?.enabled && (
        <div className="cm-banner off"><b>Email is OFF.</b> Nothing is queued or sent until you turn it on in Settings. Orders, sign-ups and everything else keep working normally.</div>
      )}
      {settings?.enabled && settings.only_to?.length > 0 && (
        <div className="cm-banner test"><b>Test mode.</b> Only {settings.only_to.join(", ")} will receive emails. Clear the list in Settings when you go live.</div>
      )}
      {settings?.enabled && !settings.only_to?.length && (
        <div className="cm-banner on"><b>Live.</b> Customers receive emails according to their consent.</div>
      )}

      <div className="cm-grid">
        <div className="cm-stat"><b>{stats.sentToday} / {settings?.daily_limit ?? "—"}</b><span>sent today (daily limit)</span></div>
        <div className="cm-stat"><b>{stats.queued}</b><span>waiting to send</span></div>
        <div className="cm-stat"><b>{stats.sentWeek}</b><span>sent in the last 7 days</span></div>
        <div className={`cm-stat${stats.failed ? " warn" : ""}`}><b>{stats.failed}</b><span>failed in 7 days</span></div>
        <div className="cm-stat"><b>{stats.optedIn}</b><span>customers who want offers</span></div>
        <div className="cm-stat"><b>{stats.optedOut}</b><span>unsubscribed</span></div>
      </div>

      <div className="admin-card" style={{ padding: 18, marginBottom: 16 }}>
        <p className="cm-section-title">Setup</p>
        <ul className="cm-check">
          {checks.map(([ok, label, todo]) => (
            <li key={label}><span className={`cm-dot ${ok ? "ok" : "todo"}`}>{ok ? "✓" : "!"}</span><span><b>{label}</b>{!ok && <><br /><span className="cm-hint">{todo}</span></>}</span></li>
          ))}
        </ul>
        <div className="cm-row" style={{ marginTop: 14 }}>
          <button className="admin-btn secondary" onClick={() => onGo("settings")}>Open settings</button>
          <button className="admin-btn secondary" onClick={() => onGo("templates")}>Edit the emails</button>
          <button className="admin-btn secondary" onClick={() => onGo("campaigns")}>New campaign</button>
          <button className="admin-btn secondary" onClick={check} title="Runs the hourly checks right now">Run checks now</button>
        </div>
        {ran && <p className="cm-hint" style={{ marginTop: 8 }}>{ran}</p>}
      </div>

      <div className="admin-card" style={{ padding: 18 }}>
        <p className="cm-section-title">How we keep it lawful and kind</p>
        <ul className="cm-hint" style={{ margin: 0, paddingLeft: 18 }}>
          <li><b>Order and account emails</b> go to everyone, because they are about something the customer did.</li>
          <li><b>Cart reminders, offers and "learn more"</b> go only to customers who ticked the opt-in box (unticked by default), and every one carries an unsubscribe link.</li>
          <li>A customer gets at most one marketing email every {settings?.marketing_gap_hours ?? 72} hours, and none between {settings?.quiet_from ?? 20}:00 and {settings?.quiet_to ?? 8}:00 Nairobi time.</li>
          <li>Each event can send each email only once, even if you change an order's status twice.</li>
        </ul>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ templates
function Templates({ settings }) {
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    listTemplates().then((r) => { setRows(r); if (r[0]) { setSel(r[0].key); setDraft(r[0]); } }).catch((e) => setMsg({ type: "error", text: e.message }));
  }, []);

  function pick(t) { setSel(t.key); setDraft(t); setMsg({ type: "", text: "" }); }
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = draft && rows.find((r) => r.key === sel) && JSON.stringify(draft) !== JSON.stringify(rows.find((r) => r.key === sel));

  async function save() {
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      const { subject, preheader, body, cta_label, cta_url, enabled, delay_minutes } = draft;
      const saved = await saveTemplate(draft.key, { subject, preheader, body, cta_label: cta_label || null, cta_url: cta_url || null, enabled, delay_minutes: Number(delay_minutes) || 0 });
      setRows((rs) => rs.map((r) => (r.key === saved.key ? saved : r)));
      setDraft(saved);
      setMsg({ type: "ok", text: "Saved." });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setBusy(false);
  }

  async function test() {
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      if (dirty) await save();
      await sendTest(draft.key, testTo.trim());
      setMsg({ type: "ok", text: `Test sent to ${testTo.trim()} with example data. It arrives in a few seconds.` });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setBusy(false);
  }

  if (!draft) return msg.text ? <p className="admin-gate-error">{msg.text}</p> : <p className="form-hint">Loading…</p>;
  const groups = ["service", "nudge", "marketing"];
  return (
    <div className="cm-split">
      <div>
        {groups.map((g) => (
          <div key={g} style={{ marginBottom: 16 }}>
            <p className="cm-section-title">{KINDS[g]}</p>
            <div className="cm-list">
              {rows.filter((r) => r.kind === g).map((r) => (
                <button key={r.key} className={`cm-item${sel === r.key ? " active" : ""}${r.enabled ? "" : " cm-off"}`} onClick={() => pick(r)}>
                  <span>{r.name}<small>{r.description}</small></span>
                  <span className={`cm-kind ${r.kind}`}>{r.enabled ? (r.delay_minutes ? `${r.delay_minutes >= 1440 ? `${Math.round(r.delay_minutes / 1440)}d` : r.delay_minutes >= 60 ? `${Math.round(r.delay_minutes / 60)}h` : `${r.delay_minutes}m`} later` : "instant") : "off"}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div>
        <div className="admin-card" style={{ padding: 18 }}>
          <div className="cm-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div><b>{draft.name}</b> <span className={`cm-kind ${draft.kind}`}>{KINDS[draft.kind]}</span></div>
            <label className="cm-row" style={{ gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={draft.enabled} onChange={(e) => set("enabled", e.target.checked)} /> On
            </label>
          </div>
          <div className="form-grid">
            <label className="form-field span-2"><span>Subject</span><input type="text" value={draft.subject} onChange={(e) => set("subject", e.target.value)} /></label>
            <label className="form-field span-2"><span>Preview line (grey text beside the subject)</span><input type="text" value={draft.preheader} onChange={(e) => set("preheader", e.target.value)} /></label>
            <label className="form-field span-2"><span>Message</span>
              <textarea className="cm-body" value={draft.body} onChange={(e) => set("body", e.target.value)} />
              <small className="cm-hint">Leave a blank line between paragraphs. Start lines with <code>- </code> for bullets and wrap words in <code>**</code> for bold. Order and cart details are added automatically.</small>
            </label>
            <label className="form-field"><span>Button text</span><input type="text" value={draft.cta_label || ""} onChange={(e) => set("cta_label", e.target.value)} /></label>
            <label className="form-field"><span>Button link</span><input type="text" value={draft.cta_url || ""} onChange={(e) => set("cta_url", e.target.value)} /></label>
            {(draft.delay_minutes > 0 || ["cart_abandoned_1", "cart_abandoned_2"].includes(draft.key)) && (
              <label className="form-field"><span>Wait (minutes)</span><input type="number" min="0" value={draft.delay_minutes} onChange={(e) => set("delay_minutes", e.target.value)} />
                <small className="cm-hint">After the event. 60 = 1 hour, 1440 = 1 day.</small></label>
            )}
          </div>
          <p className="cm-hint" style={{ marginTop: 10 }}>
            You can use: {PLACEHOLDERS.map(([k, d], i) => <span key={k}><code title={d}>{`{{${k}}}`}</code>{i < PLACEHOLDERS.length - 1 ? " " : ""}</span>)}
          </p>
          {msg.text && <p className={msg.type === "error" ? "admin-gate-error" : "form-hint"} style={{ margin: "8px 0" }}>{msg.text}</p>}
          <div className="cm-row" style={{ marginTop: 10 }}>
            <button className="admin-btn" disabled={busy || !dirty} onClick={save}>{busy ? "Working…" : "Save changes"}</button>
            <input type="email" placeholder="send a test to…" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            <button className="admin-btn secondary" disabled={busy || !testTo.includes("@")} onClick={test}>Send test</button>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <p className="cm-section-title">Preview (example data)</p>
          <Preview template={draft.key} blocks={draft.blocks} ctaLabel={draft.cta_label} ctaUrl={draft.cta_url} subject={draft.subject} preheader={draft.preheader} body={draft.body} kind={draft.kind} settings={settings} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ campaigns
const blankCampaign = () => ({ name: "", subject: "", preheader: "", body: "Hi {{first_name}},\n\n", cta_label: "", cta_url: "{{site_url}}/ecommerce", blocks: [], offer_id: "" });

function Campaigns({ settings, startWith }) {
  const [rows, setRows] = useState([]);
  const [offers, setOffers] = useState([]);
  const [audience, setAudience] = useState(0);
  const [edit, setEdit] = useState(startWith || null);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [startAt, setStartAt] = useState("");

  async function load() {
    try {
      const [c, o, a] = await Promise.all([listCampaigns(), fetchOffers(), audienceCount()]);
      setRows(c); setOffers(o); setAudience(a);
    } catch (e) { setMsg({ type: "error", text: e.message }); }
  }
  useEffect(() => { load(); }, []);

  const set = (k, v) => setEdit((d) => ({ ...d, [k]: v }));
  const offer = offers.find((o) => o.id === edit?.offer_id);

  async function save() {
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      if (!edit.name.trim() || !edit.subject.trim() || !edit.body.trim()) throw new Error("Give it a name, a subject and a message.");
      const blocks = edit.offer_id ? ["offer"] : [];
      const saved = await saveCampaign({ ...edit, blocks });
      setEdit(saved); await load();
      setMsg({ type: "ok", text: "Draft saved." });
      return saved;
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    finally { setBusy(false); }
    return null;
  }

  async function send() {
    const saved = await save();
    if (!saved) return;
    if (!window.confirm(`Send "${saved.name}" to up to ${audience} customers who opted in${startAt ? ` starting ${new Date(startAt).toLocaleString()}` : " now"}?\n\nPeople who got a marketing email recently are held back automatically.`)) return;
    setBusy(true);
    try {
      const r = await sendCampaign(saved.id, startAt ? new Date(startAt).toISOString() : null);
      setMsg({ type: "ok", text: `Queued for ${r.queued} customers. ${r.skipped} were skipped (opted out, or emailed too recently).` });
      setEdit(null); await load();
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setBusy(false);
  }

  async function remove(c) {
    if (!window.confirm(`Delete the draft "${c.name}"?`)) return;
    try { await deleteCampaign(c.id); await load(); } catch (e) { setMsg({ type: "error", text: e.message }); }
  }

  if (edit) {
    return (
      <div className="cm-split">
        <div className="admin-card" style={{ padding: 18 }}>
          <div className="cm-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <b>{edit.id ? "Edit campaign" : "New campaign"}</b>
            <button className="admin-btn secondary" onClick={() => { setEdit(null); setMsg({ type: "", text: "" }); }}>Back</button>
          </div>
          <div className="form-grid">
            <label className="form-field span-2"><span>Name (only you see this)</span><input type="text" value={edit.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. November newsletter" /></label>
            <label className="form-field span-2"><span>Subject</span><input type="text" value={edit.subject} onChange={(e) => set("subject", e.target.value)} /></label>
            <label className="form-field span-2"><span>Preview line</span><input type="text" value={edit.preheader} onChange={(e) => set("preheader", e.target.value)} /></label>
            <label className="form-field span-2"><span>Message</span><textarea className="cm-body" value={edit.body} onChange={(e) => set("body", e.target.value)} />
              <small className="cm-hint">Use <code>{"{{first_name}}"}</code> for their name. Blank line = new paragraph, <code>- </code> = bullet, <code>**bold**</code>.</small></label>
            <label className="form-field"><span>Button text</span><input type="text" value={edit.cta_label || ""} onChange={(e) => set("cta_label", e.target.value)} /></label>
            <label className="form-field"><span>Button link</span><input type="text" value={edit.cta_url || ""} onChange={(e) => set("cta_url", e.target.value)} /></label>
            <label className="form-field span-2"><span>Show an offer in the email (optional)</span>
              <select value={edit.offer_id || ""} onChange={(e) => set("offer_id", e.target.value)}>
                <option value="">No offer</option>
                {offers.map((o) => <option key={o.id} value={o.id}>{o.label}{o.is_active ? "" : " (inactive)"}</option>)}
              </select></label>
          </div>
          {msg.text && <p className={msg.type === "error" ? "admin-gate-error" : "form-hint"} style={{ margin: "8px 0" }}>{msg.text}</p>}
          <p className="cm-hint">Goes to <b>{audience}</b> customers who ticked "email me offers". Spread out automatically so nobody gets two marketing emails close together.</p>
          <div className="cm-row" style={{ marginTop: 10 }}>
            <button className="admin-btn secondary" disabled={busy} onClick={save}>Save draft</button>
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} title="Leave empty to send now" />
            <button className="admin-btn" disabled={busy || edit.status === "queued"} onClick={send}>{startAt ? "Schedule" : "Send now"}</button>
          </div>
        </div>
        <div>
          <p className="cm-section-title">Preview (example data)</p>
          <Preview template="campaign" blocks={edit.offer_id ? ["offer"] : []} ctaLabel={edit.cta_label} ctaUrl={edit.cta_url} subject={edit.subject || "Your subject"} preheader={edit.preheader} body={edit.body}
            kind="marketing" settings={settings}
            offer={offer ? { title: offer.badge_text || offer.label, text: offer.banner_text || "", ends: offer.ends_at ? new Date(offer.ends_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "" } : null} />
          {offer && <p className="cm-hint" style={{ marginTop: 8 }}>The offer box shows "{offer.badge_text || offer.label}" with its real end date.</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      {msg.text && <p className={msg.type === "error" ? "admin-gate-error" : "form-hint"} style={{ marginBottom: 12 }}>{msg.text}</p>}
      <div style={{ marginBottom: 14 }}><button className="admin-btn" onClick={() => setEdit(blankCampaign())}>+ New campaign</button></div>
      {rows.length === 0 ? (
        <EmptyState title="No campaigns yet" description="A campaign is a one-off email to everyone who opted in: a newsletter, new stock, or an offer. To email an offer, press 'Email this offer' on the Offers screen." />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead><tr><th>Campaign</th><th>Status</th><th>Queued</th><th>Skipped</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td><div className="table-primary">{c.name}</div><div className="table-secondary">{c.subject}</div></td>
                  <td><span className={`cm-st ${c.status === "queued" ? "sent" : ""}`}>{c.status === "queued" ? `Sent ${when(c.queued_at)}` : "Draft"}</span></td>
                  <td>{c.status === "queued" ? c.queued_count : "—"}</td>
                  <td>{c.status === "queued" ? c.skipped_count : "—"}</td>
                  <td><div className="table-actions">
                    <button className="admin-btn secondary" onClick={() => setEdit(c)}>{c.status === "queued" ? "View" : "Edit"}</button>
                    {c.status !== "queued" && <button className="admin-btn secondary danger" onClick={() => remove(c)}>Delete</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ activity
function Activity() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true); setErr("");
    try { setRows(await listOutbox({ status, q })); } catch (e) { setErr(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, [status]);

  async function act(id, action) {
    try { await requeue(id, action); await load(); } catch (e) { setErr(e.message); }
  }

  return (
    <>
      <div className="cm-row" style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option><option value="queued">Waiting</option><option value="sent">Sent</option>
          <option value="failed">Failed</option><option value="skipped">Skipped</option><option value="cancelled">Cancelled</option>
        </select>
        <input type="text" placeholder="Search an email address" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <button className="admin-btn secondary" onClick={load}>Refresh</button>
      </div>
      {err && <p className="admin-gate-error">{err}</p>}
      {loading ? <p className="form-hint">Loading…</p> : rows.length === 0 ? (
        <EmptyState title="Nothing here yet" description="Emails appear here the moment something triggers them." />
      ) : (
        <div className="admin-card table-card">
          <table className="admin-table">
            <thead><tr><th>When</th><th>To</th><th>Email</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="table-secondary">{when(r.sent_at || r.send_after || r.created_at)}</td>
                  <td><div className="table-primary">{r.to_name || r.to_email}</div>{r.to_name && <div className="table-secondary">{r.to_email}</div>}</td>
                  <td className="table-secondary">{r.template_key}{r.kind === "marketing" && " · marketing"}</td>
                  <td><span className={`cm-st ${r.status}`}>{r.status}</span>{r.reason && <div className="table-secondary" style={{ marginTop: 4 }}>{r.reason}</div>}</td>
                  <td><div className="table-actions">
                    {["failed", "skipped", "cancelled"].includes(r.status) && <button className="admin-btn secondary" onClick={() => act(r.id, "retry")}>Retry</button>}
                    {r.status === "queued" && <button className="admin-btn secondary danger" onClick={() => act(r.id, "cancel")}>Cancel</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ settings
const randomSecret = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");

function Settings({ settings, onSaved }) {
  const [f, setF] = useState(settings);
  const [onlyTo, setOnlyTo] = useState((settings?.only_to || []).join("\n"));
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);
  const live = emailsLive(settings);
  const [tech, setTech] = useState(live);
  const set = (k, v) => setF((d) => ({ ...d, [k]: v }));
  if (!f) return <p className="form-hint">Loading…</p>;

  async function save() {
    setBusy(true); setMsg({ type: "", text: "" });
    try {
      const patch = {
        enabled: f.enabled, sender_name: f.sender_name, sender_email: f.sender_email.trim(), reply_to: f.reply_to?.trim() || null,
        site_url: f.site_url.trim().replace(/\/$/, ""), daily_limit: Number(f.daily_limit), marketing_gap_hours: Number(f.marketing_gap_hours),
        quiet_from: Number(f.quiet_from), quiet_to: Number(f.quiet_to),
        only_to: onlyTo.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean),
        function_url: f.function_url?.trim() || null, webhook_secret: f.webhook_secret?.trim() || null,
      };
      const saved = await saveSettings(patch);
      setF(saved); onSaved(saved);
      setMsg({ type: "ok", text: "Saved." });
    } catch (e) { setMsg({ type: "error", text: e.message }); }
    setBusy(false);
  }

  return (
    <>
    {!live && <div className="cm-banner test"><b>Emails awaiting domain transfer.</b> The full email settings show here once the domain move is finished.</div>}
    <div className={tech ? "cm-split" : ""}>
      <div className="admin-card" style={{ padding: 18 }}>
        {tech && (
          <label className="cm-row" style={{ gap: 8, marginBottom: 14, fontWeight: 700 }}>
            <input type="checkbox" checked={f.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Email sending is ON
          </label>
        )}
        <div className="form-grid">
          <label className="form-field"><span>Sender name</span><input type="text" value={f.sender_name} onChange={(e) => set("sender_name", e.target.value)} /></label>
          <label className="form-field"><span>Replies go to</span><input type="text" value={f.reply_to || ""} onChange={(e) => set("reply_to", e.target.value)} placeholder="same as sender" /></label>
          {tech && <>
          <label className="form-field"><span>Sender email</span><input type="text" value={f.sender_email} onChange={(e) => set("sender_email", e.target.value)} />
            <small className="cm-hint">Must be a sender you verified in Brevo.</small></label>
          <label className="form-field"><span>Website address</span><input type="text" value={f.site_url} onChange={(e) => set("site_url", e.target.value)} /></label>
          <label className="form-field"><span>Emails per day, at most</span><input type="number" min="1" value={f.daily_limit} onChange={(e) => set("daily_limit", e.target.value)} />
            <small className="cm-hint">Brevo's free plan allows 300 a day.</small></label>
          <label className="form-field"><span>Hours between marketing emails</span><input type="number" min="0" value={f.marketing_gap_hours} onChange={(e) => set("marketing_gap_hours", e.target.value)} />
            <small className="cm-hint">72 = at most one every 3 days per person.</small></label>
          <label className="form-field"><span>Quiet from (hour, Nairobi)</span><input type="number" min="0" max="23" value={f.quiet_from} onChange={(e) => set("quiet_from", e.target.value)} /></label>
          <label className="form-field"><span>Quiet until (hour)</span><input type="number" min="0" max="23" value={f.quiet_to} onChange={(e) => set("quiet_to", e.target.value)} /></label>
          <label className="form-field span-2"><span>Test mode: only email these addresses</span>
            <textarea className="cm-body" style={{ minHeight: 70 }} value={onlyTo} onChange={(e) => setOnlyTo(e.target.value)} placeholder="you@gmail.com" />
            <small className="cm-hint">One per line. While this list has anything in it, nobody else is emailed. Empty it to go live.</small></label>
          <label className="form-field span-2"><span>Send function address</span><input type="text" value={f.function_url || ""} onChange={(e) => set("function_url", e.target.value)} placeholder="https://YOUR-PROJECT.supabase.co/functions/v1/send-emails" /></label>
          <div className="form-field span-2"><span>Shared secret</span>
            <div className="cm-row"><span className="cm-secret">{f.webhook_secret || "not set"}</span>
              <button type="button" className="admin-btn secondary" onClick={() => set("webhook_secret", randomSecret())}>Generate new</button></div>
            <small className="cm-hint">Save, then give the same value to the function (step 3 on the right).</small></div>
          </>}
        </div>
        {msg.text && <p className={msg.type === "error" ? "admin-gate-error" : "form-hint"} style={{ margin: "8px 0" }}>{msg.text}</p>}
        <div className="cm-row" style={{ marginTop: 10 }}>
          <button className="admin-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save settings"}</button>
          {!live && <button type="button" className="admin-btn secondary" onClick={() => setTech((t) => !t)}>{tech ? "Hide technical setup" : "Technical setup"}</button>}
        </div>
      </div>

      {tech && <div className="admin-card" style={{ padding: 18 }}>
        <p className="cm-section-title">One-time connection (about 10 minutes)</p>
        <ol className="cm-hint" style={{ margin: "0 0 12px", paddingLeft: 18 }}>
          <li>In Brevo: <b>Senders &amp; IP</b> &rarr; add your sender email and the domain, then add the DNS records Brevo shows (Namecheap &rarr; Advanced DNS).</li>
          <li>In Brevo: <b>SMTP &amp; API</b> &rarr; create an <b>API key</b> (for these emails) and note the <b>SMTP login</b> (for sign-up emails).</li>
          <li>Run these once in a terminal in the project folder (needs the Supabase CLI):</li>
        </ol>
        <div className="cm-pre">{`supabase secrets set BREVO_API_KEY=<your Brevo api key> COMMS_SECRET=${f.webhook_secret || "<the secret on the left>"}
supabase functions deploy send-emails --no-verify-jwt
supabase functions deploy email-unsubscribe --no-verify-jwt`}</div>
        <ol className="cm-hint" start={4} style={{ margin: "12px 0 0", paddingLeft: 18 }}>
          <li>Paste the function address on the left, generate the secret, press <b>Save</b>, then tick <b>Email sending</b>.</li>
          <li>Send yourself a test from <b>Automatic emails</b>. Full steps: <code>COMMUNICATIONS-SETUP.md</code>.</li>
        </ol>
      </div>}
    </div>
    </>
  );
}

// ------------------------------------------------------------------ shell
export default function Communications() {
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem("comms:new-campaign") ? "campaigns" : "overview"; } catch { return "overview"; }
  });
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState({ sentToday: 0, queued: 0, failed: 0, skipped: 0, optedIn: 0, optedOut: 0, sentWeek: 0 });
  const [error, setError] = useState("");
  const [startWith] = useState(() => {
    try {
      const raw = sessionStorage.getItem("comms:new-campaign");
      if (!raw) return null;
      sessionStorage.removeItem("comms:new-campaign");
      return JSON.parse(raw);
    } catch { return null; }
  });

  useEffect(() => {
    getSettings().then(setSettings).catch((e) => setError(e.message || "Couldn't load. Has migration 0043 been run?"));
    getStats().then(setStats).catch(() => {});
  }, [tab]);

  if (error) return <p className="admin-gate-error">{error} Run <code>0043_communications.sql</code> in the Supabase SQL editor first.</p>;

  return (
    <div>
      <div className="cm-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} role="tab" className={`cm-tab${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === "overview" && <Overview settings={settings} stats={stats} onGo={setTab} onRefresh={() => getStats().then(setStats).catch(() => {})} />}
      {tab === "templates" && <Templates settings={settings} />}
      {tab === "campaigns" && <Campaigns settings={settings} startWith={startWith} />}
      {tab === "activity" && <Activity />}
      {tab === "settings" && <Settings settings={settings} onSaved={setSettings} />}
    </div>
  );
}
