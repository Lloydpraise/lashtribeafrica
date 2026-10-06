import { useMemo, useState } from "react";
import { TEMPLATES, buildAiPrompt } from "./courseTemplate.js";
import { Segmented } from "./fields.jsx";

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copy-ready prompt for Claude / ChatGPT, plus the starter template for each course type. */
export default function AiPromptCard({ defaultType = "story" }) {
  const [type, setType] = useState(defaultType === "video" ? "video" : "story");
  const [scope, setScope] = useState("full");
  const [audience, setAudience] = useState("");
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => buildAiPrompt({ type, scope, audience: audience.trim() }), [type, scope, audience]);

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); }
    catch {
      const t = document.createElement("textarea");
      t.value = prompt; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="admin-card cs-card">
      <h3>Turn a PDF into a course with AI</h3>
      <ol className="form-hint" style={{ paddingLeft: 18, margin: "0 0 12px" }}>
        <li>Pick the course type and how much to keep, then press <b>Copy prompt</b>.</li>
        <li>Open Claude or ChatGPT, attach your PDF and paste the prompt.</li>
        <li>Copy the Markdown it returns and paste it into the box above, then press <b>Read the file</b>.</li>
        <li>Attach the pictures, preview it, and import.</li>
      </ol>
      <div className="cs-row" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <span className="form-hint" style={{ display: "block", margin: "0 0 4px" }}>Course type</span>
          <Segmented value={type} onChange={setType} options={[{ value: "story", label: "Story (reading)" }, { value: "video", label: "Video" }]} />
        </div>
        <div>
          <span className="form-hint" style={{ display: "block", margin: "0 0 4px" }}>How much to keep</span>
          <Segmented value={scope} onChange={setScope} options={[{ value: "full", label: "Whole PDF" }, { value: "summary", label: "Broken down" }]} />
        </div>
      </div>
      <div className="form-field" style={{ marginTop: 12 }}>
        <span>Who is it for? (optional)</span>
        <input type="text" value={audience} placeholder="e.g. complete beginners who want to start working with clients" onChange={(e) => setAudience(e.target.value)} />
      </div>
      <div className="cs-row">
        <button type="button" className="admin-btn" onClick={copy}>{copied ? "Copied ✓" : "Copy prompt"}</button>
        <button type="button" className="admin-btn secondary" onClick={() => download(TEMPLATES[type].file, TEMPLATES[type].text)}>Download {type} template</button>
      </div>
      <details className="cs-details">
        <summary>See the prompt</summary>
        <pre className="cs-code">{prompt}</pre>
      </details>
    </section>
  );
}
