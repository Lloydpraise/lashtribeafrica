import { useMemo, useState } from "react";
import { toPreviewCourse, lessonCount } from "./courseModel.js";

const PREVIEW_KEY = "lashtribe_course_preview"; // read by src/services/academy.js
const PROGRESS_KEY = "lashtribe_academy_demo_v1";

/**
 * Shows the course exactly as a student sees it: the real /academy/learn/ player in an iframe,
 * fed with the unsaved course from the editor. Nothing is written to the database.
 */
export default function PreviewModal({ course, lessonId, onClose }) {
  const [device, setDevice] = useState("phone");
  const [run, setRun] = useState(0);

  const src = useMemo(() => {
    try {
      localStorage.setItem(PREVIEW_KEY, JSON.stringify(toPreviewCourse(course)));
      // start every preview from a clean slate, so locked "finish the previous lesson" states are real
      const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      delete all.__preview__;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
    } catch {
      /* private mode: the iframe will say the course isn't available */
    }
    const q = new URLSearchParams({ course: "__preview__" });
    if (lessonId) q.set("lesson", lessonId);
    return `/academy/learn/?${q.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, lessonId]);

  const empty = lessonCount(course) === 0;

  return (
    <div className="admin-modal-backdrop cs-preview-backdrop" onMouseDown={onClose}>
      <div className="cs-preview" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cs-preview-bar">
          <strong>Preview</strong>
          <span className="form-hint">As students see it · your unsaved changes are included</span>
          <div className="cs-seg" role="group" aria-label="Device">
            <button type="button" className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}>Phone</button>
            <button type="button" className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>Desktop</button>
          </div>
          <button type="button" className="admin-btn secondary" onClick={() => setRun((n) => n + 1)}>Restart</button>
          <a className="admin-btn secondary" href={src} target="_blank" rel="noreferrer">Open in new tab</a>
          <button type="button" className="admin-btn" onClick={onClose}>Close</button>
        </div>
        <div className={`cs-preview-stage ${device}`}>
          {empty ? (
            <p className="cs-empty">Add at least one lesson to preview the course.</p>
          ) : (
            <iframe key={run + src} title="Course preview" src={src} />
          )}
        </div>
      </div>
    </div>
  );
}
