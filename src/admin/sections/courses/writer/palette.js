// The blocks the lesson writer offers, in the order the palette and the "/" menu show them.
// `make` returns a fresh block in the shape the course builder stores (see newBlock in courseModel.js).

export const PALETTE = [
  {
    group: "Text",
    items: [
      { id: "heading", label: "Chapter heading", icon: "H", desc: "Starts a new chapter", keys: "title h2 section", make: () => ({ type: "heading", text: "" }) },
      { id: "text", label: "Paragraph", icon: "¶", desc: "Plain text, one idea at a time", keys: "statement body", make: () => ({ type: "text", text: "" }) },
      { id: "bullets", label: "Bullet list", icon: "•", desc: "Points in a list", keys: "ul unordered", make: () => ({ type: "list", style: "bullets", items: [""] }) },
      { id: "numbered", label: "Numbered list", icon: "1.", desc: "Points in order", keys: "ol ordered", make: () => ({ type: "list", style: "numbered", items: [""] }) },
      { id: "checklist", label: "Checklist", icon: "☑", desc: "Students tick every item", keys: "todo tick", make: () => ({ type: "list", style: "checklist", items: [""] }) },
      { id: "quote", label: "Big quote", icon: "“", desc: "A line on its own screen", keys: "blockquote saying", make: () => ({ type: "quote", text: "", by: "" }) },
    ],
  },
  {
    group: "Highlights",
    items: [
      { id: "tip", label: "Pro tip", icon: "✦", desc: "A helpful tip", keys: "callout hint", make: () => ({ type: "callout", tone: "tip", title: "", text: "" }) },
      { id: "mistake", label: "Common mistake", icon: "!", desc: "Something to avoid", keys: "callout warning avoid", make: () => ({ type: "callout", tone: "mistake", title: "", text: "" }) },
      { id: "key", label: "Remember", icon: "★", desc: "A key point", keys: "callout important", make: () => ({ type: "callout", tone: "key", title: "", text: "" }) },
      { id: "note", label: "Note", icon: "i", desc: "Extra information", keys: "callout info", make: () => ({ type: "callout", tone: "note", title: "", text: "" }) },
    ],
  },
  {
    group: "Interactive",
    items: [
      { id: "flip", label: "Flip card", icon: "↻", desc: "Tap to turn over", keys: "myth fact card", make: () => ({ type: "flip", prompt: "Tap the card", front: "", back: "" }) },
      { id: "checkpoint", label: "Quick check", icon: "?", desc: "A question to continue", keys: "quiz question multiple choice", make: () => ({ type: "checkpoint", question: "", options: ["", "", ""], answer: 0, explain: "" }) },
      { id: "steps", label: "Steps", icon: "①", desc: "Revealed one by one", keys: "process sequence", make: () => ({ type: "steps", items: [{ title: "", text: "" }, { title: "", text: "" }] }) },
      { id: "compare", label: "Do / Don't", icon: "⇆", desc: "Two columns side by side", keys: "compare vs", make: () => ({ type: "compare", title: "", do: [""], dont: [""] }) },
    ],
  },
  {
    group: "Media",
    items: [
      { id: "figure", label: "Image", icon: "▣", desc: "Upload a picture", keys: "picture photo figure media", make: () => ({ type: "figure", url: "", caption: "" }) },
      { id: "divider", label: "Divider", icon: "—", desc: "A line between parts", keys: "hr line separator", make: () => ({ type: "divider" }) },
    ],
  },
];

export const PALETTE_ITEMS = PALETTE.flatMap((g) => g.items.map((it) => ({ ...it, group: g.group })));
export const paletteItem = (id) => PALETTE_ITEMS.find((it) => it.id === id);

export function searchPalette(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return PALETTE_ITEMS;
  return PALETTE_ITEMS.filter((it) => `${it.label} ${it.id} ${it.keys}`.toLowerCase().includes(q));
}

/** Palette id that describes a block (for the style picker). */
export function paletteIdOf(b) {
  if (!b) return "";
  if (b.type === "list") return b.style === "numbered" ? "numbered" : b.style === "checklist" ? "checklist" : "bullets";
  if (b.type === "callout") return b.tone || "note";
  return b.type;
}

export const TEXT_LIKE = ["text", "heading", "quote", "callout", "list"];
export const TURN_INTO = ["text", "heading", "bullets", "numbered", "checklist", "quote", "tip", "mistake", "key", "note"];

/** Re-types a text-like block, keeping its words. */
export function convertBlock(b, id) {
  const item = paletteItem(id);
  if (!item) return b;
  const next = item.make();
  const words = b.type === "list" ? (b.items || []).filter((x) => x.trim()) : [b.text || ""];
  if (next.type === "list") next.items = words.length ? words : [""];
  else if ("text" in next) next.text = words.join(" ");
  if (b.type === "callout" && next.type === "callout" && b.title) next.title = b.title;
  return next;
}
