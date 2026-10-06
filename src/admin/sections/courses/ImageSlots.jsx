import { useRef, useState } from "react";
import { uploadMedia, explain } from "./courses.api.js";
import { matchFiles } from "./courseImages.js";

/**
 * Lists the pictures an imported file refers to but doesn't contain, and lets the admin attach them:
 * pick many files at once (matched by file name to the slot name) or upload each slot on its own.
 */
export default function ImageSlots({ courseId, slots, urls, onUrls }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const multi = useRef(null);
  const folder = `courses/${courseId}/figures`;
  const done = slots.filter((s) => urls[s.key]).length;

  async function put(key, file, label) {
    setBusy(key || "bulk");
    try {
      const { url } = await uploadMedia(file, key === "hero" ? `courses/${courseId}/hero` : folder, { maxWidth: key === "hero" ? 1600 : 1400 });
      return url;
    } catch (err) {
      setError(`${label}: ${explain(err, "Upload failed.")}`);
      return null;
    }
  }

  async function onMany(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    setError(""); setNote("");
    const { matched, extra } = matchFiles(slots.filter((s) => !urls[s.key]), files);
    const next = { ...urls };
    for (const [key, file] of Object.entries(matched)) {
      const url = await put(key, file, file.name);
      if (url) next[key] = url;
    }
    onUrls(next);
    setBusy("");
    setNote(`Matched ${Object.keys(matched).length} of ${files.length} file${files.length === 1 ? "" : "s"} by name.${extra.length ? ` Not matched: ${extra.map((f) => f.name).join(", ")}. Upload those on the slot you want.` : ""}`);
  }

  async function onOne(slot, e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(""); setNote("");
    const url = await put(slot.key, file, slot.label);
    if (url) onUrls({ ...urls, [slot.key]: url });
    setBusy("");
  }

  return (
    <div className="cs-slots">
      <h4>Pictures to add ({done} of {slots.length})</h4>
      <p className="form-hint">
        This file mentions pictures without containing them. Select all your image files at once and they are matched by name
        (<code>eye-anatomy.jpg</code> fills <code>image:eye-anatomy</code>), or add each one below. Skipped pictures are simply left out
        and can be added later in the lesson editor.
      </p>
      <div className="cs-row">
        <label className="admin-btn">
          {busy === "bulk" ? "Uploading…" : "Choose image files"}
          <input type="file" accept="image/*" multiple hidden disabled={!!busy} onChange={onMany} />
        </label>
      </div>
      <ul className="cs-slot-list" style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8 }}>
        {slots.map((s) => (
          <li key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {urls[s.key]
              ? <img src={urls[s.key]} alt="" style={{ width: 56, height: 40, objectFit: "cover", borderRadius: 6 }} />
              : <span style={{ width: 56, height: 40, borderRadius: 6, background: "#f1e6e8", display: "inline-block" }} />}
            <span style={{ flex: "1 1 180px", minWidth: 0 }}>
              <b style={{ fontSize: 13 }}>{s.label}</b>
              <br /><span className="form-hint" style={{ margin: 0 }}>{s.key} · {s.where.slice(0, 2).join(", ")}{s.where.length > 2 ? "…" : ""}</span>
            </span>
            <label className="admin-btn secondary">
              {busy === s.key ? "Uploading…" : urls[s.key] ? "Replace" : "Add picture"}
              <input type="file" accept="image/*" hidden disabled={!!busy} onChange={(e) => onOne(s, e)} />
            </label>
          </li>
        ))}
      </ul>
      {note && <p className="form-hint">{note}</p>}
      {error && <p style={{ color: "#b3261e", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
