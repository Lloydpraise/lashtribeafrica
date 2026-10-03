// Demo / preview courses. Used when Supabase isn't configured or the course tables
// haven't been created yet, so the learning experience can be previewed.
// The same content is written to supabase/migrations/0007_seed_demo_courses.sql.
// The sample videos below are placeholders (public test clips), replace them with real lessons.

import { art } from "../components/learn/util.js";
import { CLASSIC_SET_ESSENTIALS } from "./courses/classic-set-essentials.js";

const BBB = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const ELE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
const SIN = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4";

const eyeArt = art(
  `<path d="M120 250 Q400 90 680 250 Q400 380 120 250Z"/><circle cx="400" cy="240" r="62"/><circle cx="400" cy="240" r="22"/>` +
    [0, 1, 2, 3, 4, 5, 6, 7, 8]
      .map((i) => `<path d="M${190 + i * 52} ${215 - Math.sin(i / 8 * Math.PI) * 30} l${-26 + i * 6} -52"/>`)
      .join("")
);
const fanArt = art(
  `<path d="M400 380 L400 250"/>` +
    [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => `<path d="M400 250 Q${400 + i * 28} 180 ${400 + i * 62} 110"/>`).join("")
);
const tweezerArt = art(
  `<path d="M180 360 L520 190 L640 150"/><path d="M200 395 L540 210 L650 170"/><path d="M520 190 Q560 170 640 150"/>`
);
const dropArt = art(
  `<path d="M400 90 Q520 250 400 330 Q280 250 400 90Z"/><path d="M340 270 Q360 300 400 300"/>`
);

export const DEMO_PRODUCTS = {
  "pro-bond-adhesive-5ml": { name: "Pro Bond Adhesive 5ml", price: 1600 },
  "0-07-volume-fans-mixed-tray": { name: "0.07 Volume Fans, Mixed Tray", price: 1150 },
  "isolation-tweezers-curved": { name: "Isolation Tweezers, Curved", price: 780 },
};

export const DEMO_COURSES = [
  {
    slug: "volume-lashing-fundamentals",
    title: "Volume Lashing Fundamentals",
    subtitle: "Fans, isolation and the habits of a clean set",
    description: "Everything you need before your first full volume set: setup, safety, fan formation and isolation.",
    level: "beginner",
    is_free: true,
    price: 0,
    sequential: false,
    certificate_enabled: true,
    bonus_points: 500,
    modules: [
      {
        title: "Before you begin",
        lessons: [
          {
            title: "Welcome and safety basics",
            kind: "video",
            summary: "Set up your station and protect your client from the very first minute.",
            is_preview: true,
            video: {
              provider: "file",
              src: BBB,
              duration: 596,
              chapters: [
                { t: 0, title: "Welcome" },
                { t: 90, title: "Your workspace" },
                { t: 230, title: "Hygiene essentials" },
                { t: 410, title: "Client safety" },
              ],
              transcript: [
                { t: 0, text: "Welcome to the academy. In this lesson we set up your station the way a pro does it." },
                { t: 24, text: "A great set starts long before the first lash. It starts with a calm, clean workspace." },
                { t: 60, text: "Lay out your tweezers, adhesive, tray and cleanser in the order you will reach for them." },
                { t: 100, text: "Shake your adhesive well and drop a fresh amount onto a jade stone or tile every 30 minutes." },
                { t: 150, text: "Keep the bottle tight between uses. Air and humidity are the enemies of a strong bond." },
                { t: 235, text: "Sanitise your hands, your tweezers and every surface your client might touch." },
                { t: 300, text: "Never reuse a disposable. Single-use means single-use, every time." },
                { t: 415, text: "Ask about allergies and sensitivities before you begin, and patch test when in doubt." },
                { t: 500, text: "If your client feels any stinging, stop, remove and reassess. Comfort comes first." },
              ],
              products: [{ t: 100, slug: "pro-bond-adhesive-5ml", note: "The adhesive used in this lesson" }],
            },
            blocks: [
              { type: "heading", text: "The three rules of a safe station" },
              { type: "list", style: "numbered", items: ["**Clean** everything that touches your client", "**Fresh** adhesive and fresh disposables", "**Calm** pace, because rushing causes mistakes"] },
              { type: "callout", tone: "tip", title: "Pro tip", text: "Set a 30 minute timer on your phone as a reminder to refresh your adhesive drop." },
            ],
          },
          {
            title: "Preparing the lash bed",
            kind: "reading",
            summary: "A clean canvas is the difference between a set that lasts two weeks and one that lasts two days.",
            read_minutes: 6,
            blocks: [
              { type: "text", text: "Retention is decided in the first ten minutes of an appointment. Before a single extension touches a natural lash, the lash bed has to be clean, dry and oil free." },
              { type: "heading", text: "Start with a clean canvas" },
              { type: "text", text: "Natural oils, sunscreen and makeup residue are the number one cause of early lash loss. Cleanse every client, even the ones who arrive 'bare faced'." },
              { type: "flip", prompt: "Myth or fact?", front: "Clients who arrive bare faced don't need cleansing.", back: "Natural oils and sunscreen still cause early lash loss. **Cleanse every client.**" },
              { type: "figure", url: eyeArt, caption: "Lash line, upper lid, and where cleansing stops." },
              { type: "steps", items: [
                { title: "Remove makeup", text: "Use an oil free remover on a lint free pad, working from the inner corner outward." },
                { title: "Foam cleanse", text: "Apply lash cleanser with a soft brush along the base of the lashes." },
                { title: "Rinse and dry", text: "Rinse with a damp pad, then dry completely with a gentle fan." },
              ] },
              { type: "callout", tone: "mistake", title: "Common mistake", text: "Skipping the dry step. Even slightly damp lashes will weaken the adhesive bond." },
              { type: "heading", text: "Primer and isolation" },
              { type: "text", text: "A primer prepares the lash surface for the adhesive. Apply a **thin, even** layer and allow it to flash dry before you begin." },
              { type: "quote", text: "Retention is built in preparation, not repaired in the fill.", by: "Lashtribe Academy" },
              { type: "checkpoint", question: "What should you do right after rinsing the lash bed?", options: ["Apply adhesive immediately", "Dry completely before primer", "Apply a second cleanse"], answer: 1, explain: "Moisture weakens the bond, so the lashes must be completely dry before primer or adhesive." },
              { type: "heading", text: "Your 60 second checklist" },
              { type: "list", style: "checklist", items: ["Makeup and oils removed", "Cleansed and rinsed", "Completely dry", "Primer applied and flash dried", "Under eye pads placed smoothly"] },
              { type: "callout", tone: "key", title: "Remember", text: "Clean, dry and primed. If you do nothing else, do these three." },
            ],
          },
        ],
      },
      {
        title: "Building fans",
        lessons: [
          {
            title: "Fan formation techniques",
            kind: "video",
            summary: "Pick up, split and pinch to create a handmade fan you can trust.",
            video: {
              provider: "file",
              src: ELE,
              duration: 653,
              chapters: [
                { t: 0, title: "What makes a good fan" },
                { t: 120, title: "Picking up a clean fan" },
                { t: 300, title: "Pinching the base" },
                { t: 480, title: "Troubleshooting" },
              ],
              transcript: [
                { t: 0, text: "A handmade fan is simply several thin extensions joined at a narrow base." },
                { t: 40, text: "You are looking for an even spread and a base that looks like a single point." },
                { t: 125, text: "Pick up two to five lashes from the tray with your tweezers, using a soft grip." },
                { t: 190, text: "Let the lashes fall open naturally rather than forcing them apart." },
                { t: 305, text: "Gently pinch a few millimetres above the base to set the fan." },
                { t: 380, text: "Use fresh tray fans for practice. They stay lined up and easier to handle." },
                { t: 485, text: "If the fan looks wide on one side, let it go and pick up again." },
                { t: 560, text: "Consistency beats speed. Speed will come with repetition." },
              ],
              products: [
                { t: 125, slug: "0-07-volume-fans-mixed-tray", note: "Great for practising fan pick up" },
                { t: 305, slug: "isolation-tweezers-curved", note: "The tweezers used here" },
              ],
            },
            blocks: [
              { type: "heading", text: "What to look for" },
              { type: "figure", url: fanArt, caption: "A clean fan has an even spread and one narrow base." },
              { type: "callout", tone: "tip", title: "Pro tip", text: "Practise on a mannequin for 15 minutes before every client for the first month." },
            ],
          },
          {
            title: "Isolation practice",
            kind: "video",
            summary: "Separate a single natural lash every time without sticking neighbours.",
            video: {
              provider: "file",
              src: SIN,
              duration: 888,
              chapters: [
                { t: 0, title: "Why isolation matters" },
                { t: 200, title: "Tweezer angles" },
                { t: 520, title: "Live demo" },
              ],
              transcript: [
                { t: 0, text: "Isolation is the skill every other skill depends on." },
                { t: 60, text: "If you stick two natural lashes together the client will feel it within days." },
                { t: 205, text: "Hold your isolation tweezer flat and slide under one lash at a time." },
                { t: 330, text: "Use the lash line as a guide, and check from both sides." },
                { t: 525, text: "Now watch the full sequence at normal speed." },
              ],
              products: [],
            },
            blocks: [],
          },
          {
            title: "Fan formation quiz",
            kind: "assessment",
            summary: "Five questions to lock in what you have learned. Score 60% to pass.",
            blocks: [
              { type: "quiz", passScore: 60, questions: [
                { q: "How often should you refresh the adhesive drop during a set?", options: ["Once per day", "About every 30 minutes", "Only when it runs out"], answer: 1, explain: "Adhesive cures and loses strength as it sits in open air, so refresh it regularly." },
                { q: "What makes a handmade fan look professional?", options: ["A very wide base", "An even spread and a narrow base", "As many lashes as possible"], answer: 1, explain: "The base should read as a single point so the fan sits neatly on one natural lash." },
                { q: "A client reports stinging during a set. What is the first step?", options: ["Continue quickly", "Stop and reassess", "Add more primer"], answer: 1, explain: "Comfort and safety come first. Stop and reassess before continuing." },
                { q: "Why is isolation so important?", options: ["It makes sets look fuller", "It prevents lashes sticking together", "It speeds up application"], answer: 1, explain: "Stuck natural lashes pull and break, causing discomfort and early shedding." },
                { q: "Which should always be dry before adhesive is applied?", options: ["The tray", "The lash bed", "The mannequin"], answer: 1, explain: "A completely dry lash bed gives the adhesive a strong bond." },
              ] },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "tool-and-product-handling",
    title: "Tool & Product Handling",
    subtitle: "Care, hygiene and storage for every item on your trolley",
    description: "A short reading course on how to look after your tools and products.",
    level: "beginner",
    is_free: true,
    price: 0,
    sequential: false,
    certificate_enabled: true,
    bonus_points: 200,
    modules: [
      {
        title: "Your toolkit",
        lessons: [
          {
            title: "Adhesive: storage and handling",
            kind: "reading",
            summary: "How to keep your adhesive strong from the first drop to the last.",
            read_minutes: 5,
            blocks: [
              { type: "text", text: "Adhesive is the most sensitive product on your trolley. Heat, humidity and air all change how it cures, so handling it well matters as much as how you apply it." },
              { type: "heading", text: "Where to keep it" },
              { type: "figure", url: dropArt, caption: "Store upright, sealed, and away from sunlight." },
              { type: "list", style: "bullets", items: ["Cool, dry place away from direct sun", "Upright, with the cap tightly closed", "Sealed in an airtight container with silica gel"] },
              { type: "callout", tone: "tip", title: "Pro tip", text: "Write the date you open each bottle on the label, and replace it after about a month." },
              { type: "flip", prompt: "Myth or fact?", front: "Adhesive cures fastest in a very dry room.", back: "Humidity speeds up curing. Most adhesives work best in **moderate humidity**, so check your room." },
              { type: "heading", text: "Working with it" },
              { type: "steps", items: [
                { title: "Shake", text: "Shake the bottle for at least 30 seconds before each use." },
                { title: "Drop", text: "Place a small drop on a clean surface and refresh every 30 minutes." },
                { title: "Wipe", text: "Wipe the nozzle clean after every use to prevent clogging." },
              ] },
              { type: "checkpoint", question: "Where is the best place to store adhesive?", options: ["On the window sill", "Cool, dry and sealed", "In the fridge, uncovered"], answer: 1, explain: "Cool, dry and sealed keeps the adhesive from curing early." },
            ],
          },
          {
            title: "Tweezers: care and sanitising",
            kind: "reading",
            summary: "Keep your tweezers aligned, clean and safe for every client.",
            read_minutes: 4,
            blocks: [
              { type: "text", text: "Your tweezers are your most personal tool. A well looked after pair lasts for years and keeps your isolation precise." },
              { type: "heading", text: "Cleaning after every client" },
              { type: "figure", url: tweezerArt, caption: "Tips should meet evenly with no gap." },
              { type: "steps", items: [
                { title: "Remove residue", text: "Wipe away adhesive with a lint free pad and remover." },
                { title: "Disinfect", text: "Soak in hospital grade disinfectant for the recommended time." },
                { title: "Dry and store", text: "Dry completely and store in a clean, closed case." },
              ] },
              { type: "compare", title: "Handling your tweezers", do: ["Store them in a closed case", "Disinfect after every client", "Check the tips meet evenly"], dont: ["Drop them on a hard floor", "Share them between technicians", "Use them to open bottles"] },
              { type: "callout", tone: "mistake", title: "Common mistake", text: "Dropping tweezers onto a hard floor. Even a small bend in the tip will affect isolation." },
              { type: "callout", tone: "key", title: "Remember", text: "Clean after every client and never share tweezers between technicians." },
            ],
          },
        ],
      },
    ],
  },
];

DEMO_COURSES.unshift(CLASSIC_SET_ESSENTIALS);

export function getDemoCourse(slug) {
  const c = DEMO_COURSES.find((x) => x.slug === slug);
  if (!c) return null;
  const modules = [];
  const lessons = [];
  const content = {};
  let order = 0;
  c.modules.forEach((m, mi) => {
    const mod = { id: `${c.slug}-m${mi + 1}`, title: m.title, sort_order: mi };
    modules.push(mod);
    m.lessons.forEach((l, li) => {
      const id = `${c.slug}-l${++order}`;
      lessons.push({
        id,
        course_id: c.slug,
        module_id: mod.id,
        title: l.title,
        kind: l.kind,
        summary: l.summary || "",
        duration_seconds: l.video?.duration || 0,
        read_minutes: l.read_minutes || 0,
        is_preview: !!l.is_preview,
        sort_order: order,
      });
      content[id] = { video: l.video || null, blocks: l.blocks || [] };
    });
  });
  const { modules: _m, ...course } = c;
  return { course: { id: c.slug, ...course }, modules, lessons, content };
}
