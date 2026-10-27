import { useEffect, useMemo, useState } from "react";
import { toPreviewCourse, lessonCount } from "./courseModel.js";

const PREVIEW_KEY = "lashtribe_course_preview"; // read by src/services/academy.js
const PROGRESS_KEY = "lashtribe_academy_demo_v1";

/**
 * Shows the course exactly as a student sees it: the real /academy/learn/ player in an iframe,
 * fed with the unsaved course from the editor. Nothing is written to the database.
 */
/** The completion certificate as a student would download it, filled with sample details. */
function CertificatePreview({ course }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    let made = "";
    setUrl(""); setError("");
    import("../../../services/certificatePdf.js")
      .then(({ buildCertificatePdf, COURSE_TEMPLATES }) => buildCertificatePdf({
        course_id: course.id,
        // a course with its own certificate design uses its own serial format
        certificate_no: COURSE_TEMPLATES[course.id] ? "UV-2026-VII-01" : "LTA-2026-00001",
        verify_code: "preview",
        holder_name: "Student Name",
        course_title: course.title || "Untitled course",
        issued_at: new Date().toISOString(),
      }))
      .then((bytes) => {
        made = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
        if (live) setUrl(made); else URL.revokeObjectURL(made);
      })
      .catch((err) => live && setError(err.message || "Couldn't build the certificate."));
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [course.id, course.title]);

  if (error) return <p className="cs-empty">{error}</p>;
  if (!url) return <p className="cs-empty">Building the certificate…</p>;
  return (
    <div className="cs-cert-preview">
      {!course.certificate_enabled && (
        <p className="cs-cert-note">Certificates are switched off for this course, so students won't receive this. Turn on "Certificate on completion" in the course settings to issue it.</p>
      )}
      <iframe title="Certificate preview" src={`${url}#view=FitH&toolbar=0`} />
      <div className="cs-cert-actions">
        <span className="form-hint">Sample name and number. Students get their own name, certificate number and verify link.</span>
        <a className="admin-btn secondary" href={url} target="_blank" rel="noreferrer">Open PDF</a>
        <a className="admin-btn secondary" href={url} download={`Certificate-preview-${course.slug || "course"}.pdf`}>Download</a>
      </div>
    </div>
  );
}

export default function PreviewModal({ course, lessonId, startShow = "course", onClose }) {
  const [device, setDevice] = useState("phone");
  const [run, setRun] = useState(0);
  const hasExam = !!(course.exam && course.exam.enabled && course.exam.questions.length);
  const [show, setShow] = useState(startShow === "exam" && !hasExam ? "course" : startShow); // course | exam | certificate

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
    if (show === "exam") q.set("lesson", "__exam");
    else if (lessonId && lessonId !== "__exam") q.set("lesson", lessonId);
    return `/academy/learn/?${q.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, lessonId, show]);

  const empty = lessonCount(course) === 0;

  return (
    <div className="admin-modal-backdrop cs-preview-backdrop" onMouseDown={onClose}>
      <div className="cs-preview" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cs-preview-bar">
          <strong>Preview</strong>
          <span className="form-hint">As students see it · your unsaved changes are included</span>
          <div className="cs-seg" role="group" aria-label="Show">
            <button type="button" className={show === "course" ? "on" : ""} onClick={() => setShow("course")}>Course</button>
            {hasExam && <button type="button" className={show === "exam" ? "on" : ""} onClick={() => setShow("exam")}>Preview exam</button>}
            <button type="button" className={show === "certificate" ? "on" : ""} onClick={() => setShow("certificate")}>Certificate</button>
          </div>
          {show !== "certificate" && (
            <>
              <div className="cs-seg" role="group" aria-label="Device">
                <button type="button" className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}>Phone</button>
                <button type="button" className={device === "desktop" ? "on" : ""} onClick={() => setDevice("desktop")}>Desktop</button>
              </div>
              <button type="button" className="admin-btn secondary" onClick={() => setRun((n) => n + 1)}>Restart</button>
              <a className="admin-btn secondary" href={src} target="_blank" rel="noreferrer">Open in new tab</a>
            </>
          )}
          <button type="button" className="admin-btn" onClick={onClose}>Close</button>
        </div>
        <div className={`cs-preview-stage ${show === "certificate" ? "desktop" : device}`}>
          {show === "certificate" ? (
            <CertificatePreview course={course} />
          ) : empty ? (
            <p className="cs-empty">Add at least one lesson to preview the course.</p>
          ) : (
            <iframe key={run + src} title="Course preview" src={src} />
          )}
        </div>
      </div>
    </div>
  );
}
