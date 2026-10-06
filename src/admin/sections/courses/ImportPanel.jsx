import { useState } from "react";
import { parseImport } from "./importCourse.js";
import { toExport } from "./courseModel.js";
import { courseToMarkdown } from "./courseMarkdown.js";
import { Notice, Toggle } from "./fields.jsx";
import { TEMPLATE_MD } from "./courseTemplate.js";
import { applyImageUrls } from "./courseImages.js";
import ImageSlots from "./ImageSlots.jsx";
import AiPromptCard from "./AiPromptCard.jsx";
import PreviewModal from "./PreviewModal.jsx";

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ImportPanel({ course, onApply }) {
  const blank = !course.title.trim() && course.modules.every((m) => m.lessons.every((l) => !l.title && !l.blocks.length && !l.video));
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [restyle, setRestyle] = useState(true);
  const [details, setDetails] = useState(blank);
  const [mode, setMode] = useState(blank ? "replace" : "append");
  const [urls, setUrls] = useState({});
  const [preview, setPreview] = useState(false);

  function read(src, opts = {}) {
    setError("");
    setResult(null);
    setUrls({});
    if (!src.trim()) return;
    try {
      setResult(parseImport(src, { restyle: opts.restyle ?? restyle }));
    } catch (err) {
      setError(err.message || "Couldn't read that file.");
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("That file is over 5 MB. Course files are plain text, so something is wrong with it."); return; }
    if (/\.(docx?|pdf|pptx?)$/i.test(file.name)) {
      setError("Word, PDF and PowerPoint files can't be read directly. Save it as Markdown/text (or ask Claude to convert it to the course JSON), then import that.");
      return;
    }
    const src = await file.text();
    setFileName(file.name);
    setText(src);
    read(src);
  }

  // the imported course with every picture the admin has attached so far (unattached ones are left out)
  const finished = result ? applyImageUrls(result.course, urls, { clearMissing: true }) : null;
  const previewCourse = finished ? {
    ...course,
    title: details && finished.title ? finished.title : course.title,
    cover_url: finished.hero_url || course.cover_url,
    course_type: details && finished.course_type ? finished.course_type : course.course_type,
    modules: finished.modules,
  } : null;

  const slug = course.slug || "course";
  const exported = () => toExport(course);

  return (
    <div className="cs-stack">
      <section className="admin-card cs-card">
        <h3>Import a course</h3>
        <p className="form-hint">
          Bring in a course built elsewhere: a <b>.json</b> course file (what Export produces, or what Claude can generate for you) or a
          <b> Markdown/text</b> file. Story courses are restyled into short screens as they come in.
        </p>
        <div className="cs-row">
          <label className="admin-btn">
            Choose a file
            <input type="file" accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain" onChange={onFile} hidden />
          </label>
          {fileName && <span className="form-hint">Loaded {fileName}</span>}
        </div>
        <div className="form-field" style={{ marginTop: 12 }}>
          <span>…or paste what the AI gave you</span>
          <textarea className="cs-quick" rows={8} value={text} placeholder="Paste Markdown or course JSON" onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="cs-toggles">
          <Toggle checked={restyle} onChange={(v) => { setRestyle(v); if (text.trim()) read(text, { restyle: v }); }} label="Restyle for story mode" hint="Tidies text, splits long paragraphs, turns “Tip:” lines into callouts." />
          <Toggle checked={details} onChange={setDetails} label="Use the file's course details" hint="Title, price, level, description and hero image." />
        </div>
        <div className="cs-row">
          <button type="button" className="admin-btn" onClick={() => read(text)} disabled={!text.trim()}>Read the file</button>
        </div>
        {error && <Notice kind="error">{error}</Notice>}

        {result && (
          <div className="cs-result">
            <h4>Found in this file</h4>
            <ul className="cs-stats">
              <li><b>{result.stats.modules}</b> modules</li>
              <li><b>{result.stats.lessons}</b> lessons</li>
              <li><b>{result.stats.blocks}</b> story blocks</li>
              <li><b>{result.stats.videos}</b> videos</li>
              <li><b>{result.stats.questions}</b> questions</li>
              <li><b>{result.stats.figures}</b> images</li>
            </ul>
            {result.course.title && <p className="form-hint">Course: <b>{result.course.title}</b>{result.course.is_free ? " · free" : result.course.price ? ` · Ksh ${Number(result.course.price).toLocaleString()}` : ""}</p>}
            {result.restyle && (result.restyle.split || result.restyle.callouts || result.restyle.removed || result.restyle.cleaned) > 0 && (
              <p className="form-hint">Restyled: {result.restyle.split} long paragraph splits, {result.restyle.callouts} callouts created, {result.restyle.cleaned} cleaned, {result.restyle.removed} empty removed.</p>
            )}
            {result.warnings.length > 0 && (
              <Notice kind="warn">
                <b>Check these:</b>
                <ul>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
              </Notice>
            )}
            {result.slots?.length > 0 && <ImageSlots courseId={course.id} slots={result.slots} urls={urls} onUrls={setUrls} />}
            <div className="cs-radio-row" role="radiogroup" aria-label="How to import">
              <label><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace the current curriculum</label>
              <label><input type="radio" checked={mode === "append"} onChange={() => setMode("append")} /> Add after the current modules</label>
            </div>
            <div className="cs-row">
              <button type="button" className="admin-btn secondary" disabled={!result.stats.lessons} onClick={() => setPreview(true)}>
                Preview first
              </button>
              <button
                type="button"
                className="admin-btn"
                disabled={!result.stats.lessons}
                onClick={() => { onApply({ imported: finished, mode, details }); setResult(null); setUrls({}); setText(""); setFileName(""); }}
              >
                Import into this course
              </button>
              <span className="form-hint">Nothing is saved until you press Save.</span>
            </div>
          </div>
        )}
      </section>

      <AiPromptCard defaultType={course.course_type} />

      <section className="admin-card cs-card">
        <h3>Export</h3>
        <p className="form-hint">
          Download the course to back it up, edit it elsewhere, or rebuild it. The JSON file imports straight back in and also works with
          <code> scripts/course-to-sql.mjs</code>. Pictures are exported as links to where they are stored, not as files, so a re-import
          shows them straight away as long as the originals still exist.
        </p>
        <div className="cs-row">
          <button type="button" className="admin-btn secondary" onClick={() => download(`${slug}.json`, JSON.stringify(exported(), null, 2), "application/json")}>Download .json</button>
          <button type="button" className="admin-btn secondary" onClick={() => download(`${slug}.md`, courseToMarkdown(exported()), "text/markdown")}>Download .md</button>
        </div>
        <p className="form-hint">Markdown leaves out video chapters and transcripts; JSON keeps everything.</p>
      </section>

      <section className="admin-card cs-card">
        <details className="cs-details" open={false}>
          <summary>Markdown format cheat-sheet</summary>
          <pre className="cs-code">{TEMPLATE_MD}</pre>
        </details>
      </section>
      {preview && previewCourse && <PreviewModal course={previewCourse} onClose={() => setPreview(false)} />}
    </div>
  );
}
