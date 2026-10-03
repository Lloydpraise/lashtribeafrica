import { useCallback, useEffect, useState } from "react";
import CourseList from "./courses/CourseList.jsx";
import CourseEditor from "./courses/CourseEditor.jsx";
import Bundles from "./courses/Bundles.jsx";
import { fetchCourses, fetchBundles, fetchCourseFull, explain } from "./courses/courses.api.js";
import { newCourse } from "./courses/courseModel.js";
import { Notice } from "./courses/fields.jsx";

function NewCourseModal({ onPick, onCancel }) {
  const options = [
    { key: "story", title: "Story-based course", body: "Short, swipeable reading screens with quick checks, flip cards and quizzes. Best for step-by-step knowledge." },
    { key: "video", title: "Video-based course", body: "Lessons built around a video: paste a YouTube or direct link, or upload a short clip." },
    { key: "import", title: "Import a course", body: "Bring in a .json or Markdown file built elsewhere. It is restyled into story screens." },
  ];
  return (
    <div className="admin-modal-backdrop" onMouseDown={onCancel}>
      <div className="admin-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="admin-modal-header"><h2>Create a course</h2><button type="button" className="admin-modal-close" onClick={onCancel}>×</button></div>
        <div className="admin-modal-body cs-pick">
          {options.map((o) => (
            <button key={o.key} type="button" className="cs-pick-card" onClick={() => onPick(o.key)}>
              <b>{o.title}</b>
              <span>{o.body}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CoursesHome() {
  const [view, setView] = useState("courses"); // courses | bundles
  const [courses, setCourses] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null); // { course, tab }
  const [picking, setPicking] = useState(false);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [c, b] = await Promise.all([fetchCourses(), fetchBundles()]);
      setCourses(c);
      setBundles(b);
    } catch (err) {
      setError(explain(err, "Couldn't load courses."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const open = () => setPicking(true);
    window.addEventListener("admin:add-course", open);
    return () => window.removeEventListener("admin:add-course", open);
  }, []);

  function pick(kind) {
    setPicking(false);
    setEditor({ course: newCourse(kind === "video" ? "video" : "story"), tab: kind === "import" ? "import" : "details" });
  }

  async function edit(id) {
    setOpening(true);
    try {
      setEditor({ course: await fetchCourseFull(id), tab: "details" });
    } catch (err) {
      setError(explain(err, "Couldn't open that course."));
    } finally {
      setOpening(false);
    }
  }

  if (editor) {
    return (
      <CourseEditor
        key={editor.course.id}
        initial={editor.course}
        startTab={editor.tab}
        existingSlugs={courses.filter((c) => c.id !== editor.course.id).map((c) => c.slug)}
        onBack={() => { setEditor(null); load(); }}
        onSaved={() => load()}
      />
    );
  }

  return (
    <div>
      <div className="cs-home-bar">
        <div className="cs-seg" role="tablist" aria-label="Academy catalog">
          <button type="button" className={view === "courses" ? "on" : ""} onClick={() => setView("courses")}>Courses ({courses.length})</button>
          <button type="button" className={view === "bundles" ? "on" : ""} onClick={() => setView("bundles")}>Bundles ({bundles.length})</button>
        </div>
      </div>

      {error && <Notice kind="error" onClose={() => setError("")}>{error}</Notice>}
      {opening && <p className="form-hint">Opening course…</p>}

      {loading ? (
        <p className="form-hint">Loading…</p>
      ) : view === "courses" ? (
        <CourseList courses={courses} bundles={bundles} onEdit={edit} onReload={load} onCreate={() => setPicking(true)} />
      ) : (
        <Bundles bundles={bundles} courses={courses} onReload={load} />
      )}

      {picking && <NewCourseModal onPick={pick} onCancel={() => setPicking(false)} />}
    </div>
  );
}

export default function Courses() {
  return <CoursesHome />;
}
