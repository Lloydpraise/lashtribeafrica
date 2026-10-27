// Classic Set Essentials, rewritten as an ARTICLE-mode course (same format as the Beginner Lashtech Guide and the
// rewritten InfinityGlow Mastery). Source: course content/eyelash_extension_course_curriculum.md. Every fact, number and
// rule from that curriculum is kept; the prose around it walks the student through each idea (ask the question, answer it
// plainly, give an example, then check understanding). The modules follow the ideas, not the curriculum's six chapters.
//
// Article mode only: 0039 sets courses.reading_view = 'article' (see 0037 for how that switch works).
// Images: public/course-media/classic-set-essentials/ (unchanged). This is a free course, so every lesson stays a preview.
//
// Generate the Supabase seed with:
// node scripts/course-to-sql.mjs src/data/courses/classic-set-essentials.js
// (0039_classic_article_rewrite.sql was written from this file; see the header of that file.)

const M = "/course-media/classic-set-essentials/";

// reading time from the words on the page (~180 words a minute, plus a little for each question)
const words = (b) => {
  const s = [b.text, b.title, b.question, b.front, b.back, ...(b.items || []).map((i) => (typeof i === "string" ? i : `${i.title} ${i.text}`)), ...(b.do || []), ...(b.dont || [])]
    .filter(Boolean).join(" ");
  return s.split(/\s+/).filter(Boolean).length + (b.type === "checkpoint" || b.type === "flip" ? 25 : 0);
};
const rm = (blocks) => Math.max(2, Math.round(blocks.reduce((n, b) => n + words(b), 0) / 180));

const lesson = (title, summary, blocks, extra = {}) => ({
  title,
  kind: "reading",
  summary,
  is_preview: true,
  read_minutes: rm(blocks),
  blocks,
  ...extra,
});

const quiz = (title, summary, questions, passScore = 70) => ({
  title,
  kind: "assessment",
  summary,
  is_preview: true,
  read_minutes: 0,
  blocks: [{ type: "quiz", passScore, questions }],
});

// ---------------------------------------------------------------------------
// Module 1: Start here
// ---------------------------------------------------------------------------

const L1 = lesson(
  "Welcome to Lash Artistry",
  "What this course covers, how it is laid out, and why technique and practice are always built around safety.",
  [
    { type: "heading", text: "Your lash journey starts here" },
    { type: "text", text: "Eyelash extensions are single synthetic fibers attached to a person’s natural eyelashes to create more length and fullness. That one sentence is the whole job. The rest of this course is about doing it well, and above all doing it safely." },
    { type: "quote", text: "A beautiful set starts with care for the person wearing it." },
    { type: "text", text: "You will be working very close to a person’s eyes. So before we talk about tools, styles or glue, here is the golden rule that everything else grows from: **the glue and the extension must never touch the skin.**" },

    { type: "heading", text: "How this course flows" },
    { type: "text", text: "The course is written to be read like a book, from top to bottom. Each part answers the question the part before it raises, so take it in order. You will find quick questions inside the lessons and a short quiz at the end of the bigger parts." },
    { type: "steps", items: [
      { title: "Meet the lash", text: "What an extension is, how the natural lash grows and sheds, and the three styles of set." },
      { title: "Tools and a clean workspace", text: "What goes on your station, and how to keep it clean enough to work beside someone’s eyes." },
      { title: "Train your hands", text: "How to practise before you ever touch a person, and how to control your glue." },
      { title: "Design the set", text: "Reading the eye, lash maps, lengths and curls." },
      { title: "The lash service", text: "Preparing, applying, fixing mistakes and removing extensions safely." },
      { title: "Aftercare and your business", text: "Looking after clients after the appointment, and the foundations of a lash business." },
    ] },

    { type: "heading", text: "Practice comes before clients" },
    { type: "callout", tone: "key", title: "Practice before clients", text: "This course provides foundational knowledge. The curriculum recommends **50–100 hours of hands-on practice** to build control and muscle memory before working independently." },
    { type: "text", text: "Why so many hours? Lashing is a fine motor skill, like learning to write neatly. You can understand every rule in this course and still need your hands to learn it. That is why you will meet practice drills before you meet a live model." },
    { type: "checkpoint", question: "What is the main purpose of this course?", options: ["To replace supervised practice", "To introduce foundational knowledge and safety", "To guarantee a profitable business"], answer: 1, explain: "The course covers foundational knowledge. Lash artistry also requires substantial, supervised hands-on practice." },
  ]
);

// ---------------------------------------------------------------------------
// Module 2: Meet the lash
// ---------------------------------------------------------------------------

const L2 = lesson(
  "How Extensions Work",
  "What an extension is, where it attaches, and the 1–2 mm gap that keeps clients safe.",
  [
    { type: "heading", text: "An extension attaches to a lash" },
    { type: "text", text: "An eyelash extension is a synthetic fiber attached to an **individual natural eyelash.** It is not glued to the eyelid, and it is not glued to the skin. Take a moment with this picture of the eye, because these are the parts you will be working beside:" },
    { type: "figure", url: M + "anatomy.webp", caption: "Parts of the human eye" },
    { type: "text", text: "Notice how close the eyelash is to the top lid. That closeness is exactly why the placement rules matter." },

    { type: "heading", text: "The spacing rule" },
    { type: "text", text: "Always leave a tiny gap of **1 to 2 millimetres** between the eyelid and the glue. This gap does two jobs: it prevents irritation, and it allows the lash to move naturally." },
    { type: "text", text: "To picture 1–2 mm, think of the thickness of a pencil lead or a grain of rice. It is a very small gap, but it is the difference between a comfortable set and an irritated eyelid." },
    { type: "steps", items: [
      { title: "Find one healthy natural lash", text: "The extension is attached to the natural lash, not the skin." },
      { title: "Leave a small gap", text: "Keep the attachment about **1–2 mm from the eyelid**, so glue and extension do not touch skin." },
      { title: "Check the placement", text: "The extension should sit neatly on the natural lash and allow it to move freely." },
    ] },
    { type: "callout", tone: "mistake", title: "Never attach to skin", text: "Glue or extensions touching the eyelid can irritate the skin and interfere with natural movement." },
    { type: "flip", prompt: "True or false?", front: "The extension should touch the eyelid so it stays secure.", back: "False. Attach to the natural lash and leave about **1–2 mm** between the attachment and the eyelid." },
    { type: "checkpoint", question: "Where should an extension be attached?", options: ["To the eyelid skin", "To an individual natural lash, leaving a small gap from the eyelid", "Across several natural lashes"], answer: 1, explain: "Attach to one natural lash, not skin, and keep the glue and extension away from the eyelid." },
  ]
);

const L3 = lesson(
  "Natural Lash Growth and Safe Selection",
  "Why shedding is normal, and why fragile new lashes should never carry an extension.",
  [
    { type: "heading", text: "Lashes grow and shed" },
    { type: "text", text: "Natural eyelashes move through a growth cycle, just like the hair on your head. Humans lose **1 to 4 lashes every day** naturally." },
    { type: "text", text: "Here is what that means for you. An extension is attached to a natural lash, so when that lash sheds, the extension goes with it. A few extensions falling out each day is normal, and does not mean something went wrong." },

    { type: "heading", text: "“Teenager” lashes and “baby” lashes" },
    { type: "text", text: "Not every lash on the lash line is ready for an extension. Think of the lashes as a family of different ages:" },
    { type: "compare", title: "Which lash can carry an extension?", doLabel: "“Teenager” lashes", dontLabel: "“Baby” lashes",
      do: ["Have stopped growing", "Are resting for 2 to 3 weeks", "Are strong enough to carry the extension"],
      dont: ["Are still growing", "Are delicate and weak", "The weight of an extension can damage them"] },
    { type: "text", text: "A newly growing lash, the **baby lash,** is still delicate and may not be strong enough to support an extension. Putting weight on it can damage it." },
    { type: "callout", tone: "key", title: "Choose a healthy lash", text: "Work only on a healthy, mature natural lash with enough strength to support the extension. Do not add weight to fragile new growth." },

    { type: "heading", text: "Choosing responsibly, step by step" },
    { type: "steps", items: [
      { title: "Observe the natural lash", text: "Check its condition and maturity before selecting it." },
      { title: "Match the extension responsibly", text: "Choose an extension that the natural lash can safely support, following your practical training." },
      { title: "Leave unsuitable lashes alone", text: "Do not lash fragile new growth, or a lash that cannot safely carry an extension." },
    ] },
    { type: "checkpoint", question: "Why should fragile baby lashes be left alone?", options: ["They shed less often", "They may be too weak to support the extension", "They make glue dry faster"], answer: 1, explain: "New growth is delicate. Added weight can strain or damage a lash that is not strong enough." },
    { type: "checkpoint", question: "About how many natural lashes may a person lose each day?", options: ["1–4", "20–30", "None"], answer: 0, explain: "Losing around 1–4 lashes a day is normal as part of the natural lash cycle." },
  ]
);

const L4 = lesson(
  "Classic, Hybrid and Volume",
  "The three styles of set, and the ratio of extensions to natural lashes behind each one.",
  [
    { type: "heading", text: "Three styles, one idea" },
    { type: "text", text: "Lash styles differ in how extensions are attached and in the look they create. The easiest way to tell them apart is the **ratio:** how many extensions go on one natural lash. Choose a style and a weight that are appropriate for the client’s natural lashes." },

    { type: "heading", text: "Classic" },
    { type: "figure", url: M + "classic-photo.webp", caption: "A classic set" },
    { type: "text", text: "**Classic** uses a **1:1 ratio:** one extension on one natural lash. It adds length rather than a fan of volume, so the result looks like the client’s own lashes, only longer." },
    { type: "figure", url: M + "classic-ratio.webp", caption: "Classic: one extension to one natural lash" },

    { type: "heading", text: "Hybrid" },
    { type: "figure", url: M + "hybrid-photo.webp", caption: "A hybrid set" },
    { type: "text", text: "**Hybrid** combines classic extensions and volume fans, for a blend of length and texture. It is the in-between choice." },
    { type: "figure", url: M + "hybrid-ratio.webp", caption: "Hybrid: classic extensions mixed with fans" },

    { type: "heading", text: "Volume" },
    { type: "figure", url: M + "volume-photo.webp", caption: "A volume set" },
    { type: "text", text: "**Volume** uses fans of typically **2–6 thin extensions** on a natural lash to create a fuller look. Because the fan adds weight, the natural lash must be able to support it safely." },
    { type: "figure", url: M + "volume-ratio.webp", caption: "Volume fans placed on natural lashes" },
    { type: "callout", tone: "note", title: "In this course", text: "This course teaches the classic technique, one extension on one natural lash. Master that first: it builds the isolation skills every other style depends on." },
    { type: "checkpoint", question: "Which style uses one extension on one natural lash?", options: ["Classic", "Hybrid", "Volume"], answer: 0, explain: "Classic uses a 1:1 ratio: one extension attached to one natural lash." },
    { type: "checkpoint", question: "What does a hybrid set combine?", options: ["Classic extensions and volume fans", "Only long extensions", "Extensions and eye pads"], answer: 0, explain: "Hybrid combines classic extensions with volume fans." },
    { type: "checkpoint", question: "Why must volume fans be selected carefully?", options: ["The natural lash must safely support their weight", "They should always touch the eyelid", "They are attached to several natural lashes"], answer: 0, explain: "The natural lash must be able to support the fan without undue strain." },
  ]
);

const Q1 = quiz(
  "Quiz: Meet the Lash",
  "Five questions on extensions, the growth cycle and set styles. Score 70% to pass.",
  [
    { q: "Where should an eyelash extension be attached?", options: ["To the eyelid skin", "To one natural lash, leaving about 1–2 mm from the eyelid", "Across several natural lashes"], answer: 1, explain: "Attach to an individual natural lash, never to skin, and keep glue and extension away from the eyelid." },
    { q: "What is the golden rule of lash safety?", options: ["The glue and extension must never touch the skin", "Always use the longest extension", "Use as much glue as possible"], answer: 0, explain: "The golden rule is safety: the glue and the extension must never touch the skin." },
    { q: "About how many natural lashes may a person lose each day?", options: ["1–4", "20–30", "None"], answer: 0, explain: "Losing around 1–4 lashes a day is normal as part of the natural lash cycle." },
    { q: "Why should fragile baby lashes be left alone?", options: ["They may be too weak to support an extension", "They are the longest lashes", "They cannot shed"], answer: 0, explain: "New growth is delicate and may be damaged by the weight of an extension." },
    { q: "What ratio does a classic set use?", options: ["1:1", "2–6 : 1", "10 : 1"], answer: 0, explain: "Classic is one extension on one natural lash." },
  ]
);

// ---------------------------------------------------------------------------
// Module 3: Tools and a clean workspace
// ---------------------------------------------------------------------------

const L5 = lesson(
  "Build Your Professional Toolkit",
  "The core tools and products, and what each one is for.",
  [
    { type: "heading", text: "Prepare the right tools" },
    { type: "text", text: "You are working very close to a person’s eyes, so you must use the right tools. A tidy, prepared station also helps you work carefully, instead of searching for supplies in the middle of a service." },
    { type: "text", text: "Tick off each item as you read it. This is your station checklist:" },
    { type: "list", style: "checklist", items: [
      "Isolation tweezers to separate one natural lash",
      "Placement tweezers to pick up and place an extension",
      "Professional lash primer",
      "Professional lash adhesive",
      "Professional adhesive remover",
      "Single-use items for each client",
    ] },

    { type: "heading", text: "Why two pairs of tweezers?" },
    { type: "text", text: "Isolation and placement are two different jobs. Use one pair to separate the natural lashes, and a second pair to place the fake lash. You will use both hands at once, so each hand needs its own tool." },
    { type: "flip", prompt: "Match the tool to the task", front: "What are the two pairs of tweezers for?", back: "One pair isolates a natural lash; the other picks up and places the extension." },
    { type: "callout", tone: "note", title: "Use products as directed", text: "Use professional products according to their labels and your training. Do not substitute household glue or remover." },
    { type: "checkpoint", question: "Why are two pairs of tweezers used?", options: ["One isolates; the other places the extension", "One is for the client and one is for the artist", "They are interchangeable decorations"], answer: 0, explain: "Isolation and placement are separate tasks, each requiring a suitable pair of tweezers." },
  ]
);

const L6 = lesson(
  "Cleaning, Disinfecting and Sterilizing",
  "Three different levels of clean, and what each one means.",
  [
    { type: "heading", text: "Cleanliness protects clients" },
    { type: "text", text: "Lash work happens close to the eyes, so you must keep everything perfectly clean to stop eye infections. Keep the bed, station, tools, and anything the client touches clean, and follow local health requirements." },
    { type: "text", text: "“Clean” is not one thing. The curriculum separates three levels, and it helps to picture them as a ladder. Each step up is stronger than the one before:" },
    { type: "steps", items: [
      { title: "Sanitize / clean", text: "Wipe your bed and station with alcohol, and remove visible dirt and residue from tools." },
      { title: "Disinfect", text: "Soak your tools in hospital-grade liquid to kill most bacteria." },
      { title: "Sterilize", text: "A validated process intended to destroy all living germs. The curriculum describes boiling metal tools for 20 minutes." },
    ] },
    { type: "compare", title: "Know the hygiene levels", doLabel: "Meaning", dontLabel: "Remember", do: [
      "Cleaning removes visible soil and residue.",
      "Disinfection uses an appropriate product to reduce harmful microorganisms.",
      "Sterilization is a validated process intended to destroy all forms of microbial life.",
    ], dont: [
      "A quick wipe is not a replacement for cleaning.",
      "Follow the disinfectant label, including contact time.",
      "Boiling is not automatically a validated sterilization method; follow local rules and approved equipment guidance.",
    ] },

    { type: "heading", text: "Put the steps in order" },
    { type: "steps", items: [
      { title: "Clean first", text: "Remove visible dirt and product residue before applying a disinfectant." },
      { title: "Disinfect correctly", text: "Use a product approved for the item and follow its dilution and contact-time instructions." },
      { title: "Use single-use supplies once", text: "Discard items such as pads, micro-brushes and wands after the client." },
      { title: "Store reprocessed tools safely", text: "Once tools are fully dry, keep them in a clean, closed container." },
    ] },
    { type: "callout", tone: "mistake", title: "Do not guess at sterilization", text: "Do not rely on boiling tools for sterilization unless the applicable professional standard specifically validates that process. Follow local regulations and equipment instructions." },
    { type: "checkpoint", question: "What should happen before disinfecting a reusable tool?", options: ["Remove visible soil and residue", "Put it straight into storage", "Wipe it on a towel"], answer: 0, explain: "Cleaning away visible soil first helps disinfection work as intended. Follow the product instructions for the next steps." },
  ]
);

const L7 = lesson(
  "Prepare Yourself and Your Client",
  "A calm, hygienic routine to follow before you work near someone’s eyes.",
  [
    { type: "heading", text: "Start with clean hands" },
    { type: "text", text: "Your hands touch everything: the tools, the pads, the client’s face. So the routine starts with them. Wash your hands thoroughly with soap and water before the service and between clients." },
    { type: "text", text: "Keep your station organized so that clean items and used items never mix. A good rule is to give each group its own side of the station." },
    { type: "text", text: "Here is the whole preparation routine in one list. Tick each step off as you read it:" },
    { type: "list", style: "checklist", items: [
      "Wash hands before the service",
      "Prepare a clean bed and workstation",
      "Set out clean tools and fresh single-use supplies",
      "Keep used items separate from clean supplies",
      "Explain the service and check that the client is comfortable",
    ] },
    { type: "callout", tone: "tip", title: "Make it a routine", text: "Use the same preparation sequence every time. A repeatable routine makes it easier to notice anything missing or out of place." },
    { type: "checkpoint", question: "Why keep used items separate from clean supplies?", options: ["To prevent cross-contamination", "To make the station look fuller", "It does not matter"], answer: 0, explain: "Keeping used items apart helps prevent contamination of clean tools and supplies." },
  ]
);

const L8 = lesson(
  "Clean Between Every Client",
  "Reset your station after each appointment instead of rushing into the next one.",
  [
    { type: "heading", text: "Reset the station" },
    { type: "text", text: "A clean setup is not complete until the station has been reset after the client leaves. It is tempting to rush into the next appointment, but this is the moment cross-contamination happens. Follow the five steps in order:" },
    { type: "steps", items: [
      { title: "Discard disposables", text: "Throw away used single-use pads, brushes and other disposable items." },
      { title: "Clean reusable tools", text: "Remove visible residue using the method appropriate for the tool." },
      { title: "Disinfect as directed", text: "Use a suitable disinfectant and allow the full label contact time." },
      { title: "Dry and store", text: "Let reprocessed tools dry fully, then store them in a clean, closed place." },
      { title: "Wipe the station", text: "Clean the bed and surfaces touched during the service with an appropriate product." },
    ] },
    { type: "text", text: "“Contact time” simply means how long the disinfectant must stay wet on the tool to do its job. If the label says a number of minutes, that is the minimum, not a suggestion." },
    { type: "callout", tone: "key", title: "Leave time to reset", text: "Build cleaning time into your appointment schedule. Do not shorten a product’s contact time to fit in another client." },
    { type: "checkpoint", question: "When should single-use items be discarded?", options: ["After each client", "At the end of the month", "Only when they look dirty"], answer: 0, explain: "Single-use supplies are discarded after each client and must not be reused." },
  ]
);

const Q2 = quiz(
  "Quiz: Tools and a Clean Workspace",
  "Five questions on your toolkit and hygiene routine. Score 70% to pass.",
  [
    { q: "What are the two pairs of tweezers used for?", options: ["Both only place extensions", "One isolates; one picks up and places", "One pair is disposable"], answer: 1, explain: "One pair isolates a natural lash, while the other picks up and places an extension." },
    { q: "What should happen before disinfecting a reusable tool?", options: ["Visible soil should be cleaned off", "It should be put away wet", "It should be wiped on clothing"], answer: 0, explain: "Clean away visible soil first, then follow the disinfectant’s directions." },
    { q: "What is the safest approach to sterilizing tools?", options: ["Assume boiling always sterilizes", "Follow local requirements and validated equipment instructions", "Use any household appliance"], answer: 1, explain: "A process must be appropriate and validated. Follow professional requirements and equipment guidance." },
    { q: "What does disinfectant “contact time” mean?", options: ["How long the product must stay on the tool to work", "How long the client waits", "How long the tool is stored"], answer: 0, explain: "Follow the label, including contact time. Do not shorten it to fit in another client." },
    { q: "When are single-use supplies discarded?", options: ["After each client", "Once a week", "When they look dirty"], answer: 0, explain: "Single-use supplies are discarded after each client and must not be reused." },
  ]
);

// ---------------------------------------------------------------------------
// Module 4: Train your hands
// ---------------------------------------------------------------------------

const L9 = lesson(
  "The Practice Bridge",
  "How to train your hands to stay steady, from tweezer grip to sponge and mannequin drills.",
  [
    { type: "heading", text: "Practice is part of the service" },
    { type: "text", text: "Before touching a real person, you must train your hands to stay steady and build muscle memory. Think of this lesson as a bridge: on one side is everything you have learned by reading, and on the other is working on a live model. Practice is how you cross it." },
    { type: "text", text: "Work through the drills in order, each one a little harder than the last:" },
    { type: "steps", items: [
      { title: "Tool control: hold the tweezers comfortably", text: "Learn how to hold your tweezers properly. A relaxed grip reduces tension and avoids hand cramps during long appointments." },
      { title: "Pick up an extension", text: "Use the placement tweezers to lift one extension cleanly." },
      { title: "Sponge drill", text: "Practise picking up extensions and placing them straight up on a makeup sponge." },
      { title: "Mannequin drill", text: "Practise on a plastic mannequin head, to learn how to isolate one single lash at a time." },
    ] },
    { type: "text", text: "Why a sponge first? A sponge does not blink, flinch or get uncomfortable. It lets you focus on one thing, the movement of your hands. The mannequin then adds the next challenge: finding and isolating a single lash among many." },
    { type: "callout", tone: "key", title: "Do not rush to a live model", text: "The curriculum recommends **50–100 hours of active practice** for fine motor control and muscle memory. Use qualified supervision and follow your training before working independently." },
    { type: "checkpoint", question: "What is the purpose of sponge and mannequin drills?", options: ["To replace hygiene procedures", "To practise pickup, placement and isolation before working on a person", "To make glue cure faster"], answer: 1, explain: "Drills help build controlled movements and isolation skills before live application." },
  ]
);

const L10 = lesson(
  "Glue Control and Stickies",
  "How much glue is right, what “stickies” are and why they hurt.",
  [
    { type: "heading", text: "Control the adhesive" },
    { type: "text", text: "Glue control means learning exactly how much glue to use. Practise dipping an extension consistently, so that it carries an appropriate amount of professional adhesive. It is a balance, and it can go wrong in two directions:" },
    { type: "compare", title: "Too little or too much?", doLabel: "What you want", dontLabel: "What can go wrong", do: [
      "A controlled amount on the extension",
      "A neat placement on one isolated natural lash",
      "A comfortable, clean attachment",
    ], dont: [
      "Too little adhesive can lead to poor attachment and early shedding.",
      "Too much adhesive can create a hard lump.",
      "Excess adhesive can make nearby lashes stick together.",
    ] },
    { type: "text", text: "In short: **too little, and the lash falls off. Too much, and the lashes stick together in a hard, damaging lump.**" },
    { type: "flip", prompt: "Quick check", front: "What can happen if too much glue is used?", back: "It can form a hard lump and cause nearby lashes to stick together." },

    { type: "heading", text: "What is a “sticky”?" },
    { type: "text", text: "A **sticky** happens when lashes that should move independently become glued together. It is one of the most common mistakes for beginners, so you will meet it again when we talk about fixing problems." },
    { type: "text", text: "Why is it harmful? Natural lashes grow at different speeds. If two of them are glued together, one pulls against the other as it grows, and this can cause discomfort and damage." },
    { type: "callout", tone: "mistake", title: "Avoid stickies", text: "Lashes stuck together can pull against each other as they grow at different rates, causing discomfort and potential damage." },
    { type: "checkpoint", question: "What is a risk of using too much adhesive?", options: ["Nearby lashes may stick together", "The extension becomes weightless", "The client needs less aftercare"], answer: 0, explain: "Excess adhesive can form hard bonds between lashes, leading to pulling and discomfort." },
  ]
);

// ---------------------------------------------------------------------------
// Module 5: Design the set
// ---------------------------------------------------------------------------

const L11 = lesson(
  "Read the Eye Before Choosing a Map",
  "Look at the eye shape and position first, because every client is different.",
  [
    { type: "heading", text: "Every client is different" },
    { type: "text", text: "You are now ready to plan a set. Planning starts by looking, not by picking lashes. Look at the client’s eye shape and positioning before planning a style. A client may have a mixture of eye shapes, so choose a map for the individual, rather than applying the same design to everyone." },
    { type: "figure", url: M + "eye-shapes.webp", caption: "Common eye shapes to consider when planning a set" },
    { type: "text", text: "Spend a moment with the picture above. Can you see how the eyes differ in how far apart they sit, how round or long they are, and how much of the lid is visible? Those differences are what you are reading." },
    { type: "text", text: "A **lash map** is the plan that comes from that reading. It shows how lengths are placed across the lash line. The next lesson shows three maps, and which eyes each one suits." },
    { type: "checkpoint", question: "What is the purpose of a lash map?", options: ["To plan how lengths are placed across the lash line", "To replace isolation", "To clean the tweezers"], answer: 0, explain: "A lash map guides the placement and length pattern across the lash line." },
  ]
);

const L12 = lesson(
  "Cat Eye, Doll Eye and Wispy Maps",
  "Three popular lash maps, where each one puts the longest lengths and the eyes each one suits.",
  [
    { type: "heading", text: "Cat-eye map" },
    { type: "figure", url: M + "cat-eye.webp", caption: "Cat-eye styling example" },
    { type: "text", text: "A cat-eye map places the longest lengths toward the **outer edge** to create a wider, elongated look. It can suit almond, close-set and round eyes." },
    { type: "text", text: "Look at the map below. Each zone carries a number, which is the extension length for that part of the lash line. See how the numbers grow towards the outer corner." },
    { type: "figure", url: M + "cat-map.webp", caption: "Cat-eye lash map showing lengths across the lash line" },

    { type: "heading", text: "Doll-eye map" },
    { type: "figure", url: M + "doll-eye.webp", caption: "Doll-eye styling example" },
    { type: "text", text: "A doll-eye map places longer lengths through the **middle** to make the eyes look more open. It can suit almond and wide-set eyes." },
    { type: "figure", url: M + "doll-map.webp", caption: "Doll-eye lash map showing lengths across the lash line" },

    { type: "heading", text: "Wispy map" },
    { type: "text", text: "A wispy set uses longer spikes at intervals through the design for a textured finish. It can suit almond and round eyes. The practice template below shows spiked maps you can use to rehearse the design." },
    { type: "figure", url: M + "wispy-map.webp", caption: "Example lash maps for practising a spiked, wispy design" },

    { type: "heading", text: "Check your understanding" },
    { type: "flip", prompt: "Which map?", frontLabel: "Question", backLabel: "Answer", front: "Which map puts the longest lengths toward the outer edge?", back: "The **cat-eye map** places the longest lengths toward the outer edge." },
    { type: "flip", prompt: "Which styles suit almond eyes?", frontLabel: "Question", backLabel: "Answer", front: "Which of these styles suit almond eyes?", back: "The course lists all three: **cat eye, doll eye and wispy.**" },
    { type: "checkpoint", question: "Which style places the longest lengths through the middle?", options: ["Cat eye", "Doll eye", "Wispy"], answer: 1, explain: "The doll-eye map places longer lengths through the middle to create a more open look." },
  ]
);

const L13 = lesson(
  "Choosing Lengths and Curls",
  "How long an extension can safely be, and when to choose C curl or D curl.",
  [
    { type: "heading", text: "Choose a safe length" },
    { type: "text", text: "Your map tells you where the lengths go. This lesson is about how long they can safely be. Respect the natural lash: the course guidance is to choose an extension **shorter than the natural lash, or up to 3 mm longer,** and **never more than 50% longer.**" },
    { type: "text", text: "Here is an example. If a natural lash is 8 mm long, an extension up to 11 mm (3 mm longer) is within the guidance. Half of 8 is 4, so 12 mm would be the absolute ceiling, and you would stay below it." },
    { type: "callout", tone: "key", title: "Respect the natural lash", text: "Follow your practical training and select only what the natural lash can safely support. When unsure, compare the extension against the natural lash and plan lengths before you begin. Use the lash map to place the planned lengths consistently." },
    { type: "checkpoint", question: "What is the maximum length guidance taught in this course?", options: ["Up to 3 mm longer and never over 50% longer", "Up to twice the natural lash length", "Any length the client requests"], answer: 0, explain: "The course guidance is shorter than the natural lash or up to 3 mm longer, never more than 50% longer." },

    { type: "heading", text: "Choosing a curl" },
    { type: "text", text: "The curl is the shape of the extension itself, and it decides how much lift the lashes get. To choose, look at the direction the client’s natural lashes grow. The two common curls are C and D." },

    { type: "heading", text: "C curl" },
    { type: "text", text: "C curl is a commonly used curl that can create an open-eye effect on lashes with a slight natural curl. On slightly downward-angled lashes, it can give a lifted appearance." },
    { type: "figure", url: M + "c-curl.webp", caption: "C curl profile" },
    { type: "compare", title: "C curl", doLabel: "Can suit", dontLabel: "Use care", do: ["Lashes with a slight natural curl", "Slightly downward-angled lashes"], dont: ["Heavily downward-angled lashes may need a different curl, based on professional assessment"] },

    { type: "heading", text: "D curl" },
    { type: "text", text: "D curl is more curled than C curl and creates a noticeable lift. The course advises against D curl on upward-angled lashes or hooded eyelids." },
    { type: "figure", url: M + "d-curl.webp", caption: "D curl profile" },
    { type: "compare", title: "D curl", doLabel: "Can suit", dontLabel: "Avoid, per course guidance", do: ["Straight natural lashes", "Downward-angled natural lashes"], dont: ["Upward-angled lashes", "Hooded eyelids"] },
    { type: "checkpoint", question: "Which curl does the course advise against on hooded eyelids?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "The course advises against D curl on upward-angled lashes or hooded eyelids." },
  ]
);

const Q3 = quiz(
  "Quiz: Train Your Hands and Design the Set",
  "Six questions on practice, glue, maps, lengths and curls. Score 70% to pass.",
  [
    { q: "Where should you practise placement and isolation before working on a person?", options: ["On a sponge and mannequin", "On a client’s eyelid", "On used tools"], answer: 0, explain: "Sponge and mannequin drills help build control and isolation skills before live practice." },
    { q: "What can too much adhesive cause?", options: ["Lashes to stick together", "The lash cycle to stop", "The need for no cleaning"], answer: 0, explain: "Too much adhesive can form hard lumps and bond neighbouring lashes together." },
    { q: "Why are stickies harmful?", options: ["Lashes grow at different speeds, so stuck lashes pull against each other", "They make the set look shorter", "They make glue dry faster"], answer: 0, explain: "Natural lashes grow at different speeds. If they stay bonded together, one lash can pull on another and cause pain or damage." },
    { q: "Which map places the longest lengths toward the outer edge?", options: ["Cat eye", "Doll eye", "Wispy"], answer: 0, explain: "A cat-eye map places the longest lengths toward the outer edge for a more elongated look." },
    { q: "What is the maximum length guidance taught in this course?", options: ["Up to 3 mm longer and never more than 50% longer", "Twice the natural lash", "Any length"], answer: 0, explain: "Shorter than the natural lash, or up to 3 mm longer, and never more than 50% longer." },
    { q: "Which curl does the course advise against on hooded eyelids?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "The course advises against D curl on hooded eyelids or upward-angled lashes." },
  ]
);

// ---------------------------------------------------------------------------
// Module 6: The lash service
// ---------------------------------------------------------------------------

const L14 = lesson(
  "Prepare and Apply a Set Safely",
  "Protect the lower lashes, then place one extension on one natural lash at a time.",
  [
    { type: "heading", text: "Protect the lower lashes first" },
    { type: "text", text: "Everything you have learned comes together now. When you move to a live model, making sure the client is safe and comfortable is your top priority." },
    { type: "text", text: "After preparing the client and the station, place soft under-eye gel pads, and use suitable medical tape to cover the lower lashes. Position the products carefully so they do not irritate the eyes." },
    { type: "text", text: "Why cover the lower lashes? So you do not accidentally glue their eyes shut." },

    { type: "heading", text: "One natural lash at a time" },
    { type: "text", text: "For a right-handed artist, the curriculum describes it like this: your left hand separates just one real eyelash, and your right hand dips an extension in the glue and gently places it on the isolated lash. Follow the four steps in order:" },
    { type: "steps", items: [
      { title: "Separate one natural lash", text: "Use the isolation tweezers to create clear space around a single lash." },
      { title: "Pick up one extension", text: "Use the placement tweezers and a controlled amount of professional adhesive." },
      { title: "Place on the isolated lash", text: "Attach gently to the natural lash, not the skin, leaving about **1–2 mm** from the eyelid." },
      { title: "Check your work", text: "Make sure the extension is neat and not bonded to a neighbouring natural lash." },
    ] },
    { type: "text", text: "Each of these steps connects to something you already know. The isolation step prevents stickies, the controlled glue is your glue control, and the 1–2 mm gap is the spacing rule." },
    { type: "callout", tone: "key", title: "Comfort comes first", text: "Do not rush or continue through discomfort. Work only within your training and applicable professional requirements." },
    { type: "checkpoint", question: "What must be isolated before placing an extension?", options: ["One natural lash", "The entire eyelid", "Several neighbouring lashes together"], answer: 0, explain: "Isolating one natural lash helps avoid stickies and ensures the extension is attached to the correct lash." },
  ]
);

const L15 = lesson(
  "Fixing Stickies",
  "Spot a sticky early and separate it before it sets.",
  [
    { type: "heading", text: "Things will go wrong, and that is normal" },
    { type: "text", text: "Things will inevitably go wrong when you are learning. What matters is that you know how to fix them. The most common problem is a sticky, which you met in the glue control lesson." },
    { type: "text", text: "A sticky happens when lashes that should move independently become glued together. Check your work as you go, and carefully separate any sticky **immediately,** before it sets." },
    { type: "callout", tone: "mistake", title: "Do not leave lashes stuck", text: "Natural lashes grow at different speeds. If they stay bonded together, one lash can pull on another and cause pain or damage." },
    { type: "text", text: "Picture two people tied together by the wrist, who then try to walk at different speeds. One always pulls the other. That is exactly what happens to two stuck lashes as they grow." },
    { type: "steps", items: [
      { title: "Check as you go", text: "Look at each extension after you place it and make sure it has not touched a neighbour." },
      { title: "Spot a sticky", text: "Two lashes that should move independently are bonded together." },
      { title: "Separate it carefully, straight away", text: "Pull them apart before the glue sets. Do not leave them for later." },
    ] },
    { type: "checkpoint", question: "What should you do when you notice a sticky?", options: ["Separate the lashes carefully and immediately", "Leave it until the end of the set", "Add more glue"], answer: 0, explain: "If two real lashes get glued together, carefully pull them apart immediately, before it sets." },
  ]
);

const L16 = lesson(
  "Removing Extensions Safely",
  "Why you never pull extensions off, and the careful way to take them down.",
  [
    { type: "heading", text: "Never pull" },
    { type: "text", text: "Sooner or later every set has to come off. The rule for removal is simple: **never pull or pick off old extensions.** Pulling can take the natural lash with it. Instead, let a professional glue remover do the work." },
    { type: "callout", tone: "key", title: "Never pull", text: "Pulling or picking off extensions can damage natural lashes. Let professional remover do its job and follow its instructions." },

    { type: "heading", text: "The removal steps" },
    { type: "steps", items: [
      { title: "Protect the skin", text: "Use suitable eye pads and protection to keep remover away from skin and eyes." },
      { title: "Apply professional remover", text: "Follow the remover’s label and your training. The curriculum describes waiting exactly **5 minutes;** the product’s instructions take priority." },
      { title: "Slide extensions away gently", text: "Once released, gently slide the old extensions off without pulling or picking at the natural lashes." },
      { title: "Clean away residue", text: "Remove leftover product and rinse as directed before any further service." },
    ] },
    { type: "text", text: "Why wait the full 5 minutes? The remover needs that time to loosen the glue. If you start sliding too early, the extensions are still holding on, and you will be tempted to pull. Patience here protects the natural lash." },
    { type: "checkpoint", question: "What should you do if extensions do not slide off during removal?", options: ["Pull harder", "Stop and follow the remover instructions; never force them off", "Pick them off one by one"], answer: 1, explain: "Forcing extensions off can damage natural lashes. Follow the product instructions and do not pull or pick." },
  ]
);

// ---------------------------------------------------------------------------
// Module 7: Aftercare and business
// ---------------------------------------------------------------------------

const L17 = lesson(
  "Teaching Aftercare",
  "The simple rules clients follow at home, and why oil is the enemy.",
  [
    { type: "heading", text: "The appointment does not end at the door" },
    { type: "text", text: "Once your client walks out, how long her set lasts depends partly on her. That is why aftercare is part of the service. Show clients how to gently wash their extensions each night, using a suitable, oil-free lash cleanser." },
    { type: "callout", tone: "note", title: "Why avoid oils?", text: "Oily makeup and lotions can weaken the adhesive bond, because oil melts the lash glue and contributes to premature shedding." },
    { type: "compare", title: "Client aftercare", doLabel: "Do", dontLabel: "Avoid", do: [
      "Wash gently each night with an oil-free lash cleanser.",
      "Follow the aftercare instructions you provide.",
      "Contact the artist if something feels uncomfortable.",
    ], dont: [
      "Use oily makeup or lotions around the extensions.",
      "Pick or pull at extensions.",
      "Ignore discomfort or an unexpected reaction.",
    ] },
    { type: "checkpoint", question: "What should clients use to wash their extensions?", options: ["An oily makeup remover", "A suitable oil-free lash cleanser", "Any household cleaner"], answer: 1, explain: "The curriculum recommends gentle nightly washing with an oil-free lash cleanser." },
  ]
);

const L18 = lesson(
  "Your Lash Business",
  "Client forms, setting expectations, and simple ways to find your first clients.",
  [
    { type: "heading", text: "Turn skill into a safe, profitable business" },
    { type: "text", text: "You now have the technical skill. The last step is turning it into a business that is both profitable and safe. Two foundations matter most: paperwork, and finding clients." },

    { type: "heading", text: "Client forms" },
    { type: "text", text: "Have every client sign an intake form and waiver before you start working. It states that she understands the rules, the risks and the aftercare procedures. Explain the service, its risks and the aftercare clearly, so that nothing comes as a surprise." },

    { type: "heading", text: "Finding clients" },
    { type: "text", text: "Set up simple, targeted social media posts or ads on Facebook and Instagram that show off pictures of your best work to potential clients in your local area." },
    { type: "list", style: "checklist", items: [
      "Have each client complete an intake form and waiver before the service.",
      "Explain the service, its risks and aftercare clearly.",
      "Share your best work through targeted local Facebook and Instagram posts or ads.",
    ] },
    { type: "callout", tone: "key", title: "Professionalism is part of the service", text: "Clear consultation, client paperwork, careful technique and aftercare help clients understand what to expect." },
    { type: "checkpoint", question: "What should a client complete before a service?", options: ["An intake form and waiver", "A social media post", "A product review"], answer: 0, explain: "The curriculum calls for client intake and waiver paperwork before starting the service." },
  ]
);

const L19 = lesson(
  "You’re Ready to Start",
  "Everything you have learned, in one place, before the final assessment.",
  [
    { type: "heading", text: "Look how far you have come" },
    { type: "text", text: "You began by learning that glue and extensions must never touch the skin. Now you understand the natural lash, your tools, how to keep a clean workspace, how to train your hands, how to design a set, how to apply and remove extensions safely, and how to look after your clients. Tick off what you can now do:" },
    { type: "list", style: "checklist", items: [
      "Explain how an extension attaches, and the 1–2 mm spacing rule",
      "Choose a healthy natural lash, and leave baby lashes alone",
      "Tell classic, hybrid and volume apart",
      "Keep tools and station clean, disinfected and safe",
      "Practise on a sponge and mannequin before a live model",
      "Plan a cat-eye, doll-eye or wispy map, with safe lengths and the right curl",
      "Apply one extension to one natural lash, fix stickies and remove extensions without pulling",
      "Teach aftercare and run your business with forms and waivers",
    ] },
    { type: "callout", tone: "key", title: "Next step", text: "Take the final assessment, then keep practising. The curriculum recommends 50–100 hours of hands-on practice before you work independently." },
  ]
);

const FINAL = quiz(
  "Final Assessment",
  "Thirteen questions across the whole course. Score 70% to pass.",
  [
    { q: "Where should an eyelash extension be attached?", options: ["To the eyelid skin", "To one natural lash, leaving about 1–2 mm from the eyelid", "Across several natural lashes"], answer: 1, explain: "Attach to an individual natural lash, never to skin, and keep glue and extension away from the eyelid." },
    { q: "Why should fragile baby lashes be left alone?", options: ["They may be too weak to support an extension", "They are the longest lashes", "They cannot shed"], answer: 0, explain: "New growth is delicate and may be damaged by the weight of an extension." },
    { q: "About how many natural lashes may a person lose each day?", options: ["1–4", "20–30", "None"], answer: 0, explain: "Losing around 1–4 lashes a day is normal as part of the natural lash cycle." },
    { q: "What are the two pairs of tweezers used for?", options: ["Both only place extensions", "One isolates; one picks up and places", "One pair is disposable"], answer: 1, explain: "One pair isolates a natural lash, while the other picks up and places an extension." },
    { q: "What should happen before disinfecting a reusable tool?", options: ["Visible soil should be cleaned off", "It should be put away wet", "It should be wiped on clothing"], answer: 0, explain: "Clean away visible soil first, then follow the disinfectant’s directions." },
    { q: "What is the safest approach to sterilizing tools?", options: ["Assume boiling always sterilizes", "Follow local requirements and validated equipment instructions", "Use any household appliance"], answer: 1, explain: "A process must be appropriate and validated. Follow professional requirements and equipment guidance." },
    { q: "Where should you practise placement and isolation before working on a person?", options: ["On a sponge and mannequin", "On a client’s eyelid", "On used tools"], answer: 0, explain: "Sponge and mannequin drills help build control and isolation skills before live practice." },
    { q: "What can too much adhesive cause?", options: ["Lashes to stick together", "The lash cycle to stop", "The need for no cleaning"], answer: 0, explain: "Too much adhesive can form hard lumps and bond neighbouring lashes together." },
    { q: "What should you do if extensions are stuck during removal?", options: ["Pull until they release", "Use professional remover as directed and never force them", "Cut the natural lashes"], answer: 1, explain: "Follow the remover’s instructions and never pull or pick extensions off." },
    { q: "What should clients use for nightly lash cleansing?", options: ["A suitable oil-free lash cleanser", "Oily lotion", "Household soap or cleaner"], answer: 0, explain: "The curriculum recommends gentle nightly washing with a suitable oil-free lash cleanser." },
    { q: "What should a client complete before a service?", options: ["An intake form and waiver", "A social media post", "A product review"], answer: 0, explain: "The curriculum calls for client intake and waiver paperwork before starting the service." },
    { q: "Which map places the longest lengths toward the outer edge?", options: ["Cat eye", "Doll eye", "Wispy"], answer: 0, explain: "A cat-eye map places the longest lengths toward the outer edge for a more elongated look." },
    { q: "Which curl does the course advise against on hooded eyelids?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "The course advises against D curl on hooded eyelids or upward-angled lashes." },
  ]
);

export const CLASSIC_SET_ESSENTIALS = {
  slug: "classic-set-essentials",
  title: "Classic Set Essentials",
  subtitle: "A safe foundation for every aspiring lash artist",
  description:
    "Learn lash fundamentals, hygiene, practice drills, application, removal, aftercare, and the basics of building a lash business.",
  about:
    "Eyelash extensions are single synthetic fibers attached to a person’s natural eyelashes to create more length and fullness. This course gives you the safe foundation for doing that work: how the natural lash grows and sheds, the tools on a lash station, how to keep a clean workspace, how to train your hands before you touch a person, how to design a set, and how to apply, fix and remove extensions safely.\n\n" +
    "You will finish with aftercare for your clients and the first steps of running a lash business. The course is written to be read like a book, with quick questions inside each lesson and a short quiz after each part.\n\n" +
    "This is foundational theory, not a substitute for accredited training or supervised hands-on practice. The curriculum recommends 50–100 hours of hands-on practice.",
  duration_label: "Self-paced",
  level: "beginner",
  category: "beginner",
  course_type: "story",
  reading_view: "article",
  is_free: true,
  price: 0,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  sort_order: 10,
  learn_points: [
    "Attach extensions safely: one natural lash, 1–2 mm from the eyelid",
    "Keep your tools and workspace clean enough to work beside the eyes",
    "Practise, apply, fix stickies and remove extensions without pulling",
    "Teach aftercare and set up the basics of a lash business",
  ],
  modules: [
    { title: "Start Here", lessons: [L1] },
    { title: "Meet the Lash", lessons: [L2, L3, L4, Q1] },
    { title: "Tools and a Clean Workspace", lessons: [L5, L6, L7, L8, Q2] },
    { title: "Train Your Hands", lessons: [L9, L10] },
    { title: "Design the Set", lessons: [L11, L12, L13, Q3] },
    { title: "The Lash Service", lessons: [L14, L15, L16] },
    { title: "Aftercare and Your Business", lessons: [L17, L18, L19, FINAL] },
  ],
};
