// Builds the certificate PDF in the browser (pdf-lib), so nothing is stored or served from a server.
//
// TWO MODES
//   1. Template mode: if /certificate-template.pdf exists (put your file in public/), page 1 of it is
//      used as the background and the student's NAME and the SERIAL number are written onto it at the
//      positions in TEMPLATE_LAYOUT below. Nudge the numbers until the text sits where you want it.
//      PDF coordinates are in points (1 pt = 1/72 inch) measured from the BOTTOM-LEFT of the page.
//      An A4 landscape page is 842 x 595. Set x to null to centre a field on the page.
//   2. Default design: with no template file, a clean Lashtribe-style certificate is drawn instead.
//
// COURSE TEMPLATES
//   A course can have its own certificate (COURSE_TEMPLATES, keyed by course id). Its PDF is used as
//   the background and its own fonts (TTF files in public/certificates/fonts/) are embedded for the
//   fields it fills in. It wins over the shared /certificate-template.pdf for that course.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { supabase } from "./service.js";

export const TEMPLATE_URL = "/certificate-template.pdf";

// Only name + serial are enabled for a template (it probably already prints the rest).
// Turn course / date / verify on if your template has blank space for them.
export const TEMPLATE_LAYOUT = {
  name:   { enabled: true,  x: null, y: 300, size: 40, align: "center", font: "serifItalic", color: [0.13, 0.13, 0.13], maxWidth: 620 },
  serial: { enabled: true,  x: 60,   y: 48,  size: 11, align: "left",   font: "sans",        color: [0.25, 0.25, 0.25], prefix: "Certificate No. " },
  course: { enabled: false, x: null, y: 235, size: 22, align: "center", font: "serifBold",   color: [0.13, 0.13, 0.13], maxWidth: 620 },
  date:   { enabled: false, x: null, y: 110, size: 12, align: "center", font: "sans",        color: [0.25, 0.25, 0.25] },
  verify: { enabled: false, x: null, y: 30,  size: 8,  align: "center", font: "sans",        color: [0.45, 0.45, 0.45] },
};

// Per-course certificates. Positions were measured from the designer's PDF (the original name,
// serial and date were removed from public/certificates/<slug>.pdf and are drawn here in the same font, size
// and colour). `fonts` maps a font name used in the layout to a TTF in public/.
const NAVY = [13 / 255, 43 / 255, 85 / 255];
export const COURSE_TEMPLATES = {
  // InfinityGlow™ Mastery (the name, serial number and download date change per certificate)
  "ec782526-4917-5fc8-a601-f65a45e72baf": {
    url: "/certificates/infinityglow-mastery.pdf",
    fonts: {
      pinyon: "/certificates/fonts/PinyonScript-Regular.ttf",
      poppins: "/certificates/fonts/Poppins-Regular.ttf",
    },
    layout: {
      name:   { enabled: true, x: 425.3, y: 308.8, size: 59.5, align: "center", font: "pinyon",  color: NAVY, maxWidth: 520 },
      serial: { enabled: true, x: 766.0, y: 44.1,  size: 11.6, align: "right",  font: "poppins", color: NAVY, prefix: "SERIAL NO: " },
      course: { enabled: false },
      // the date the student downloads the certificate, as on the design: DATE: 05/03/2026
      date:   { enabled: true, x: 421.1, y: 129.3, size: 11.5, align: "center", font: "poppins", color: NAVY, prefix: "DATE: ", source: "today", format: "dmy" },
      verify: { enabled: false },
    },
  },
};

// Standard PDF fonts only know Latin characters; strip anything else so a name never breaks the PDF.
function safeText(text) {
  return String(text || "")
    .replace(/[‘’ʼ′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .normalize("NFC")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, (ch) => ch.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, ""))
    .trim();
}

async function loadFonts(pdf) {
  return {
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    serifItalic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    sans: await pdf.embedFont(StandardFonts.Helvetica),
    sansBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
}

function drawField(page, fonts, spec, text) {
  const value = safeText(text);
  if (!spec || !value) return;
  const font = fonts[spec.font] || fonts.sans;
  let size = spec.size;
  if (spec.maxWidth) {
    while (size > 8 && font.widthOfTextAtSize(value, size) > spec.maxWidth) size -= 1;
  }
  const width = font.widthOfTextAtSize(value, size);
  const pageWidth = page.getWidth();
  const anchor = spec.x == null ? pageWidth / 2 : spec.x;
  const x = spec.align === "center" ? anchor - width / 2 : spec.align === "right" ? anchor - width : anchor;
  // Some exported PDFs (Canva) don't start their page box at 0,0; measure from the visible page corner.
  const box = page.getCropBox();
  page.drawText(value, { x: x + box.x, y: spec.y + box.y, size, font, color: rgb(...(spec.color || [0, 0, 0])) });
}

function fmtDate(iso) {
  return new Date(iso || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// 05/03/2026
function fmtDateDmy(iso) {
  const d = new Date(iso || Date.now());
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function drawDefaultDesign(page, fonts, data) {
  const w = page.getWidth();
  const h = page.getHeight();
  const rose = rgb(0.79, 0.54, 0.59);
  const ink = rgb(0.13, 0.13, 0.13);
  const grey = rgb(0.45, 0.45, 0.45);

  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: rgb(1, 0.992, 0.984) });
  page.drawRectangle({ x: 22, y: 22, width: w - 44, height: h - 44, borderColor: rose, borderWidth: 2.5 });
  page.drawRectangle({ x: 32, y: 32, width: w - 64, height: h - 64, borderColor: ink, borderWidth: 0.6 });

  const center = (text, y, font, size, color) => {
    const tw = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (w - tw) / 2, y, size, font, color });
  };

  center("L A S H T R I B E   A C A D E M Y", h - 92, fonts.sansBold, 12, rose);
  center("Certificate of Completion", h - 150, fonts.serifBold, 38, ink);
  center("This certifies that", h - 200, fonts.serif, 15, grey);

  drawField(page, fonts, { x: null, y: h - 262, size: 44, align: "center", font: "serifItalic", color: [0.13, 0.13, 0.13], maxWidth: 640 }, data.holder_name);
  page.drawLine({ start: { x: w / 2 - 230, y: h - 274 }, end: { x: w / 2 + 230, y: h - 274 }, thickness: 0.8, color: rose });

  center("has successfully completed the course", h - 312, fonts.serif, 15, grey);
  drawField(page, fonts, { x: null, y: h - 358, size: 26, align: "center", font: "serifBold", color: [0.13, 0.13, 0.13], maxWidth: 640 }, data.course_title);
  center(`Awarded on ${fmtDate(data.issued_at)}`, h - 400, fonts.serif, 13, grey);

  page.drawText(`Certificate No. ${data.certificate_no}`, { x: 58, y: 62, size: 10, font: fonts.sans, color: ink });
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify?code=${data.verify_code}`;
  page.drawText(`Verify: ${verifyUrl}`, { x: 58, y: 48, size: 8, font: fonts.sans, color: grey });

  const sig = "Lashtribe Academy";
  const sw = fonts.serifItalic.widthOfTextAtSize(sig, 16);
  page.drawLine({ start: { x: w - 58 - 170, y: 74 }, end: { x: w - 58, y: 74 }, thickness: 0.6, color: ink });
  page.drawText(sig, { x: w - 58 - 85 - sw / 2, y: 80, size: 16, font: fonts.serifItalic, color: ink });
  page.drawText("Academy Director", { x: w - 58 - 85 - fonts.sans.widthOfTextAtSize("Academy Director", 8) / 2, y: 62, size: 8, font: fonts.sans, color: grey });
}

async function fetchBytes(url) {
  const res = await fetch(url, { cache: "no-store" });
  const type = res.headers.get("content-type") || "";
  // a missing file in dev comes back as an HTML 404 page, so check the type too
  if (!res.ok || /text\/html/i.test(type)) throw new Error(`Missing certificate file ${url}`);
  return res.arrayBuffer();
}

/** cert: a course_certificates row (certificate_no, verify_code, holder_name, course_title, issued_at, course_id). */
export async function buildCertificatePdf(cert) {
  let pdf;
  let templateUsed = false;
  let layout = TEMPLATE_LAYOUT;
  let extraFonts = {};

  const course = COURSE_TEMPLATES[cert.course_id];
  if (course) {
    // the course's own design; if it can't load, fall through to the shared template / default design
    try {
      pdf = await PDFDocument.load(await fetchBytes(course.url));
      pdf.registerFontkit(fontkit);
      for (const [key, url] of Object.entries(course.fonts || {})) {
        extraFonts[key] = await pdf.embedFont(await fetchBytes(url), { subset: true });
      }
      layout = { ...TEMPLATE_LAYOUT, ...course.layout };
      templateUsed = true;
    } catch (err) {
      console.warn("Course certificate template failed, using the default design:", err);
      pdf = undefined;
      extraFonts = {};
    }
  }

  if (!templateUsed) {
    try {
      const res = await fetch(TEMPLATE_URL, { cache: "no-store" });
      const type = res.headers.get("content-type") || "";
      if (res.ok && /pdf|octet-stream/i.test(type)) {
        pdf = await PDFDocument.load(await res.arrayBuffer());
        templateUsed = true;
      }
    } catch { /* no template: use the default design */ }
  }

  const data = {
    certificate_no: cert.certificate_no,
    verify_code: cert.verify_code,
    holder_name: cert.holder_name,
    course_title: cert.course_title,
    issued_at: cert.issued_at || cert.certificate_issued_at,
  };

  if (!templateUsed) {
    pdf = await PDFDocument.create();
    pdf.addPage([842, 595]);
  }
  const fonts = { ...(await loadFonts(pdf)), ...extraFonts };
  const page = pdf.getPage(0);

  if (templateUsed) {
    const L = layout;
    if (L.name.enabled) drawField(page, fonts, L.name, data.holder_name);
    if (L.serial.enabled) drawField(page, fonts, L.serial, `${L.serial.prefix || ""}${data.certificate_no}`);
    if (L.course.enabled) drawField(page, fonts, L.course, data.course_title);
    if (L.date.enabled) {
      const when = L.date.source === "today" ? new Date() : data.issued_at;
      drawField(page, fonts, L.date, `${L.date.prefix || ""}${L.date.format === "dmy" ? fmtDateDmy(when) : fmtDate(when)}`);
    }
    if (L.verify.enabled) drawField(page, fonts, L.verify, `Verify: ${window.location.origin}/verify?code=${data.verify_code}`);
  } else {
    drawDefaultDesign(page, fonts, data);
  }

  pdf.setTitle(`Lashtribe Academy Certificate ${data.certificate_no}`);
  pdf.setAuthor("Lashtribe Academy");
  return pdf.save();
}

export async function downloadCertificatePdf(cert) {
  let row = cert;
  if (!row.holder_name && row.id) {
    const { data, error } = await supabase.from("course_certificates").select("*").eq("id", row.id).single();
    if (error) throw new Error(error.message);
    row = data;
  }
  const bytes = await buildCertificatePdf(row);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Lashtribe-Certificate-${row.certificate_no}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
