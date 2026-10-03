import { useState } from "react";
import { uploadMedia, explain } from "./courses.api.js";

/**
 * Upload-or-link image control used for course heroes, bundle covers, story figures and video posters.
 * `folder` decides where uploads live in the course-media bucket (e.g. courses/<id>/hero).
 *
 * Replacing or removing an image never deletes the old file straight away: the lesson that is
 * currently saved may still point at it until the admin presses Save. Deleting a whole course
 * removes its folder, which cleans up anything left over.
 */
export default function ImageField({ url, folder, onChange, maxWidth = 1600, compact = false, label = "image" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [linkMode, setLinkMode] = useState(false);
  const [link, setLink] = useState("");

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadMedia(file, folder, { maxWidth });
      onChange({ url: uploaded.url, path: uploaded.path });
    } catch (err) {
      setError(explain(err, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  function applyLink() {
    const v = link.trim();
    if (!/^https?:\/\//i.test(v)) {
      setError("Paste a full image link starting with https://");
      return;
    }
    setError("");
    onChange({ url: v, path: "" });
    setLink("");
    setLinkMode(false);
  }

  return (
    <div className={`cs-image${compact ? " compact" : ""}`}>
      <div className="cs-image-box">
        {url ? <img src={url} alt="" /> : <div className="cs-image-empty">{busy ? "Uploading…" : `No ${label} yet`}</div>}
        {busy && url && <div className="cs-image-busy">Uploading…</div>}
      </div>
      <div className="cs-image-actions">
        <label className={`admin-btn secondary${busy ? " disabled" : ""}`}>
          {url ? "Replace" : "Upload"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={onFile} disabled={busy} hidden />
        </label>
        <button type="button" className="admin-btn secondary" onClick={() => setLinkMode((v) => !v)} disabled={busy}>
          Use a link
        </button>
        {url && (
          <button type="button" className="admin-btn secondary danger" onClick={() => onChange({ url: "", path: "" })} disabled={busy}>
            Remove
          </button>
        )}
      </div>
      {linkMode && (
        <div className="inline-add-row">
          <input type="text" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyLink())} />
          <button type="button" className="admin-btn" onClick={applyLink}>Use</button>
        </div>
      )}
      {error && <p className="admin-gate-error">{error}</p>}
    </div>
  );
}
