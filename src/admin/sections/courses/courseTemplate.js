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
