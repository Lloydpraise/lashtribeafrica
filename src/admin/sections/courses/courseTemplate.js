// The sample file offered by "Download a Markdown template" and shown in the cheat-sheet.
// scripts/test-course-import.mjs imports this and checks it parses without warnings.

export const TEMPLATE_MD = `# My new course
subtitle: One line that sells it
type: story
level: beginner
price: 4500
hero: https://example.com/hero.jpg

## Module one

### Welcome
kind: reading
summary: What you will learn.

#### Chapter one

Each paragraph becomes one screen in story mode.

Keep each one short and focused on a single idea. **Bold** and *italic* work.

- A bullet list is revealed all at once
- Use "- [ ] item" for a tick-every-box checklist

> Tip: A callout gets its own screen.

> Mistake: Mistakes are highlighted in red.

> Remember: Key points stand out in gold.

steps:
1. First step :: What to do first
2. Second step :: What to do next

flip[Myth or fact?]: Lashes grow back overnight. || They take **4 to 8 weeks** to regrow.

?? What did we just learn?
- A wrong answer
- *The right answer
- Another wrong answer
= Shown after the student answers correctly.

### A video lesson
kind: video
video: https://youtu.be/dQw4w9WgXcQ
duration: 8:30
summary: Watch and follow along.

#### Notes under the video

Anything written here shows beneath the player.

### Final quiz
kind: quiz

pass: 70

?? Question one?
- *Right
- Wrong
= Why it is right.
`;

// ---------------------------------------------------------------------
// Templates per course type + the prompt that makes an AI produce them
// ---------------------------------------------------------------------

export const TEMPLATE_STORY_MD = `# Course title
subtitle: One line that sells the course
type: story
level: beginner
free: true
hero: image:course-hero

## Module 1 name

### Lesson 1 title
kind: reading
summary: One sentence on what the student will learn.

#### First chapter

One idea per paragraph. Each paragraph becomes one screen.

Keep it short, plain and encouraging. **Bold** the key words.

![What the picture shows](image:first-picture)

- Short bullet
- Another short bullet

> Tip: A helpful shortcut.

> Mistake: A common error and why it hurts.

> Remember: The one thing they must not forget.

?? A quick check question?
- Wrong answer
- *Right answer
- Another wrong answer
= Why the right answer is right.

#### Second chapter

steps:
1. Step name :: What to do
2. Next step :: What to do next

flip[Myth or fact?]: The claim a student might believe || The truth, in one or two sentences.

compare[Do|Don't]: Daily habits
+ Something to do
- Something to avoid

### Lesson 2 title
kind: reading
summary: ...

#### Chapter

Content...

### Final assessment
kind: quiz
pass: 70

?? Question one?
- *Right answer
- Wrong answer
= Why.
`;

export const TEMPLATE_VIDEO_MD = `# Course title
subtitle: One line that sells the course
type: video
level: beginner
free: false
price: 4500
hero: image:course-hero

## Module 1 name

### Lesson 1: Welcome
kind: video
video: PASTE_VIDEO_LINK_HERE
duration: 6:30
summary: What this video covers.

#### Notes under the video

Short written notes that show beneath the player. One idea per paragraph.

- Key point one
- Key point two

> Tip: Something worth pausing the video for.

### Lesson 2: Technique
kind: video
video: PASTE_VIDEO_LINK_HERE
duration: 12:00
summary: What this video covers.

#### Notes under the video

Notes...

?? Quick check?
- Wrong
- *Right
= Why.

### Final quiz
kind: quiz
pass: 70

?? Question one?
- *Right answer
- Wrong answer
= Why.
`;

export const TEMPLATES = {
  story: { label: "Story course (reading, no video)", file: "story-course-template.md", text: TEMPLATE_STORY_MD },
  video: { label: "Video course (videos + notes)", file: "video-course-template.md", text: TEMPLATE_VIDEO_MD },
};

const FENCE = "```";

const FORMAT_RULES = `FORMAT RULES (Markdown, one file)
- "# " = course title. Then optional "key: value" lines: subtitle, type (story or video), level (beginner/intermediate/advanced), free (true/false), price (number), hero (image:slot-name).
- "## " = module. "### " = lesson, followed by "key: value" lines: kind (reading, video or quiz), summary, and for video lessons: video (a link) and duration (m:ss).
- "#### " = chapter inside a lesson (becomes a chapter title screen).
- A plain paragraph = one screen. Keep every paragraph to ONE idea, 1 to 3 short sentences. **bold** and *italic* are allowed.
- "- " bullets, "1. " numbered, "- [ ] " tick-each-one checklist.
- Callouts: "> Tip: ...", "> Mistake: ...", "> Remember: ..." (use "> Note: ..." for neutral info).
- Quote: "> Text. — Person".
- Steps: a line "steps:" then "1. Step title :: What to do". Long procedures: use "steps[5/18]:" to continue numbering across blocks (max 4 steps per block).
- Quick check: "?? Question" then options as "- Option", the right one as "- *Option", then "= Why it is right".
- Flip card: "flip[Prompt]: Front || Back" (myth/fact, client questions, definitions).
- Compare: "compare[Do|Don't]: Title" then "+ do item" and "- don't item" lines.
- Picture: "![What it shows](image:short-slot-name)". Never invent a web address. Use a short lowercase slot name; the admin attaches the real file with a matching name.
- "---" = visual divider (rarely needed).
- Output ONLY the Markdown, in a single code block, with no commentary before or after.`;

/**
 * @param {{ type?: "story"|"video", scope?: "full"|"summary", audience?: string }} o
 */
export function buildAiPrompt({ type = "story", scope = "full", audience = "" } = {}) {
  const t = TEMPLATES[type] || TEMPLATES.story;
  const scopeText = scope === "summary"
    ? "BREAK IT DOWN: do not copy the document. Turn it into a short, motivating course: 3 to 6 modules, 2 to 4 lessons each, keeping only what a beginner must know. Merge repeated points and drop filler."
    : "KEEP EVERYTHING: cover the whole document in order, losing no facts, numbers, steps or warnings. Reword into short screens, but do not leave anything out. Group the content into modules and lessons that follow its sections.";
  const kind = type === "video"
    ? `This is a VIDEO course. Make one video lesson per video the document describes. For every video lesson write "video: PASTE_VIDEO_LINK_HERE" (the admin pastes the real link later; never invent one) and an estimated duration. Under each video put short written notes (chapters, bullets, callouts) and a quick check.`
    : `This is a STORY course (reading only, shown one idea per screen on a phone). Make it feel like a story, not a document: short screens, a quick check after each chapter, flip cards for myths or client questions, steps for procedures, compare blocks for do/don't, callouts for tips and mistakes.`;
  return `I am uploading a document (PDF). Convert it into a course in the exact Markdown format below, ready to paste into my course builder.

COURSE TYPE
${kind}
${audience ? `\nAUDIENCE: ${audience}\n` : ""}
SCOPE
${scopeText}

QUALITY BAR
- Plain, warm, encouraging language. Use the document's own facts and spelling; do not add facts that are not in it.
- Every lesson ends with 1 to 3 quick checks ("??" questions) with three options each.
- Add a final lesson with kind: quiz (8 to 10 questions, pass: 70).
- Where the document has a diagram or photo, add a picture line with a descriptive slot name and a caption, for example: ![Parts of the eye](image:eye-anatomy).
- Put short "summary:" lines on every lesson.

${FORMAT_RULES}

EXAMPLE OF THE FORMAT (do not copy its content)
${FENCE}
${t.text.trim()}
${FENCE}
`;
}
