// Turns a template + data into the styled email (HTML and plain text). Plain JavaScript with no Deno or browser
// APIs on purpose: the send-emails edge function and the admin preview both import this exact file, so what you
// preview is what customers get.

const BRAND = {
  ink: "#222222",
  soft: "#6b6b6b",
  rose: "#C98A96",
  roseDeep: "#A96A78",
  blush: "#F3E4E7",
  page: "#F7F1F2",
  line: "#EADDE0",
};

export const KINDS = { service: "Account and order", nudge: "Follow-up", marketing: "Marketing" };

export const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const ksh = (n) => `Ksh ${Math.round(Number(n || 0)).toLocaleString("en-KE")}`;

/** "2026-11-15" -> "Sunday 15 November 2026" (date-only strings are read as UTC so the day never shifts). */
export function fmtDate(value) {
  if (!value) return "";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? "UTC" : "Africa/Nairobi",
  }).format(d);
}

/** Replaces {{name}} with data.name. Unknown names become empty so a typo never shows up in a customer's inbox. */
export function fill(text, data, escape = false) {
  return String(text ?? "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => {
    const value = data[key] ?? "";
    return escape ? esc(value) : String(value);
  });
}

const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/** Body text -> HTML paragraphs. A blank line starts a new paragraph; lines starting "- " make a bullet list. */
function bodyHtml(text, data) {
  const blocks = fill(text, data).split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.every((l) => l.startsWith("- "))) {
        const items = lines
          .map((l) => `<li style="margin:0 0 8px;">${inline(esc(l.slice(2)))}</li>`)
          .join("");
        return `<ul style="margin:0 0 18px;padding:0 0 0 20px;color:${BRAND.ink};font-size:15px;line-height:1.65;">${items}</ul>`;
      }
      return `<p style="margin:0 0 18px;color:${BRAND.ink};font-size:15px;line-height:1.65;">${inline(esc(lines.join(" ")))}</p>`;
    })
    .join("");
}

function bodyPlain(text, data) {
  return fill(text, data).replace(/\*\*(.+?)\*\*/g, "$1").trim();
}

const optionLine = (opts) =>
  opts && typeof opts === "object"
    ? Object.entries(opts).map(([k, v]) => `${k}: ${v}`).join(" · ")
    : "";

function orderBlock(order) {
  if (!order) return { html: "", text: "" };
  const rows = (order.items || [])
    .map((it) => {
      const opt = optionLine(it.options);
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.ink};">${esc(it.name)}${
          opt ? `<div style="font-size:12px;color:${BRAND.soft};margin-top:2px;">${esc(opt)}</div>` : ""
        }</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.soft};text-align:center;white-space:nowrap;">x ${esc(it.qty)}</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BRAND.line};font-size:14px;color:${BRAND.ink};text-align:right;white-space:nowrap;">${ksh(it.total)}</td>
      </tr>`;
    })
    .join("");
  const line = (label, value, strong) =>
    `<tr><td colspan="2" style="padding:6px 0;font-size:14px;color:${strong ? BRAND.ink : BRAND.soft};${strong ? "font-weight:700;" : ""}">${label}</td>
     <td style="padding:6px 0 6px 12px;font-size:14px;text-align:right;color:${BRAND.ink};${strong ? "font-weight:700;" : ""}white-space:nowrap;">${value}</td></tr>`;
  const ship = order.ship_date
    ? `<div style="margin:0 0 16px;padding:12px 14px;background:${BRAND.blush};border-radius:8px;font-size:14px;color:${BRAND.ink};">
         <span style="color:${BRAND.roseDeep};font-weight:700;">Shipping date</span><br>${esc(fmtDate(order.ship_date))}</div>`
    : "";
  const html = `<div style="margin:6px 0 22px;">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.roseDeep};font-weight:700;margin:0 0 8px;">Order ${esc(order.order_no)}</div>
    ${ship}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      ${rows}
      ${Number(order.discount) > 0 ? line("Discount", `- ${ksh(order.discount)}`) : ""}
      ${Number(order.shipping_fee) > 0 ? line("Shipping", ksh(order.shipping_fee)) : ""}
      ${line("Total", ksh(order.total), true)}
    </table></div>`;
  const text = [
    `Order ${order.order_no}`,
    order.ship_date ? `Shipping date: ${fmtDate(order.ship_date)}` : "",
    ...(order.items || []).map((it) => `- ${it.name} x ${it.qty}  ${ksh(it.total)}`),
    `Total: ${ksh(order.total)}`,
  ].filter(Boolean).join("\n");
  return { html, text };
}

function cartBlock(cart) {
  if (!cart || !(cart.items || []).length) return { html: "", text: "" };
  const rows = cart.items
    .map((it) => {
      const opt = optionLine(it.options);
      const img = it.image
        ? `<img src="${esc(it.image)}" width="64" height="64" alt="" style="display:block;width:64px;height:64px;object-fit:cover;border-radius:8px;border:1px solid ${BRAND.line};">`
        : `<div style="width:64px;height:64px;border-radius:8px;background:${BRAND.blush};"></div>`;
      return `<tr>
        <td width="76" style="padding:10px 12px 10px 0;border-bottom:1px solid ${BRAND.line};vertical-align:middle;">${img}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${BRAND.line};vertical-align:middle;font-size:14px;color:${BRAND.ink};">
          <a href="${esc(it.url)}" style="color:${BRAND.ink};text-decoration:none;font-weight:600;">${esc(it.name)}</a>${
            opt ? `<div style="font-size:12px;color:${BRAND.soft};margin-top:2px;">${esc(opt)}</div>` : ""
          }</td>
        <td style="padding:10px 0 10px 12px;border-bottom:1px solid ${BRAND.line};vertical-align:middle;text-align:right;font-size:14px;color:${BRAND.soft};white-space:nowrap;">x ${esc(it.qty)}</td>
      </tr>`;
    })
    .join("");
  const html = `<div style="margin:6px 0 22px;">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.roseDeep};font-weight:700;margin:0 0 8px;">In your cart</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">${rows}</table></div>`;
  const text = ["In your cart:", ...cart.items.map((it) => `- ${it.name} x ${it.qty}  ${it.url}`)].join("\n");
  return { html, text };
}

function offerBlock(offer) {
  if (!offer) return { html: "", text: "" };
  const html = `<div style="margin:6px 0 22px;padding:18px 20px;background:#000;border-radius:10px;text-align:center;">
    <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.rose};font-weight:700;">Offer</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#fff;margin:6px 0 0;line-height:1.25;">${esc(offer.title)}</div>
    ${offer.text ? `<div style="font-size:13px;color:#d9c9cc;margin-top:6px;">${esc(offer.text)}</div>` : ""}
    ${offer.ends ? `<div style="font-size:12px;color:${BRAND.rose};margin-top:10px;">Ends ${esc(offer.ends)}</div>` : ""}
  </div>`;
  const text = `OFFER: ${offer.title}${offer.text ? ` - ${offer.text}` : ""}${offer.ends ? ` (ends ${offer.ends})` : ""}`;
  return { html, text };
}

/**
 * @param {object} p
 * @param {string} p.subject      template subject, may hold {{placeholders}}
 * @param {string} p.preheader    the grey preview line next to the subject in the inbox
 * @param {string} p.body         template body
 * @param {string=} p.ctaLabel
 * @param {string=} p.ctaUrl
 * @param {string[]=} p.blocks    "order" | "cart" | "offer"
 * @param {object} p.data         placeholder values (first_name, site_url, order_no, ...)
 * @param {object=} p.order       { order_no, ship_date, items:[{name,options,qty,total}], discount, shipping_fee, total }
 * @param {object=} p.cart        { items:[{name,options,qty,url,image}] }
 * @param {object=} p.offer       { title, text, ends }
 * @param {string=} p.unsubscribeUrl  set for marketing and follow-ups
 * @param {string=} p.siteUrl
 * @param {string=} p.supportEmail
 * @param {string=} p.footerNote  why the person is getting this
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderEmail(p) {
  const data = p.data || {};
  const subject = fill(p.subject, data).replace(/\s+/g, " ").trim();
  const siteUrl = (p.siteUrl || data.site_url || "").replace(/\/$/, "");
  const blocks = p.blocks || [];
  const o = blocks.includes("order") ? orderBlock(p.order) : { html: "", text: "" };
  const c = blocks.includes("cart") ? cartBlock(p.cart) : { html: "", text: "" };
  const f = blocks.includes("offer") ? offerBlock(p.offer) : { html: "", text: "" };

  const ctaUrl = p.ctaUrl ? fill(p.ctaUrl, data) : "";
  const ctaLabel = p.ctaLabel ? fill(p.ctaLabel, data) : "";
  const button =
    ctaUrl && ctaLabel
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 26px;"><tr><td style="border-radius:100px;background:#000;">
           <a href="${esc(ctaUrl)}" style="display:inline-block;padding:14px 30px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:100px;">${esc(ctaLabel)}</a>
         </td></tr></table>`
      : "";

  const hello = data.first_name ? `<p style="margin:0 0 18px;color:${BRAND.ink};font-size:15px;line-height:1.65;">Hi ${esc(data.first_name)},</p>` : "";
  const bodyText = String(p.body || "");
  // templates that already start with a greeting ("Hi {{first_name}}", "Thank you, {{first_name}}") don't get another
  const greet = /^\s*(hi|hello|dear|thank you|thanks|welcome|congratulations|good news)\b/i.test(fill(bodyText, data)) ? "" : hello;

  const footerBits = [];
  if (p.footerNote) footerBits.push(esc(p.footerNote));
  if (p.unsubscribeUrl) footerBits.push(`<a href="${esc(p.unsubscribeUrl)}" style="color:${BRAND.roseDeep};">Unsubscribe from these emails</a>`);
  if (p.supportEmail) footerBits.push(`Questions? Reply to this email or write to <a href="mailto:${esc(p.supportEmail)}" style="color:${BRAND.roseDeep};">${esc(p.supportEmail)}</a>`);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(fill(p.preheader || "", data))}${"&nbsp;&zwnj;".repeat(30)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.page};"><tr><td align="center" style="padding:28px 14px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
    <tr><td align="center" style="padding:0 0 18px;">
      <a href="${esc(siteUrl)}" style="text-decoration:none;color:${BRAND.ink};">
        <span style="font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;letter-spacing:.28em;">LASHTRIBE</span>
        <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;color:${BRAND.roseDeep};"> Africa</span>
      </a>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:14px;border:1px solid ${BRAND.line};overflow:hidden;">
      <div style="height:5px;background:${BRAND.rose};"></div>
      <div style="padding:30px 30px 8px;font-family:Helvetica,Arial,sans-serif;">
        <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-weight:600;font-size:26px;line-height:1.25;color:${BRAND.ink};">${esc(subject)}</h1>
        ${greet}
        ${bodyHtml(bodyText, data)}
        ${o.html}${c.html}${f.html}
        ${button}
      </div>
    </td></tr>
    <tr><td align="center" style="padding:20px 16px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${BRAND.soft};">
      ${footerBits.map((b) => `<div>${b}</div>`).join("")}
      <div style="margin-top:8px;color:#9a9a9a;">Lashtribe Africa &middot; Nairobi, Kenya</div>
    </td></tr>
  </table>
</td></tr></table></body></html>`;

  const text = [
    subject,
    "",
    greet ? `Hi ${data.first_name},` : "",
    bodyPlain(bodyText, data),
    o.text, c.text, f.text,
    ctaUrl && ctaLabel ? `${ctaLabel}: ${ctaUrl}` : "",
    "",
    p.footerNote || "",
    p.unsubscribeUrl ? `Unsubscribe: ${p.unsubscribeUrl}` : "",
    "Lashtribe Africa, Nairobi, Kenya",
  ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0)).join("\n");

  return { subject, html, text };
}

/** Example data for the admin preview and for "Send test", per template family. */
export function sampleContext(siteUrl = "https://lashtribeafrica.com") {
  const order = {
    order_no: "LT-1042",
    ship_date: "2026-11-15",
    discount: 0,
    shipping_fee: 1700,
    total: 9700,
    items: [
      { name: "Premade Fans 0.07 Mixed Trays", options: { Curl: "C", Length: "12mm" }, qty: 4, total: 6000 },
      { name: "Lash Remover Gel", options: null, qty: 2, total: 2000 },
    ],
  };
  return {
    data: {
      first_name: "Achieng", site_url: siteUrl, order_no: order.order_no, order_status: "refunded",
      ship_date: fmtDate(order.ship_date), next_ship_date: fmtDate("2026-11-15"), order_by_date: fmtDate("2026-11-07"),
      course_title: "InfinityGlow Mastery", course_url: `${siteUrl}/academy/learn/?course=infinityglow-mastery`,
      certificate_no: "LTA-2026-00001", verify_code: "a1b2c3d4e5f6",
      review_url: `${siteUrl}/review?preview=1`,
      offer_title: "Black Friday: free shipping", offer_ends: "Friday 28 November 2026",
      campaign_subject: "Our newsletter", campaign_body: "Write your message here.",
    },
    order,
    cart: {
      items: [
        { name: "Premade Fans 0.07 Mixed Trays", options: { Curl: "C" }, qty: 4, url: `${siteUrl}/ecommerce`, image: "" },
        { name: "Lash Remover Gel", options: null, qty: 2, url: `${siteUrl}/ecommerce`, image: "" },
      ],
    },
    offer: { title: "Black Friday: free shipping", text: "Free shipping on every order, no minimum.", ends: "Friday 28 November 2026" },
  };
}
