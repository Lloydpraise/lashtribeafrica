#!/usr/bin/env node
// Sanity tests for the admin course import/export code (no test framework needed):
//   node scripts/test-course-import.mjs
// Uses the real "Classic Set Essentials" course as the fixture, so it also proves that an existing
// story course survives  data file -> JSON -> import  and  blocks -> Markdown -> blocks  unchanged.

import assert from "node:assert/strict";
import { CLASSIC_SET_ESSENTIALS as C } from "../src/data/courses/classic-set-essentials.js";
import { blocksToMarkdown, parseBody, courseToMarkdown } from "../src/admin/sections/courses/courseMarkdown.js";
import { parseImport } from "../src/admin/sections/courses/importCourse.js";
import { parseVideoLink, parseDuration, fmtDuration, toSavePayload, toExport, validateCourse, normalizeImported } from "../src/admin/sections/courses/courseModel.js";
import { restyleBlocks, splitStatement } from "../src/admin/sections/courses/restyle.js";
import { TEMPLATE_MD, TEMPLATE_STORY_MD, TEMPLATE_VIDEO_MD, buildAiPrompt } from "../src/admin/sections/courses/courseTemplate.js";
import { collectImageSlots, applyImageUrls, matchFiles } from "../src/admin/sections/courses/courseImages.js";

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; console.log("  ok  " + name); }
  catch (e) { console.error("FAIL  " + name + "\n" + (e.stack || e)); process.exitCode = 1; }
};

// The player falls back to these defaults, so explicit-vs-missing is the same behaviour; normalise
// so equality is about what the student sees.
const norm = (blocks) => JSON.parse(JSON.stringify(blocks)).map((b) => {
  if (b.type === "flip" && !b.prompt) b.prompt = "Tap the card";
  if (b.type === "steps") b.items = b.items.map((it) => ({ title: it.title, text: it.text ?? "" }));
  if (b.type === "compare") {
    if (b.doLabel === "Do") delete b.doLabel;
    if (b.dontLabel === "Don't") delete b.dontLabel;
  }
  return b;
});

const lessons = C.modules.flatMap((m) => m.lessons);

test("fixture has the expected shape", () => {
  assert.equal(C.modules.length, 4);
  assert.equal(lessons.length, 13);
});

test("every reading lesson survives blocks -> Markdown -> blocks", () => {
  lessons.filter((l) => l.kind === "reading").forEach((l) => {
    const md = blocksToMarkdown(l.blocks);
    const { blocks, warnings } = parseBody(md);
    assert.deepEqual(warnings, [], `${l.title}: ${warnings}`);
    assert.deepEqual(norm(blocks), norm(l.blocks), l.title);
  });
});

test("the quiz lesson survives blocks -> Markdown -> quiz block", () => {
  const q = lessons.find((l) => l.kind === "assessment");
  const { blocks, warnings } = parseBody(blocksToMarkdown(q.blocks), { quiz: true });
  assert.deepEqual(warnings, []);
  assert.deepEqual(blocks, q.blocks);
});

test("the whole course survives export -> Markdown file -> import", () => {
  const portable = JSON.parse(JSON.stringify({ ...C, hero_url: "" }));
  const md = courseToMarkdown(portable);
  const { course, warnings } = parseImport(md, { restyle: false });
  assert.deepEqual(warnings, []);
  assert.equal(course.title, C.title);
  assert.equal(course.modules.length, 4);
  assert.equal(course.modules.flatMap((m) => m.lessons).length, 13);
  course.modules.flatMap((m) => m.lessons).forEach((l, i) => {
    assert.equal(l.title, lessons[i].title);
    assert.equal(l.kind, lessons[i].kind);
    assert.deepEqual(norm(l.blocks), norm(lessons[i].blocks), l.title);
  });
});

test("the whole course survives the portable JSON file", () => {
  const { course, warnings, stats } = parseImport(JSON.stringify(C), { restyle: false });
  assert.deepEqual(warnings, []);
  assert.equal(stats.lessons, 13);
  assert.equal(stats.questions, lessons.flatMap((l) => l.blocks).filter((b) => b.type === "quiz").reduce((n, b) => n + b.questions.length, 0) + lessons.flatMap((l) => l.blocks).filter((b) => b.type === "checkpoint").length);
  assert.deepEqual(norm(course.modules[0].lessons[0].blocks), norm(lessons[0].blocks));
});

test("restyle keeps already-short story content unchanged", () => {
  lessons.filter((l) => l.kind === "reading").forEach((l) => {
    const { blocks } = restyleBlocks(l.blocks);
    assert.deepEqual(blocks, l.blocks, l.title);
  });
});

test("restyle splits long text, promotes Tip: lines, and never leaves unbalanced bold", () => {
  const long = "First sentence is here and it keeps going for a while so that the paragraph gets long. " +
    "Second sentence is also fairly long and adds more detail about the topic at hand to pad it out. " +
    "Third sentence wraps things up with a final thought that readers should remember for later.";
  const parts = splitStatement(long);
  assert.ok(parts.length >= 2);
  assert.equal(parts.join(" ").replace(/\s+/g, " "), long);

  const withBold = "This opens **a bold phrase that runs across what would be a split point. " + "Filler sentence number two is quite long indeed and goes on and on for some time now. ".repeat(2) + "It closes here** and ends.";
  splitStatement(withBold).forEach((p) => assert.equal((p.match(/\*\*/g) || []).length % 2, 0));

  const { blocks, stats } = restyleBlocks([
    { type: "text", text: "Tip: Keep the adhesive sealed." },
    { type: "text", text: "<p>Plain&nbsp;text</p>" },
    { type: "text", text: "   " },
  ]);
  assert.equal(blocks[0].type, "callout");
  assert.equal(blocks[0].tone, "tip");
  assert.equal(blocks[1].text, "Plain text");
  assert.equal(blocks.length, 2);
  assert.equal(stats.removed, 1);
});

test("a hand-written Markdown course imports as expected", () => {
  const md = `# Brow Basics
subtitle: Shape, map, tint
type: video
price: 3,500
hero: https://example.com/hero.jpg

## Getting started

### Welcome
kind: video
video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
duration: 4:30
summary: A quick hello.

#### Notes
Bring your tools. Tip: not really a callout here.

> Tip [Setup]: Lay everything out first.

### Mapping
Short intro line.

steps:
1. Measure :: Use a mapping string
2. Mark :: Dot the three points

?? Where does the brow start?
- At the tear duct
- *In line with the nostril
= The inner edge lines up with the nostril.
`;
  const { course, warnings, stats } = parseImport(md);
  assert.deepEqual(warnings, []);
  assert.equal(course.course_type, "video");
  assert.equal(course.price, 3500);
  assert.equal(course.is_free, false);
  assert.equal(course.hero_url, "https://example.com/hero.jpg");
  const [welcome, mapping] = course.modules[0].lessons;
  assert.equal(welcome.kind, "video");
  assert.deepEqual([welcome.video.provider, welcome.video.id, welcome.video.duration], ["youtube", "dQw4w9WgXcQ", 270]);
  assert.equal(welcome.duration_seconds, 270);
  assert.equal(mapping.kind, "reading");
  assert.equal(mapping.blocks.find((b) => b.type === "steps").items.length, 2);
  const cp = mapping.blocks.find((b) => b.type === "checkpoint");
  assert.equal(cp.answer, 1);
  assert.equal(stats.lessons, 2);
});

test("the shipped Markdown template parses cleanly into what it describes", () => {
  const { course, warnings, stats } = parseImport(TEMPLATE_MD);
  assert.deepEqual(warnings, []);
  assert.equal(course.title, "My new course");
  assert.equal(course.modules.length, 1);
  assert.deepEqual(course.modules[0].lessons.map((l) => l.kind), ["reading", "video", "assessment"]);
  const types = course.modules[0].lessons[0].blocks.map((b) => b.type);
  ["heading", "text", "list", "callout", "steps", "flip", "checkpoint"].forEach((t) => assert.ok(types.includes(t), t));
  assert.equal(course.modules[0].lessons[0].blocks.filter((b) => b.type === "callout").length, 3);
  assert.equal(course.modules[0].lessons[1].video.id, "dQw4w9WgXcQ");
  assert.equal(course.modules[0].lessons[2].blocks[0].questions.length, 1);
  assert.equal(stats.lessons, 3);
});

test("a quiz lesson in Markdown becomes a quiz block", () => {
  const md = `# T\n\n## M\n\n### Final\nkind: quiz\n\npass: 80\n\n?? One?\n- *a\n- b\n= because\n\n?? Two?\n- a\n- *b\n`;
  const { course } = parseImport(md);
  const l = course.modules[0].lessons[0];
  assert.equal(l.kind, "assessment");
  assert.equal(l.blocks[0].type, "quiz");
  assert.equal(l.blocks[0].passScore, 80);
  assert.deepEqual(l.blocks[0].questions.map((q) => q.answer), [0, 1]);
});

test("video links", () => {
  const yt = (u) => parseVideoLink(u).video;
  assert.deepEqual([yt("https://youtu.be/dQw4w9WgXcQ?t=5").provider, yt("https://youtu.be/dQw4w9WgXcQ?t=5").id], ["youtube", "dQw4w9WgXcQ"]);
  assert.equal(yt("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x").id, "dQw4w9WgXcQ");
  assert.equal(yt("https://m.youtube.com/shorts/dQw4w9WgXcQ").id, "dQw4w9WgXcQ");
  assert.equal(yt("https://cdn.example.com/a/b.mp4?x=1").provider, "file");
  assert.equal(yt("https://cdn.example.com/stream/index.m3u8").provider, "hls");
  assert.equal(yt("https://abc.supabase.co/storage/v1/object/public/course-media/c/v.mp4").provider, "file");
  assert.ok(parseVideoLink("https://vimeo.com/123").error);
  assert.ok(parseVideoLink("not a url").error);
  assert.ok(parseVideoLink("https://example.com/page").error);
  assert.equal(parseVideoLink("").video, null);
});

test("durations", () => {
  assert.equal(parseDuration("12:30"), 750);
  assert.equal(parseDuration("1:02:03"), 3723);
  assert.equal(parseDuration("90"), 90);
  assert.equal(parseDuration("abc"), null);
  assert.equal(fmtDuration(750), "12:30");
  assert.equal(fmtDuration(3723), "1:02:03");
});

test("save payload / export / validation", () => {
  const { course } = parseImport(JSON.stringify({ ...C, slug: "classic-set-essentials", price: 4500, is_free: false }), { restyle: false });
  const editor = { ...course, id: "00000000-0000-4000-8000-000000000001", cover_url: "", hero_path: "", status: "draft", sort_order: 0 };
  const p = toSavePayload(editor);
  assert.equal(p.course.price, 4500);
  assert.equal(p.modules.length, 4);
  assert.equal(p.modules.flatMap((m) => m.lessons).length, 13);
  assert.ok(p.modules.flatMap((m) => m.lessons).every((l) => /^[0-9a-f-]{36}$/.test(l.id)));
  const ex = toExport(editor);
  assert.equal(ex.format, "lashtribe-course@1");
  assert.equal(ex.modules[0].lessons[0].title, lessons[0].title);
  const free = toSavePayload({ ...editor, is_free: true, price: 999, compare_price: 1200 });
  assert.equal(free.course.price, 0);
  assert.equal(free.course.compare_price, null);
  assert.deepEqual(validateCourse(editor).errors, []);
  assert.ok(validateCourse({ ...editor, title: "" }).errors.length);
  assert.ok(validateCourse({ ...editor, is_free: false, price: 0 }).errors.length);
  assert.ok(validateCourse({ ...editor, slug: "Bad Slug" }).errors.length);
});

test("other JSON shapes normalise", () => {
  assert.equal(normalizeImported([{ title: "M", lessons: [{ title: "L", blocks: [{ type: "text", text: "x" }] }] }]).modules.length, 1);
  assert.equal(normalizeImported({ title: "One lesson", blocks: [{ type: "text", text: "x" }] }).modules[0].lessons.length, 1);
  assert.throws(() => normalizeImported({ nothing: true }));
  assert.throws(() => parseImport("export const x = {}"), /JavaScript data file/);
  assert.throws(() => parseImport("{ nope"), /valid JSON/);
});

test("story template parses, with image slots and no other warnings", () => {
  const { course, warnings, slots, stats } = parseImport(TEMPLATE_STORY_MD);
  assert.equal(course.course_type, "story");
  assert.deepEqual(slots.map((x) => x.key).sort(), ["course-hero", "first-picture"]);
  assert.deepEqual(warnings.filter((w) => !/need a file|needs a file/.test(w)), []);
  assert.ok(stats.questions >= 2 && stats.lessons === 3);
  const types = course.modules[0].lessons[0].blocks.map((b) => b.type);
  ["figure", "compare", "flip", "steps", "checkpoint"].forEach((t) => assert.ok(types.includes(t), t));
});

test("video template: placeholder links become a friendly warning, not an error", () => {
  const { course, warnings } = parseImport(TEMPLATE_VIDEO_MD);
  assert.equal(course.course_type, "video");
  const vids = course.modules[0].lessons.filter((l) => l.kind === "video");
  assert.equal(vids.length, 2);
  assert.ok(vids.every((l) => l.video === null && l.duration_seconds > 0));
  assert.equal(warnings.filter((w) => /add the video link/.test(w)).length, 2);
  // a real link in the same slot still works
  const ok = parseImport(TEMPLATE_VIDEO_MD.replace("PASTE_VIDEO_LINK_HERE", "https://youtu.be/dQw4w9WgXcQ"));
  assert.equal(ok.course.modules[0].lessons[0].video.id, "dQw4w9WgXcQ");
});

test("image slots: collect, match by file name, apply, leave missing ones out", () => {
  const md = `# T\nhero: image:course-hero\n\n## M\n\n### L\nkind: reading\n\n![Parts of the eye](image:Eye-Anatomy)\n\n![Cat eye](images/cat-eye.webp)\n\n![Real](https://x.test/a.jpg)\n\n![Blank]()\n`;
  const { course, slots } = parseImport(md, { restyle: false });
  assert.deepEqual(slots.map((x) => x.key), ["course-hero", "eye-anatomy", "cat-eye", "unnamed-4"]);
  const { matched, extra } = matchFiles(slots, [{ name: "Eye anatomy.JPG" }, { name: "cat-eye.png" }, { name: "other.png" }]);
  assert.deepEqual(Object.keys(matched).sort(), ["cat-eye", "eye-anatomy"]);
  assert.equal(extra.length, 1);
  const done = applyImageUrls(course, { "eye-anatomy": "https://cdn/eye.webp", "course-hero": "https://cdn/hero.webp" });
  const figs = done.modules[0].lessons[0].blocks.filter((b) => b.type === "figure");
  assert.deepEqual(figs.map((f) => f.url), ["https://cdn/eye.webp", "", "https://x.test/a.jpg", ""]);
  assert.equal(done.hero_url, "https://cdn/hero.webp");
  assert.equal(collectImageSlots(done).length, 2); // the two left unattached stay empty slots
  // the export of a course with an unattached picture still round-trips
  assert.equal(parseImport(courseToMarkdown(toExport({ ...done, id: "x", slug: "t", cover_url: "", is_free: true, price: 0 })), { restyle: false }).stats.figures, 4);
});

test("restyle keeps figure slots", () => {
  const { course } = parseImport(`# T\n\n## M\n\n### L\nkind: reading\n\nShort text.\n\n![Pic](image:pic)\n`);
  assert.equal(course.modules[0].lessons[0].blocks.filter((b) => b.type === "figure").length, 1);
});

test("AI prompt covers type, scope and the format", () => {
  const full = buildAiPrompt({ type: "story", scope: "full" });
  const sum = buildAiPrompt({ type: "video", scope: "summary", audience: "beginners" });
  assert.match(full, /STORY course/); assert.match(full, /KEEP EVERYTHING/); assert.match(full, /image:/);
  assert.match(sum, /VIDEO course/); assert.match(sum, /PASTE_VIDEO_LINK_HERE/); assert.match(sum, /BREAK IT DOWN/); assert.match(sum, /AUDIENCE: beginners/);
  // the example inside the prompt is the real template
  assert.ok(sum.includes(TEMPLATE_VIDEO_MD.trim()) && full.includes(TEMPLATE_STORY_MD.trim()));
});

console.log(`\n${passed} passed${process.exitCode ? ", with failures" : ""}`);
