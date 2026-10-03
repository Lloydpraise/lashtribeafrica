import { useState } from "react";
import {
  parseVideoLink, videoLink, fmtDuration, parseDuration, parseTimedLines, timedLinesToText,
} from "./courseModel.js";
import { uploadMedia, readVideoDuration, explain, MAX_VIDEO_BYTES } from "./courses.api.js";
import { Field } from "./fields.jsx";
import ImageField from "./ImageField.jsx";

/**
 * Picks where a video lesson's video comes from: a pasted link (YouTube, direct .mp4/.m3u8) or a short
 * file uploaded to Supabase storage. Produces the `video` object the student player reads.
 */
export default function VideoSourceEditor({ video, onChange, courseId }) {
  const [mode, setMode] = useState(video?.path ? "upload" : "link");
  const [link, setLink] = useState(video && !video.path ? videoLink(video) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [durText, setDurText] = useState(video?.duration ? fmtDuration(video.duration) : "");
  const [chapters, setChapters] = useState(timedLinesToText(video?.chapters, "title"));
  const [transcript, setTranscript] = useState(timedLinesToText(video?.transcript, "text"));

  const set = (patch) => onChange({ ...(video || {}), ...patch });

  function useLink() {
    setError("");
    if (!link.trim()) { onChange(null); return; }
    const r = parseVideoLink(link, video);
    if (r.error) { setError(r.error); return; }
    const next = { ...r.video };
    delete next.path; // a pasted link replaces any uploaded file reference
    onChange(next);
    if (next.duration) setDurText(fmtDuration(next.duration));
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (file.size > MAX_VIDEO_BYTES) {
      setError(`That file is ${(file.size / 1048576).toFixed(0)} MB. Uploads are limited to ${MAX_VIDEO_BYTES / 1048576} MB. Paste a YouTube or direct link for longer videos.`);
      return;
    }
    setBusy(true);
    try {
      const seconds = await readVideoDuration(file);
      const up = await uploadMedia(file, `courses/${courseId}/videos`);
      onChange({ ...(video || {}), provider: "file", src: up.url, path: up.path, id: undefined, duration: seconds || video?.duration || 0 });
      setDurText(seconds ? fmtDuration(seconds) : "");
    } catch (err) {
      setError(explain(err, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  function commitDuration() {
    const s = parseDuration(durText);
    if (s == null) { setError("Duration should look like 12:30."); return; }
    setError("");
    set({ duration: s });
  }

  const hasVideo = !!(video && (video.id || video.src));
  const isYT = video?.provider === "youtube";

  return (
    <div className="cs-stack">
      <div className="cs-seg" role="group" aria-label="Video source">
        <button type="button" className={mode === "link" ? "on" : ""} onClick={() => setMode("link")}>Paste a link</button>
        <button type="button" className={mode === "upload" ? "on" : ""} onClick={() => setMode("upload")}>Upload a video</button>
      </div>

      {mode === "link" ? (
        <div className="cs-stack">
          <div className="inline-add-row">
            <input type="text" placeholder="https://youtu.be/… or https://…/video.mp4 or …/stream.m3u8" value={link}
              onChange={(e) => setLink(e.target.value)} onBlur={useLink} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), useLink())} />
            <button type="button" className="admin-btn" onClick={useLink}>Use link</button>
          </div>
          <p className="form-hint">YouTube links, direct MP4/WebM files and HLS (.m3u8) streams work. Vimeo and Google Drive links can't be played inside the course.</p>
        </div>
      ) : (
        <div className="cs-stack">
          <label className={`admin-btn secondary cs-upload${busy ? " disabled" : ""}`}>
            {busy ? "Uploading… keep this tab open" : hasVideo && video.path ? "Replace video file" : "Choose a video file"}
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={onFile} disabled={busy} hidden />
          </label>
          <p className="form-hint">MP4, WebM or MOV up to {MAX_VIDEO_BYTES / 1048576} MB, stored in Supabase. Best for short clips; use a link for long lessons.</p>
        </div>
      )}

      {error && <p className="admin-gate-error">{error}</p>}

      {hasVideo && (
        <div className="cs-video-preview">
          {isYT ? (
            <a href={`https://youtu.be/${video.id}`} target="_blank" rel="noreferrer" className="cs-yt">
              <img src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} alt="" />
              <span>YouTube video · {video.id}</span>
            </a>
          ) : (
            <video src={video.src} controls preload="metadata" poster={video.poster || undefined} />
          )}
          <div className="cs-video-meta">
            <span className="admin-badge">{isYT ? "YouTube" : video.provider === "hls" ? "HLS stream" : video.path ? "Uploaded file" : "Video file"}</span>
            <Field label="Length (mm:ss)" hint="Shown in the course outline. Uploads fill this in for you.">
              <input type="text" value={durText} placeholder="12:30" onChange={(e) => setDurText(e.target.value)} onBlur={commitDuration} />
            </Field>
          </div>
        </div>
      )}

      {hasVideo && (
        <details className="cs-details">
          <summary>Poster, chapters and transcript (optional)</summary>
          <div className="cs-stack">
            {!isYT && (
              <Field label="Poster image shown before playing">
                <ImageField url={video.poster} folder={`courses/${courseId}/figures`} maxWidth={1280} compact label="poster" onChange={({ url }) => set({ poster: url || undefined })} />
              </Field>
            )}
            <Field label="Chapters" hint='One per line: "0:00 Welcome". Students can jump between them.'>
              <textarea rows={4} value={chapters} placeholder={"0:00 Welcome\n1:30 Your workspace"}
                onChange={(e) => setChapters(e.target.value)} onBlur={() => set({ chapters: parseTimedLines(chapters, "title") })} />
            </Field>
            <Field label="Transcript" hint='One per line: "0:24 A great set starts long before the first lash."'>
              <textarea rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} onBlur={() => set({ transcript: parseTimedLines(transcript, "text") })} />
            </Field>
          </div>
        </details>
      )}
    </div>
  );
}
