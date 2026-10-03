// Classic Set Essentials: adapted from course content/eyelash_extension_course_curriculum.md.
// Story mode turns these short, single-idea blocks into screens; the same blocks also work in article view.
// This is foundational theory, not a substitute for accredited training or supervised hands-on practice.
//
// Generate the Supabase seed with:
// node scripts/course-to-sql.mjs src/data/courses/classic-set-essentials.js > supabase/migrations/0007_course_classic_set_essentials.sql

const M = "/course-media/classic-set-essentials/";

const rm = (blocks) => Math.max(3, Math.round(blocks.length * 0.22));

const lesson = (title, summary, blocks, extra = {}) => ({
  title,
  kind: "reading",
  summary,
  is_preview: true,
  read_minutes: rm(blocks),
  blocks,
  ...extra,
});

const L1 = lesson(
  "Welcome to lash artistry",
  "What this course covers, and why technique and practice must always be built around safety.",
  [
    { type: "heading", text: "Your lash journey starts here" },
    { type: "text", text: "Eyelash extensions are single synthetic fibers attached to a person's natural eyelashes to create more length and fullness." },
    { type: "text", text: "This course introduces the foundations: lash knowledge, a clean setup, steady practice, safe application, aftercare, and the first steps of running a lash business." },
    { type: "quote", text: "A beautiful set starts with care for the person wearing it." },
    { type: "callout", tone: "key", title: "Practice before clients", text: "This course provides foundational knowledge. The curriculum recommends **50–100 hours of hands-on practice** to build control and muscle memory before working independently." },
    { type: "checkpoint", question: "What is the main purpose of this course?", options: ["To replace supervised practice", "To introduce foundational knowledge and safety", "To guarantee a profitable business"], answer: 1, explain: "The course covers foundational knowledge. Lash artistry also requires substantial, supervised hands-on practice." },
  ]
);

const L2 = lesson(
  "How extensions work",
  "Understand what an extension is and the essential space between the lash line and the attachment.",
  [
    { type: "heading", text: "An extension attaches to a lash" },
    { type: "text", text: "An eyelash extension is a synthetic fiber attached to an individual natural eyelash. It must not be glued to the eyelid or skin." },
    { type: "figure", url: M + "anatomy.webp", caption: "Parts of the human eye" },
    { type: "steps", items: [
      { title: "Find one healthy natural lash", text: "The extension is attached to the natural lash, not the skin." },
      { title: "Leave a small gap", text: "Keep the attachment about **1–2 mm from the eyelid** so glue and extension do not touch skin." },
      { title: "Check the placement", text: "The extension should sit neatly on the natural lash and allow it to move freely." },
    ] },
    { type: "callout", tone: "mistake", title: "Never attach to skin", text: "Glue or extensions touching the eyelid can irritate the skin and interfere with natural movement." },
    { type: "flip", prompt: "True or false?", front: "The extension should touch the eyelid so it stays secure.", back: "False. Attach to the natural lash and leave about **1–2 mm** between the attachment and eyelid." },
    { type: "checkpoint", question: "Where should an extension be attached?", options: ["To the eyelid skin", "To an individual natural lash, leaving a small gap from the eyelid", "Across several natural lashes"], answer: 1, explain: "Attach to one natural lash, not skin, and keep the glue and extension away from the eyelid." },
  ]
);

const L3 = lesson(
  "Natural lash growth and safe selection",
  "Learn why shedding is normal and why fragile new lashes should not carry extensions.",
  [
    { type: "heading", text: "Lashes grow and shed" },
    { type: "text", text: "Natural eyelashes move through a growth cycle. Losing around **1–4 lashes a day** is normal, so extensions naturally shed along with the lashes they are attached to." },
    { type: "text", text: "A newly growing lash is sometimes called a **baby lash**. It is still delicate and may not be strong enough to support an extension." },
    { type: "callout", tone: "key", title: "Choose a healthy lash", text: "Work only on a healthy, mature natural lash with enough strength to support the extension. Do not add weight to fragile new growth." },
    { type: "steps", items: [
      { title: "Observe the natural lash", text: "Check its condition and maturity before selecting it." },
      { title: "Match the extension responsibly", text: "Choose an extension that the natural lash can safely support, following your practical training." },
      { title: "Leave unsuitable lashes alone", text: "Do not lash fragile new growth or a lash that cannot safely carry an extension." },
    ] },
    { type: "heading", text: "Classic, hybrid, and volume" },
    { type: "text", text: "Lash styles differ in how extensions are attached and the look they create. Choose a style and weight that are appropriate for the client's natural lashes." },
    { type: "figure", url: M + "classic-photo.webp", caption: "A classic set" },
    { type: "text", text: "**Classic** uses a **1:1 ratio**: one extension on one natural lash. It adds length rather than a fan of volume." },
    { type: "figure", url: M + "classic-ratio.webp", caption: "Classic: one extension to one natural lash" },
    { type: "figure", url: M + "hybrid-photo.webp", caption: "A hybrid set" },
    { type: "text", text: "**Hybrid** combines classic extensions and volume fans for a blend of length and texture." },
    { type: "figure", url: M + "hybrid-ratio.webp", caption: "Hybrid: classic extensions mixed with fans" },
    { type: "figure", url: M + "volume-photo.webp", caption: "A volume set" },
    { type: "text", text: "**Volume** uses fans of typically **2–6 thin extensions** to create a fuller look. The natural lash must be able to support the fan safely." },
    { type: "figure", url: M + "volume-ratio.webp", caption: "Volume fans placed on natural lashes" },
    { type: "checkpoint", question: "Which style uses one extension on one natural lash?", options: ["Classic", "Hybrid", "Volume"], answer: 0, explain: "Classic uses a 1:1 ratio: one extension attached to one natural lash." },
    { type: "checkpoint", question: "What does a hybrid set combine?", options: ["Classic extensions and volume fans", "Only long extensions", "Extensions and eye pads"], answer: 0, explain: "Hybrid combines classic extensions with volume fans." },
    { type: "checkpoint", question: "Why must volume fans be selected carefully?", options: ["The natural lash must safely support their weight", "They should always touch the eyelid", "They are attached to several natural lashes"], answer: 0, explain: "The natural lash must be able to support the fan without undue strain." },
    { type: "checkpoint", question: "Why should fragile baby lashes be left alone?", options: ["They shed less often", "They may be too weak to support the extension", "They make glue dry faster"], answer: 1, explain: "New growth is delicate. Added weight can strain or damage a lash that is not strong enough." },
  ]
);

const L4 = lesson(
  "Build your professional toolkit",
  "Know the core tools before practicing or preparing a service.",
  [
    { type: "heading", text: "Prepare the right tools" },
    { type: "text", text: "A tidy, prepared station helps you work carefully and avoid searching for supplies during a service." },
    { type: "list", style: "checklist", items: [
      "Isolation tweezers to separate one natural lash",
      "Placement tweezers to pick up and place an extension",
      "Professional lash primer",
      "Professional lash adhesive",
      "Professional adhesive remover",
      "Single-use items for each client",
    ] },
    { type: "callout", tone: "note", title: "Use products as directed", text: "Use professional products according to their labels and your training. Do not substitute household glue or remover." },
    { type: "flip", prompt: "Match the tool to the task", front: "What are the two pairs of tweezers for?", back: "One pair isolates a natural lash; the other picks up and places the extension." },
    { type: "checkpoint", question: "Why are two pairs of tweezers used?", options: ["One isolates; the other places the extension", "One is for the client and one is for the artist", "They are interchangeable decorations"], answer: 0, explain: "Isolation and placement are separate tasks, each requiring a suitable pair of tweezers." },
  ]
);

const L5 = lesson(
  "Set up a clean workspace",
  "Reduce infection and cross-contamination risks with a consistent hygiene routine.",
  [
    { type: "heading", text: "Cleanliness protects clients" },
    { type: "text", text: "Lash work happens close to the eyes. Keep the bed, station, tools, and anything the client touches clean, and follow local health requirements." },
    { type: "steps", items: [
      { title: "Clean first", text: "Remove visible dirt and product residue before applying a disinfectant." },
      { title: "Disinfect correctly", text: "Use a product approved for the item and follow its dilution and contact-time instructions." },
      { title: "Use single-use supplies once", text: "Discard items such as pads, micro-brushes, and wands after the client." },
      { title: "Store reprocessed tools safely", text: "Once tools are fully dry, keep them in a clean, closed container." },
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
    { type: "callout", tone: "mistake", title: "Do not guess at sterilization", text: "Do not rely on boiling tools for sterilization unless the applicable professional standard specifically validates that process. Follow local regulations and equipment instructions." },
    { type: "checkpoint", question: "What should happen before disinfecting a reusable tool?", options: ["Remove visible soil and residue", "Put it straight into storage", "Wipe it on a towel"], answer: 0, explain: "Cleaning away visible soil first helps disinfection work as intended. Follow the product instructions for the next steps." },
  ]
);

const L6 = lesson(
  "Prepare yourself and your client",
  "Build a calm, hygienic routine before you begin working near someone's eyes.",
  [
    { type: "heading", text: "Start with clean hands" },
    { type: "text", text: "Wash your hands thoroughly with soap and water before the service and between clients. Keep your station organized so clean and used items do not mix." },
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

const L7 = lesson(
  "Clean between every client",
  "Follow through after the service instead of rushing into the next appointment.",
  [
    { type: "heading", text: "Reset the station" },
    { type: "text", text: "A clean setup is not complete until the station has been reset after the client leaves." },
    { type: "steps", items: [
      { title: "Discard disposables", text: "Throw away used single-use pads, brushes, and other disposable items." },
      { title: "Clean reusable tools", text: "Remove visible residue using the method appropriate for the tool." },
      { title: "Disinfect as directed", text: "Use a suitable disinfectant and allow the full label contact time." },
      { title: "Dry and store", text: "Let reprocessed tools dry fully, then store them in a clean, closed place." },
      { title: "Wipe the station", text: "Clean the bed and surfaces touched during the service with an appropriate product." },
    ] },
    { type: "callout", tone: "key", title: "Leave time to reset", text: "Build cleaning time into your appointment schedule. Do not shorten a product's contact time to fit in another client." },
    { type: "checkpoint", question: "When should single-use items be discarded?", options: ["After each client", "At the end of the month", "Only when they look dirty"], answer: 0, explain: "Single-use supplies are discarded after each client and must not be reused." },
  ]
);

const L8 = lesson(
  "Practice and lash mapping",
  "Build steady hands, understand eye shapes, and learn how lash maps guide placement.",
  [
    { type: "heading", text: "Practice is part of the service" },
    { type: "text", text: "Before working on a person, practice picking up and placing extensions until your movements are controlled and repeatable." },
    { type: "steps", items: [
      { title: "Hold the tweezers comfortably", text: "Practice a relaxed grip to reduce tension and hand cramps." },
      { title: "Pick up an extension", text: "Use the placement tweezers to lift one extension cleanly." },
      { title: "Place it on a sponge", text: "Practice placing extensions straight and neatly on a makeup sponge." },
      { title: "Move to a mannequin", text: "Practice separating one lash at a time on a plastic mannequin head." },
    ] },
    { type: "callout", tone: "key", title: "Do not rush to a live model", text: "The curriculum recommends **50–100 hours of active practice** for fine motor control and muscle memory. Use qualified supervision and follow your training before working independently." },
    { type: "heading", text: "Read the eye before choosing a map" },
    { type: "text", text: "Look at the client's eye shape and positioning before planning a style. A client may have a mixture of eye shapes, so choose a map for the individual rather than applying the same design to everyone." },
    { type: "figure", url: M + "eye-shapes.webp", caption: "Common eye shapes to consider when planning a set" },
    { type: "heading", text: "Cat-eye map" },
    { type: "text", text: "A cat-eye map places the longest lengths toward the **outer edge** to create a wider, elongated look. It can suit almond, close-set, and round eyes." },
    { type: "figure", url: M + "cat-eye.webp", caption: "Cat-eye styling example" },
    { type: "figure", url: M + "cat-map.webp", caption: "Cat-eye lash map showing lengths across the lash line" },
    { type: "heading", text: "Doll-eye map" },
    { type: "text", text: "A doll-eye map places longer lengths through the **middle** to make the eyes look more open. It can suit almond and wide-set eyes." },
    { type: "figure", url: M + "doll-eye.webp", caption: "Doll-eye styling example" },
    { type: "figure", url: M + "doll-map.webp", caption: "Doll-eye lash map showing lengths across the lash line" },
    { type: "heading", text: "Wispy map" },
    { type: "text", text: "A wispy set uses longer spikes at intervals through the design for a textured finish. It can suit almond and round eyes." },
    { type: "figure", url: M + "wispy-map.webp", caption: "Example lash maps for practicing a spiked, wispy design" },
    { type: "flip", prompt: "Which styles suit almond eyes?", frontLabel: "Question", backLabel: "Answer", front: "Which of these styles suit almond eyes?", back: "The original course lists all three: **cat eye, doll eye, and wispy**." },
    { type: "flip", prompt: "Which map?", frontLabel: "Question", backLabel: "Answer", front: "Which map puts the longest lengths toward the outer edge?", back: "The **cat-eye map** places the longest lengths toward the outer edge." },
    { type: "checkpoint", question: "Which style places the longest lengths through the middle?", options: ["Cat eye", "Doll eye", "Wispy"], answer: 1, explain: "The doll-eye map places longer lengths through the middle to create a more open look." },
    { type: "checkpoint", question: "What is the purpose of a lash map?", options: ["To plan how lengths are placed across the lash line", "To replace isolation", "To clean the tweezers"], answer: 0, explain: "A lash map guides the placement and length pattern across the lash line." },
    { type: "checkpoint", question: "What is the purpose of sponge and mannequin drills?", options: ["To replace hygiene procedures", "To practice pickup, placement, and isolation before working on a person", "To make glue cure faster"], answer: 1, explain: "Drills help build controlled movements and isolation skills before live application." },
  ]
);

const L9 = lesson(
  "Choose lengths, curls, and adhesive",
  "Plan a suitable length and curl, and use adhesive carefully to avoid stickies.",
  [
    { type: "heading", text: "Choose a safe length" },
    { type: "callout", tone: "key", title: "Respect the natural lash", text: "The original course guidance is to choose an extension shorter than the natural lash or up to **3 mm longer**, and never more than **50% longer**. Follow your practical training and select only what the natural lash can safely support." },
    { type: "text", text: "When unsure, compare the extension against the natural lash and plan lengths before you begin. Use the lash map to place the planned lengths consistently." },
    { type: "checkpoint", question: "What is the maximum length guidance taught in this course?", options: ["Up to 3 mm longer and never over 50% longer", "Up to twice the natural lash length", "Any length the client requests"], answer: 0, explain: "The original course guidance is shorter than the natural lash or up to 3 mm longer, never more than 50% longer." },
    { type: "heading", text: "C curl" },
    { type: "text", text: "C curl is a commonly used curl that can create an open-eye effect on lashes with a slight natural curl. On slightly downward-angled lashes, it can give a lifted appearance." },
    { type: "figure", url: M + "c-curl.webp", caption: "C curl profile" },
    { type: "compare", title: "C curl", doLabel: "Can suit", dontLabel: "Use care", do: ["Lashes with a slight natural curl", "Slightly downward-angled lashes"], dont: ["Heavily downward-angled lashes may need a different curl, based on professional assessment"] },
    { type: "heading", text: "D curl" },
    { type: "text", text: "D curl is more curled than C curl and creates a noticeable lift. The original course advises against D curl on upward-angled lashes or hooded eyelids." },
    { type: "figure", url: M + "d-curl.webp", caption: "D curl profile" },
    { type: "compare", title: "D curl", doLabel: "Can suit", dontLabel: "Avoid per course guidance", do: ["Straight natural lashes", "Downward-angled natural lashes"], dont: ["Upward-angled lashes", "Hooded eyelids"] },
    { type: "checkpoint", question: "Which curl does the original course advise against on hooded eyelids?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "The original course advises against D curl on upward-angled lashes or hooded eyelids." },
    { type: "heading", text: "Control the adhesive" },
    { type: "text", text: "Practice dipping an extension consistently so it carries an appropriate amount of professional adhesive." },
    { type: "compare", title: "Too little or too much?", doLabel: "What you want", dontLabel: "What can go wrong", do: [
      "A controlled amount on the extension",
      "A neat placement on one isolated natural lash",
      "A comfortable, clean attachment",
    ], dont: [
      "Too little adhesive can lead to poor attachment and early shedding.",
      "Too much adhesive can create a hard lump.",
      "Excess adhesive can make nearby lashes stick together.",
    ] },
    { type: "callout", tone: "mistake", title: "Avoid stickies", text: "Lashes stuck together can pull against each other as they grow at different rates, causing discomfort and potential damage." },
    { type: "flip", prompt: "Quick check", front: "What can happen if too much glue is used?", back: "It can form a hard lump and cause nearby lashes to stick together." },
    { type: "checkpoint", question: "What is a risk of using too much adhesive?", options: ["Nearby lashes may stick together", "The extension becomes weightless", "The client needs less aftercare"], answer: 0, explain: "Excess adhesive can form hard bonds between lashes, leading to pulling and discomfort." },
  ]
);

const L10 = lesson(
  "Prepare and apply a set safely",
  "Follow a careful setup and placement sequence when your training permits live practice.",
  [
    { type: "heading", text: "Protect the lower lashes" },
    { type: "text", text: "After preparing the client and station, place soft under-eye gel pads and use suitable medical tape to cover the lower lashes. Position products carefully so they do not irritate the eyes." },
    { type: "heading", text: "One natural lash at a time" },
    { type: "steps", items: [
      { title: "Separate one natural lash", text: "Use the isolation tweezers to create clear space around a single lash." },
      { title: "Pick up one extension", text: "Use the placement tweezers and a controlled amount of professional adhesive." },
      { title: "Place on the isolated lash", text: "Attach gently to the natural lash, not the skin, leaving about **1–2 mm** from the eyelid." },
      { title: "Check your work", text: "Make sure the extension is neat and not bonded to a neighboring natural lash." },
    ] },
    { type: "callout", tone: "key", title: "Comfort comes first", text: "Do not rush or continue through discomfort. Work only within your training and applicable professional requirements." },
    { type: "checkpoint", question: "What must be isolated before placing an extension?", options: ["One natural lash", "The entire eyelid", "Several neighboring lashes together"], answer: 0, explain: "Isolating one natural lash helps avoid stickies and ensures the extension is attached to the correct lash." },
  ]
);

const L11 = lesson(
  "Fix stickies and remove extensions safely",
  "Protect natural lashes by separating stuck lashes carefully and never pulling extensions off.",
  [
    { type: "heading", text: "Find and fix stickies" },
    { type: "text", text: "A sticky happens when lashes that should move independently become glued together. Check your work as you go and carefully separate any sticky before it sets." },
    { type: "callout", tone: "mistake", title: "Do not leave lashes stuck", text: "Natural lashes grow at different speeds. If they stay bonded together, one lash can pull on another and cause pain or damage." },
    { type: "heading", text: "Remove with professional remover" },
    { type: "steps", items: [
      { title: "Protect the skin", text: "Use suitable eye pads and protection to keep remover away from skin and eyes." },
      { title: "Apply professional remover", text: "Follow the remover's label and your training. The curriculum describes waiting about **5 minutes**; the product's instructions take priority." },
      { title: "Slide extensions away gently", text: "Once released, remove without pulling or picking at the natural lashes." },
      { title: "Clean away residue", text: "Remove leftover product and rinse as directed before proceeding with any further service." },
    ] },
    { type: "callout", tone: "key", title: "Never pull", text: "Pulling or picking off extensions can damage natural lashes. Let professional remover do its job and follow its instructions." },
    { type: "checkpoint", question: "What should you do if extensions do not slide off during removal?", options: ["Pull harder", "Stop and follow the remover instructions; never force them off", "Pick them off one by one"], answer: 1, explain: "Forcing extensions off can damage natural lashes. Follow the product instructions and do not pull or pick." },
  ]
);

const L12 = lesson(
  "Aftercare and your lash business",
  "Help clients care for their lashes and build a professional foundation for your services.",
  [
    { type: "heading", text: "Teach simple aftercare" },
    { type: "text", text: "Show clients how to gently wash their extensions each night using a suitable, oil-free lash cleanser." },
    { type: "compare", title: "Client aftercare", doLabel: "Do", dontLabel: "Avoid", do: [
      "Wash gently each night with an oil-free lash cleanser.",
      "Follow the aftercare instructions you provide.",
      "Contact the artist if something feels uncomfortable.",
    ], dont: [
      "Use oily makeup or lotions around the extensions.",
      "Pick or pull at extensions.",
      "Ignore discomfort or an unexpected reaction.",
    ] },
    { type: "callout", tone: "note", title: "Why avoid oils?", text: "Oily makeup and lotions can weaken the adhesive bond and contribute to premature shedding." },
    { type: "heading", text: "Build trust and find clients" },
    { type: "list", style: "bullets", items: [
      "Have each client complete an intake form and waiver before the service.",
      "Explain the service, its risks, and aftercare clearly.",
      "Share your best work through targeted local Facebook and Instagram posts or ads.",
    ] },
    { type: "callout", tone: "key", title: "Professionalism is part of the service", text: "Clear consultation, client paperwork, careful technique, and aftercare help clients understand what to expect." },
    { type: "checkpoint", question: "What should clients use to wash their extensions?", options: ["An oily makeup remover", "A suitable oil-free lash cleanser", "Any household cleaner"], answer: 1, explain: "The curriculum recommends gentle nightly washing with an oil-free lash cleanser." },
  ]
);

const FINAL = {
  title: "Final assessment",
  kind: "assessment",
  summary: "Review the course foundations. Score 70% to pass.",
  is_preview: true,
  read_minutes: 0,
  blocks: [
    {
      type: "quiz",
      passScore: 70,
      questions: [
        { q: "Where should an eyelash extension be attached?", options: ["To the eyelid skin", "To one natural lash, leaving about 1–2 mm from the eyelid", "Across several natural lashes"], answer: 1, explain: "Attach to an individual natural lash, never to skin, and keep glue and extension away from the eyelid." },
        { q: "Why should fragile baby lashes be left alone?", options: ["They may be too weak to support an extension", "They are the longest lashes", "They cannot shed"], answer: 0, explain: "New growth is delicate and may be damaged by the weight of an extension." },
        { q: "About how many natural lashes may a person lose each day?", options: ["1–4", "20–30", "None"], answer: 0, explain: "Losing around 1–4 lashes a day is normal as part of the natural lash cycle." },
        { q: "What are the two pairs of tweezers used for?", options: ["Both only place extensions", "One isolates; one picks up and places", "One pair is disposable"], answer: 1, explain: "One pair isolates a natural lash, while the other picks up and places an extension." },
        { q: "What should happen before disinfecting a reusable tool?", options: ["Visible soil should be cleaned off", "It should be put away wet", "It should be wiped on clothing"], answer: 0, explain: "Clean away visible soil first, then follow the disinfectant's directions." },
        { q: "What is the safest approach to sterilizing tools?", options: ["Assume boiling always sterilizes", "Follow local requirements and validated equipment instructions", "Use any household appliance"], answer: 1, explain: "A process must be appropriate and validated. Follow professional requirements and equipment guidance." },
        { q: "Where should you practice placement and isolation before working on a person?", options: ["On a sponge and mannequin", "On a client's eyelid", "On used tools"], answer: 0, explain: "Sponge and mannequin drills help build control and isolation skills before live practice." },
        { q: "What can too much adhesive cause?", options: ["Lashes to stick together", "The lash cycle to stop", "The need for no cleaning"], answer: 0, explain: "Too much adhesive can form hard lumps and bond neighboring lashes together." },
        { q: "What should you do if extensions are stuck during removal?", options: ["Pull until they release", "Use professional remover as directed and never force them", "Cut the natural lashes"], answer: 1, explain: "Follow the remover's instructions and never pull or pick extensions off." },
        { q: "What should clients use for nightly lash cleansing?", options: ["A suitable oil-free lash cleanser", "Oily lotion", "Household soap or cleaner"], answer: 0, explain: "The curriculum recommends gentle nightly washing with a suitable oil-free lash cleanser." },
        { q: "What should a client complete before a service?", options: ["An intake form and waiver", "A social media post", "A product review"], answer: 0, explain: "The curriculum calls for client intake and waiver paperwork before starting the service." },
        { q: "Which map places the longest lengths toward the outer edge?", options: ["Cat eye", "Doll eye", "Wispy"], answer: 0, explain: "A cat-eye map places the longest lengths toward the outer edge for a more elongated look." },
        { q: "Which curl does the original course advise against on hooded eyelids?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "The original course advises against D curl on hooded eyelids or upward-angled lashes." },
      ],
    },
  ],
};

export const CLASSIC_SET_ESSENTIALS = {
  slug: "classic-set-essentials",
  title: "Classic Set Essentials",
  subtitle: "A safe foundation for every aspiring lash artist",
  description:
    "Learn lash fundamentals, hygiene, practice drills, application, removal, aftercare, and the basics of building a lash business.",
  level: "beginner",
  is_free: true,
  price: 0,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  modules: [
    { title: "Lash fundamentals", lessons: [L1, L2, L3] },
    { title: "Tools and hygiene", lessons: [L4, L5, L6, L7] },
    { title: "Practice and application", lessons: [L8, L9, L10] },
    { title: "Service, aftercare, and business", lessons: [L11, L12, FINAL] },
  ],
};
