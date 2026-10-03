import { LESSON_KINDS, estimateReadMinutes, newBlock } from "./courseModel.js";
import { Field, Toggle } from "./fields.jsx";
import BlockEditor from "./BlockEditor.jsx";
import VideoSourceEditor from "./VideoSourceEditor.jsx";

export default function LessonEditor({ lesson, onChange, courseId, onPreview }) {
  const set = (patch) => onChange({ ...lesson, ...patch });

  function changeKind(kind) {
    if (kind === lesson.kind) return;
    let blocks = lesson.blocks;
    if (kind === "assessment") {
      blocks = blocks.some((b) => b.type === "quiz") ? blocks : [newBlock("quiz")];
    } else if (lesson.kind === "assessment") {
      blocks = blocks.filter((b) => b.type !== "quiz"); // quiz blocks only make sense in a quiz lesson
    }
    set({ kind, blocks, read_minutes: kind === "reading" ? lesson.read_minutes || estimateReadMinutes(blocks) : lesson.read_minutes });
  }

  return (
    <div className="cs-lesson">
      <div className="cs-lesson-head">
        <div className="form-grid">
          <Field label="Lesson title" span>
            <input type="text" value={lesson.title} placeholder="e.g. Welcome and lash history" onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Short summary" span hint="Shown under the title and in the course outline.">
            <input type="text" value={lesson.summary || ""} onChange={(e) => set({ summary: e.target.value })} />
          </Field>
          <Field label="Lesson type">
            <select value={lesson.kind} onChange={(e) => changeKind(e.target.value)}>
              {LESSON_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>
          {lesson.kind === "reading" ? (
            <Field label="Reading time (minutes)" hint={`Suggested: ${estimateReadMinutes(lesson.blocks)}`}>
              <input type="number" min={1} value={lesson.read_minutes || ""} onChange={(e) => set({ read_minutes: Number(e.target.value) || 0 })} />
            </Field>
          ) : <div className="form-field" />}
        </div>
        <div className="cs-toggles">
          <Toggle checked={lesson.is_preview} onChange={(v) => set({ is_preview: v })} label="Free preview" hint="Anyone can open this lesson without buying the course." />
          <Toggle checked={lesson.status === "draft"} onChange={(v) => set({ status: v ? "draft" : "published" })} label="Hide from students" hint="Keeps the lesson in the editor but out of the course." />
        </div>
        <div className="cs-row">
          <button type="button" className="admin-btn secondary" onClick={onPreview}>Preview this lesson</button>
        </div>
      </div>

      {lesson.kind === "video" && (
        <section className="cs-section">
          <h4>Video</h4>
          <VideoSourceEditor key={lesson.id} video={lesson.video} courseId={courseId} onChange={(video) => set({ video, duration_seconds: video?.duration || 0 })} />
          <h4>Lesson notes <small>(optional, shown under the video)</small></h4>
          <BlockEditor key={lesson.id + "-notes"} mode="notes" blocks={lesson.blocks} courseId={courseId} onChange={(blocks) => set({ blocks })} />
        </section>
      )}

      {lesson.kind === "reading" && (
        <section className="cs-section">
          <h4>Story content</h4>
          <BlockEditor key={lesson.id} mode="story" blocks={lesson.blocks} courseId={courseId} onChange={(blocks) => set({ blocks })} />
        </section>
      )}

      {lesson.kind === "assessment" && (
        <section className="cs-section">
          <h4>Quiz</h4>
          <BlockEditor key={lesson.id} mode="quiz" blocks={lesson.blocks} courseId={courseId} onChange={(blocks) => set({ blocks })} />
        </section>
      )}
    </div>
  );
}
