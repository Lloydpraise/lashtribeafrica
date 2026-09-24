import { useState } from "react";
import { uploadProductMedia, deleteProductMedia } from "./products.api.js";

export default function MediaUploader({ kind, items, onChange, productSlug }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const isVideo = kind === "video";
  const accept = isVideo ? "video/*" : "image/*";
  const folder = `${productSlug || "unassigned"}/${isVideo ? "videos" : "images"}`;

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    setError("");

    try {
      const uploaded = [];
      for (const file of files) {
        const { url, path } = await uploadProductMedia(file, folder);
        uploaded.push(
          isVideo ? { url, path, title: file.name } : { url, path, alt: "" }
        );
      }
      onChange([...items, ...uploaded]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRemove(index) {
    const target = items[index];
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    try {
      await deleteProductMedia(target.path);
    } catch {
      // Row is already removed from the product either way; the
      // storage file being orphaned isn't worth blocking the UI over.
    }
  }

  function updateField(index, field, value) {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    onChange(next);
  }

  return (
    <div className="media-uploader">
      <div className="media-grid">
        {items.map((item, i) => (
          <div className="media-item" key={item.path || i}>
            {isVideo ? (
              <video src={item.url} controls />
            ) : (
              <img src={item.url} alt={item.alt || ""} />
            )}
            <input
              type="text"
              className="media-caption-input"
              placeholder={isVideo ? "Title (optional)" : "Alt text (optional)"}
              value={isVideo ? item.title || "" : item.alt || ""}
              onChange={(e) =>
                updateField(i, isVideo ? "title" : "alt", e.target.value)
              }
            />
            <button
              type="button"
              className="media-remove"
              onClick={() => handleRemove(i)}
            >
              Remove
            </button>
          </div>
        ))}

        <label className="media-upload-tile">
          {uploading ? "Uploading…" : `+ Add ${isVideo ? "video" : "image"}`}
          <input
            type="file"
            accept={accept}
            multiple
            onChange={handleFiles}
            disabled={uploading}
            hidden
          />
        </label>
      </div>
      {error && <p className="admin-gate-error">{error}</p>}
    </div>
  );
}
