import { useEffect, useRef, useState } from "react";
import { fetchCoursePdf, uploadCoursePdf, removeCoursePdf, downloadCoursePdf, explain, MAX_PDF_MB } from "./courses.api.js";

/** Upload / download / replace / remove the course's reference PDF (admin only). Saves instantly. */
export default function PdfField({ courseId, disabled }) {
  const [pdf, setPdf] = useState(undefined); // undefined = loading, null = none
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);

  useEffect(() => {
    async function download() {
    setBusy(true); setError("");
    try { await downloadCoursePdf(pdf); }
    catch (err) { setError(explain(err, "Couldn't download the PDF.")); }
    finally { setBusy(false); }
  }

  if (disabled) return;
    fetchCoursePdf(courseId).then(setPdf).catch((e) => { setPdf(null); setError(explain(e, "Couldn't load the PDF. Run migration 0010_course_pdf.sql.")); });
  }, [courseId, disabled]);

  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    setBusy(true); setError("");
    try { setPdf(await uploadCoursePdf(courseId, f, pdf)); }
    catch (err) { setError(explain(err, "Upload failed.")); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await removeCoursePdf(courseId, pdf); setPdf(null); }
    catch (err) { setError(explain(err, "Couldn't remove the PDF.")); }
    finally { setBusy(false); }
  }

  if (disabled) return <p className="form-hint">Save the course first, then you can attach its PDF.</p>;
  return (
    <div>
      {pdf ? <p style={{ margin: "0 0 10px", fontSize: 14, wordBreak: "break-word" }}>📄 <strong>{pdf.pdf_name}</strong>{pdf.pdf_size ? <span className="form-hint"> · {(pdf.pdf_size / 1048576).toFixed(1)} MB</span> : null}</p>
        : <p className="form-hint" style={{ margin: "0 0 10px" }}>{pdf === undefined ? "Checking…" : "No PDF attached."}</p>}
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={onFile} />
      <button type="button" className="admin-btn secondary" disabled={busy} onClick={() => input.current.click()}>
        {busy ? "Working…" : pdf ? "Replace PDF" : "Upload PDF"}
      </button>{" "}
      {pdf && <button type="button" className="admin-btn secondary" disabled={busy} onClick={download}>Download</button>}{" "}
      {pdf && <button type="button" className="admin-btn secondary danger" disabled={busy} onClick={remove}>Remove</button>}
      <p className="form-hint">Kept private for you and your teachers as a reference for checking the lessons. Students cannot see or download it. Up to {MAX_PDF_MB} MB.</p>
      {error && <p style={{ color: "#b3261e", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
