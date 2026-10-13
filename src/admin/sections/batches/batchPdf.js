// Builds the supplier order PDF for one shipping batch, in the browser (pdf-lib).
//
//   Section per supplier, each on its own page(s), so a supplier can be sent just their page:
//   SKU, product and total quantity across every order in the batch.
//   Optional last pages: a dispatch list (customer, phone, area, items per order).
//
// Standard PDF fonts only know Latin characters, so text is cleaned first.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { formatBatchDate } from "../../../data/batches.js";
import { itemLabel, optionsText } from "../../../lib/pricing.js";

const PAGE = [595.28, 841.89]; // A4 portrait, points
const M = 48;
const INK = rgb(0.13, 0.13, 0.13);
const MUTED = rgb(0.45, 0.45, 0.45);
const ROSE = rgb(0.62, 0.36, 0.42);
const LINE = rgb(0.85, 0.85, 0.85);

const safe = (t) =>
  String(t ?? "")
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ]/g, "");

function wrap(text, font, size, maxWidth) {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

class Writer {
  constructor(doc, fonts, heading) {
    this.doc = doc;
    this.f = fonts;
    this.heading = heading;
    this.page = null;
    this.y = 0;
  }

  newPage() {
    this.page = this.doc.addPage(PAGE);
    this.page.drawText(safe(this.heading), { x: M, y: PAGE[1] - 30, size: 8, font: this.f.regular, color: MUTED });
    this.page.drawLine({ start: { x: M, y: PAGE[1] - 36 }, end: { x: PAGE[0] - M, y: PAGE[1] - 36 }, thickness: 0.5, color: LINE });
    this.y = PAGE[1] - 64;
    return this.page;
  }

  ensure(height) {
    if (!this.page || this.y - height < M + 24) this.newPage();
  }

  text(str, { x = M, size = 10, font = this.f.regular, color = INK, align = "left", width = PAGE[0] - 2 * M } = {}) {
    const t = safe(str);
    let px = x;
    if (align === "right") px = x + width - font.widthOfTextAtSize(t, size);
    this.page.drawText(t, { x: px, y: this.y, size, font, color });
  }

  // Draws a hairline at (current baseline + offset), then moves down by `gap`.
  // Default offset 6 sits just under the previous line of text; use a negative offset to
  // underline the text that was just written.
  rule(gap = 10, offset = 6) {
    this.page.drawLine({ start: { x: M, y: this.y + offset }, end: { x: PAGE[0] - M, y: this.y + offset }, thickness: 0.5, color: LINE });
    this.y -= gap;
  }
}

function footers(doc, font) {
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const t = `Page ${i + 1} of ${pages.length}`;
    p.drawText(t, { x: PAGE[0] - M - font.widthOfTextAtSize(t, 8), y: 26, size: 8, font, color: MUTED });
  });
}

// supplier line: product name plus the options ordered (each curl / length is its own row)
const supplierLine = (r) => {
  const opts = optionsText(r.options);
  return opts ? `${r.product_name} (${opts})` : r.product_name;
};

/**
 * batch     – { ship_date }
 * lines     – rows from batch_supplier_lines(): supplier_id, supplier_name, sku, product_name, quantity
 * suppliers – supplier rows (for contact details)
 * orders    – admin order rows of this batch (only used for the dispatch list)
 * options   – { onlySupplierId, includeUnpaid, includeDispatch }
 */
export async function buildBatchPdf({ batch, lines, suppliers = [], orders = [], options = {} }) {
  const { onlySupplierId = null, includeUnpaid = false, includeDispatch = false } = options;
  const doc = await PDFDocument.create();
  const f = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRomanBold),
  };
  const shipText = formatBatchDate(batch.ship_date, true);
  const w = new Writer(doc, f, `Lashtribe Africa  |  Supplier order  |  Ships ${shipText}`);
  const supplierById = new Map(suppliers.map((s) => [s.id, s]));

  // group lines by supplier (null supplier last)
  const groups = new Map();
  for (const l of lines) {
    if (onlySupplierId && l.supplier_id !== onlySupplierId) continue;
    const key = l.supplier_id || "none";
    if (!groups.has(key)) groups.set(key, { id: l.supplier_id, name: l.supplier_name, rows: [] });
    groups.get(key).rows.push(l);
  }
  const list = [...groups.values()].sort((a, b) => (a.id ? 0 : 1) - (b.id ? 0 : 1) || a.name.localeCompare(b.name));
  const totalUnits = list.reduce((s, g) => s + g.rows.reduce((n, r) => n + Number(r.quantity), 0), 0);

  // ---- one section per supplier ----
  if (list.length === 0) {
    w.newPage();
    w.text("Supplier order", { size: 22, font: f.serif });
    w.y -= 28;
    w.text(`Ships ${shipText}`, { size: 11, color: ROSE, font: f.bold });
    w.y -= 30;
    w.text(
      includeUnpaid
        ? "There are no product orders in this batch yet."
        : "There are no paid product orders in this batch yet. Unpaid orders are left out of the supplier order.",
      { size: 10, color: MUTED },
    );
  }

  list.forEach((g, gi) => {
    w.newPage();
    w.text("Supplier order", { size: 22, font: f.serif });
    w.y -= 26;
    w.text(g.name, { size: 15, font: f.bold });
    w.y -= 18;
    w.text(`Ships ${shipText}`, { size: 11, color: ROSE, font: f.bold });
    w.y -= 15;
    const sup = g.id ? supplierById.get(g.id) : null;
    const contact = sup ? [sup.contact_name, sup.phone, sup.email].filter(Boolean).join("  |  ") : "";
    if (contact) {
      w.text(contact, { size: 9, color: MUTED });
      w.y -= 13;
    }
    w.text(
      includeUnpaid ? "Includes orders still awaiting payment." : "Paid orders only.",
      { size: 8.5, color: MUTED },
    );
    w.y -= 22;

    const drawHead = () => {
      w.text("SKU", { size: 8, font: f.bold, color: MUTED });
      w.text("PRODUCT", { x: M + 86, size: 8, font: f.bold, color: MUTED });
      w.text("QTY", { size: 8, font: f.bold, color: MUTED, align: "right" });
      w.rule(20, -6);
    };
    drawHead();

    let units = 0;
    for (const r of g.rows) {
      const nameLines = wrap(supplierLine(r), f.regular, 10, PAGE[0] - 2 * M - 86 - 50);
      const need = nameLines.length * 13 + 8;
      if (w.y - need < M + 24) {
        w.newPage();
        drawHead();
      }
      w.text(r.sku || "-", { size: 9, color: MUTED });
      nameLines.forEach((ln, i) => {
        w.text(ln, { x: M + 86, size: 10 });
        if (i === 0) w.text(String(r.quantity), { size: 11, font: f.bold, align: "right" });
        w.y -= 13;
      });
      units += Number(r.quantity);
      w.y -= 4;
    }
    w.ensure(40);
    w.rule(10);
    w.text(`${g.rows.length} product${g.rows.length === 1 ? "" : "s"}`, { size: 10, color: MUTED });
    w.text(`Total ${units} units`, { size: 11, font: f.bold, align: "right" });
    if (gi === list.length - 1 && list.length > 1) {
      w.y -= 18;
      w.text(`Batch total: ${totalUnits} units across ${list.length} suppliers`, { size: 9, color: MUTED });
    }
  });

  // ---- dispatch list ----
  if (includeDispatch) {
    const counts = (o) => o.status === "paid" || o.status === "fulfilled" || (includeUnpaid && o.status === "pending");
    const batchOrders = orders
      .filter((o) => counts(o) && (o.order_items || []).some((i) => i.item_type === "product"))
      .sort((a, b) => String(a.order_no).localeCompare(String(b.order_no), undefined, { numeric: true }));

    w.newPage();
    w.text("Dispatch list", { size: 22, font: f.serif });
    w.y -= 24;
    w.text(`${batchOrders.length} order${batchOrders.length === 1 ? "" : "s"}  |  Ships ${shipText}`, { size: 11, color: ROSE, font: f.bold });
    w.y -= 26;

    for (const o of batchOrders) {
      const items = (o.order_items || []).filter((i) => i.item_type === "product");
      const itemLines = items.flatMap((i) => wrap(`${i.quantity} x ${itemLabel(i)}`, f.regular, 10, PAGE[0] - 2 * M - 14));
      const notes = o.delivery_notes ? wrap(`Note: ${o.delivery_notes}`, f.regular, 9, PAGE[0] - 2 * M) : [];
      w.ensure(38 + itemLines.length * 13 + notes.length * 12);
      w.text(`${o.order_no}  -  ${o.customer?.full_name || "(no name)"}`, { size: 11, font: f.bold });
      w.text(o.status === "pending" ? "UNPAID" : "PAID", { size: 8, font: f.bold, color: o.status === "pending" ? ROSE : MUTED, align: "right" });
      w.y -= 14;
      w.text([o.customer?.phone, o.delivery_area].filter(Boolean).join("  |  ") || "No contact details", { size: 9, color: MUTED });
      w.y -= 14;
      itemLines.forEach((ln) => {
        w.text(ln, { x: M + 14, size: 10 });
        w.y -= 13;
      });
      notes.forEach((ln) => {
        w.text(ln, { size: 9, color: MUTED });
        w.y -= 12;
      });
      w.rule(14);
    }
    if (batchOrders.length === 0) w.text("No orders to dispatch.", { size: 10, color: MUTED });
  }

  footers(doc, f.regular);
  return doc.save();
}

export function downloadPdfBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const batchPdfName = (shipDate, suffix = "supplier-order") => `Lashtribe-Batch-${String(shipDate).slice(0, 10)}-${suffix}.pdf`;
