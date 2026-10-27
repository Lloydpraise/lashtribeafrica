// Beginner Lashtech Guide - Start Here: built from the "Lashes by Shazz Academy Training Manual" (39 slides).
// The trainer's own prose is kept, lightly edited so each idea leads into the next, with hard ideas broken
// down and plain-language examples added. The modules follow the ideas in the manual, not its chapter order:
// the natural lash first, then the kit, safety, designing a set, the service itself, and finally clients.
//
// This course is written for ARTICLE mode (long-form reading): the migration sets courses.reading_view =
// 'article', and the learn page then hides the Story/Article switch and always opens the article view.
//
// Images: public/course-media/beginner-lashtech-guide/. Fifteen of them are the same pictures the Classic Set
// Essentials course already uses (copied over so this course stands on its own); cover.webp and
// logo-footer.webp come from the manual's cover slide. Every lesson ends with the small centred logo.
//
// Generate the Supabase seed with:
// node scripts/course-to-sql.mjs src/data/courses/beginner-lashtech-guide.js
// (0037_course_beginner_lashtech_guide.sql was written from this file; see the header of that file.)

const M = "/course-media/beginner-lashtech-guide/";

const FOOT = { type: "figure", url: M + "logo-footer.webp", caption: "" };

// reading time from the words on the page (~180 words a minute, plus a little for each question)
const words = (b) => {
  const s = [b.text, b.title, b.question, b.front, b.back, ...(b.items || []).map((i) => (typeof i === "string" ? i : `${i.title} ${i.text}`)), ...(b.do || []), ...(b.dont || [])]
    .filter(Boolean).join(" ");
  return s.split(/\s+/).filter(Boolean).length + (b.type === "checkpoint" || b.type === "flip" ? 25 : 0);
};
const rm = (blocks) => Math.max(2, Math.round(blocks.reduce((n, b) => n + words(b), 0) / 180));

const lesson = (title, summary, blocks, extra = {}) => {
  const all = [...blocks, FOOT];
  return { title, kind: "reading", summary, is_preview: false, read_minutes: rm(all), blocks: all, ...extra };
};

const quiz = (title, summary, questions, passScore = 70) => ({
  title,
  kind: "assessment",
  summary,
  is_preview: false,
  read_minutes: 0,
  blocks: [{ type: "quiz", passScore, questions }],
});

// ---------------------------------------------------------------------------
// Module 1: Start here
// ---------------------------------------------------------------------------

const L1 = lesson(
  "Welcome & Congratulations",
  "Why a classic lash course is the right place to start, and how this guide is laid out.",
  [
    { type: "heading", text: "Welcome & Congratulations" },
    { type: "figure", url: M + "cover.webp", caption: "Lashes by Shazz Academy" },
    { type: "text", text: "A classic lash extension course is the perfect course for you as a beginner, so that you can start working with clients and market yourself effectively. We are going to cover all the basics: how to choose and apply lashes, the important health and safety steps, and the business side of looking after your clients." },
    { type: "text", text: "When you finish this course, not only will you be part of a fast-growing industry, you will also be at the beginning of your journey as an entrepreneur." },
    { type: "quote", text: "Every great lash artist started exactly where you are now: at the beginning." },

    { type: "heading", text: "How this guide flows" },
    { type: "text", text: "This guide is built to be read like a book, from top to bottom. Each part answers a question the part before it raises, so take it in order." },
    { type: "steps", items: [
      { title: "The natural lash", text: "What an extension is, and how the lash you glue it to grows, rests and falls." },
      { title: "Your lash kit", text: "The tools and products on your station, and what each one is for." },
      { title: "Hygiene & safety", text: "How to keep your tools, your station and your client’s eyes safe." },
      { title: "Designing the set", text: "Classic, hybrid and volume, eye shapes, lash styles, mapping and curls." },
      { title: "The lash service", text: "Preparation, application, aftercare and removal, step by step." },
      { title: "Your clients", text: "The questions every client asks, and how to answer them with confidence." },
    ] },
    { type: "text", text: "Along the way you will find quick questions inside the lessons and a short quiz at the end of the bigger sections. They are there to help the ideas stick, not to trip you up." },
    { type: "callout", tone: "key", title: "Remember", text: "Lashing is a hands-on skill. Read each lesson, then practise what it teaches before you work on a paying client." },
  ],
  { is_preview: true }
);

const L2 = lesson(
  "What Lash Extensions Are",
  "A quick history: what extensions are made of, how they are attached, and how long they last.",
  [
    { type: "heading", text: "Quick lash extension history" },
    { type: "text", text: "Eyelash extensions are a cosmetic application used to enhance the length, curl, fullness and thickness of natural eyelashes." },
    { type: "text", text: "The extensions can be made from several materials, including mink, silk, synthetic fibre, human hair or horsehair. Whatever they are made of, the job is the same: to make the natural lashes look longer, curlier and fuller." },
    { type: "figure", url: M + "classic-photo.webp", caption: "A full set of classic lash extensions" },

    { type: "heading", text: "Where the extension goes" },
    { type: "text", text: "The main method is to apply the extension to the natural lash, **1–2 mm from the base** of the natural eyelash, **never making contact with the eyelid.**" },
    { type: "text", text: "Why leave that small gap? The skin of the eyelid is sensitive, and glue on the skin can cause irritation. The gap also lets the lash grow out comfortably, without the extension pulling or poking." },
    { type: "checkpoint", question: "Where should you place the extension?", options: ["Right on the eyelid, for a stronger hold", "On the natural lash, 1–2 mm from its base", "At the very tip of the natural lash"], answer: 1, explain: "The extension goes on the natural lash, 1–2 mm from the base, and never touches the eyelid." },

    { type: "heading", text: "How long it takes and how long it lasts" },
    { type: "text", text: "It can take from one to three hours to attach a full new set. How many lashes you can put on depends on how many natural eyelashes the client has." },
    { type: "text", text: "Because we lose natural eyelashes every day, eyelash extensions usually last between **2 and 6 weeks.** During that time, the natural lashes they are glued to start falling out or thinning, and the extensions go with them." },
    { type: "text", text: "That is why maintaining a full set requires a **refill every 2–3 weeks**, or a new set every four weeks." },
    { type: "callout", tone: "key", title: "Remember", text: "If done correctly, there should be no damage to the natural lashes." },
    { type: "text", text: "That promise, *no damage*, is what the rest of this course protects. To keep it, you first need to understand the natural lash itself. That is where we go next." },
  ],
  { is_preview: true }
);

// ---------------------------------------------------------------------------
// Module 2: The natural lash
// ---------------------------------------------------------------------------

const L3 = lesson(
  "The Eye and Its Lashes",
  "The parts of the eye you work around, and how many lashes you have to work with.",
  [
    { type: "heading", text: "Eye anatomy" },
    { type: "text", text: "The eyes are the organs of sight. Lashes grow in one layer along the edge of the eyelids, and their job is to protect the eye from dust and debris." },
    { type: "text", text: "The eye is made up of the cornea, iris and lens. Take a moment with the picture below: these are the parts you will be working right next to, so it helps to know them by name." },
    { type: "figure", url: M + "anatomy.webp", caption: "Parts of the human eye" },
    { type: "list", style: "dot", items: [
      "**Top lid and bottom lid:** the skin that closes over the eye. You work on the lashes of the top lid and keep the bottom lashes taped down.",
      "**Eyelash:** the natural lash you attach the extension to.",
      "**Sclera:** the white of the eye. During a service it should never be visible under the eye pad.",
      "**Iris and pupil:** the coloured ring and the dark centre that lets light in.",
      "**Cornea:** the clear lens that covers the front of the eye.",
      "**Tear duct:** the inner corner, where tears drain. Glue fumes can make it water.",
    ] },
    { type: "checkpoint", question: "What is the sclera?", options: ["The coloured ring of the eye", "The white of the eye", "The inner corner where tears drain"], answer: 1, explain: "The sclera is the white of the eye. Under the eye pad, none of it should show." },

    { type: "heading", text: "How many lashes are you working with?" },
    { type: "text", text: "An average person might have anywhere from one hundred to two hundred lashes per eye. But they are not all the same: some are long and strong, some are short and new, and some are about to fall out." },
    { type: "text", text: "The length of your lash extensions will depend on the growth cycle of the natural lash. Your natural lashes go through **3 stages of growth**, which we explain in the next lesson, so seeing some natural lash loss is all part of the normal growth cycle." },
    { type: "callout", tone: "tip", title: "Good to know", text: "When a natural lash falls out because of its growth cycle, the lash extension should still be attached to it. A lash that falls with its extension is a healthy shed, not a failed set." },
  ]
);

const L4 = lesson(
  "The Lash Growth Cycle",
  "Anagen, catagen and telogen: how a lash grows, stops and rests, and what each stage means for you.",
  [
    { type: "heading", text: "Three stages, one lash line" },
    { type: "text", text: "Every lash on the eye is going through one of three stages, and its neighbours are usually at different ones. Here are the types of growth cycle your lashes go through." },
    { type: "steps", items: [
      { title: "Anagen: growing", text: "The lash is actively growing. Lasts 30–45 days." },
      { title: "Catagen: transition", text: "Growth stops and the follicle shrinks. Lasts 2–3 weeks." },
      { title: "Telogen: resting", text: "The lash rests until it falls or is pushed out. Can last over 100 days." },
    ] },
    { type: "text", text: "Now let’s look at each stage closely, because each one tells you something about which lashes to work on." },

    { type: "heading", text: "Anagen phase: the growth stage" },
    { type: "text", text: "The anagen, or growth, stage is when the lashes are actively growing. It lasts between **30 and 45 days.** When eyelashes are in this phase, they do not fall out unless they are intentionally pulled or torn out." },
    { type: "text", text: "Approximately **40% of the upper lashes**, and **15% of the lower lashes**, are in this stage at any time. Each lash grows to a specific length and then stops." },
    { type: "text", text: "Since the lashes are new in this phase, they may be too fragile to lash. You can recognise them as the smaller lashes that are still growing and getting stronger." },
    { type: "callout", tone: "mistake", title: "Common mistake", text: "Gluing a long, heavy extension onto a short, new anagen lash. The baby lash cannot carry the weight, and you risk damaging it. Leave it, or choose a very light, short extension." },

    { type: "heading", text: "Catagen phase: the transition stage" },
    { type: "text", text: "The catagen stage is known as the cessation of growth, or the transition stage. During this stage the lash stops growing and the hair follicle (the tiny pocket in the skin that the lash grows from) begins to shrink." },
    { type: "text", text: "When an eyelash falls out or is plucked out at this stage, unnaturally, it will not grow back right away. Once the follicle has completed this stage, it moves on to the next phase." },
    { type: "text", text: "The catagen stage takes anywhere from **2 to 3 weeks** to complete. A good way to recognise it: the lash is at its peak, usually in both length and health." },
    { type: "checkpoint", question: "A lash is at its full length and looks healthy and strong. Which stage is it most likely in?", options: ["Anagen", "Catagen", "Telogen"], answer: 1, explain: "A lash at its peak in length and health is a good sign of the catagen stage." },

    { type: "heading", text: "Telogen phase: the resting stage" },
    { type: "text", text: "The telogen stage is also called the resting stage. It can last **over 100 days.** During this period the hair does not grow, but it stays attached to the follicle while it rests." },
    { type: "text", text: "If a hair is pulled out at this stage, you will notice a “root”, a small white ball at the end of the lash. This shows that the hair has already shed from the follicle in this phase." },
    { type: "text", text: "After this stage, eyelashes will either fall out or be pushed out by the new lash growing underneath. Because of this growth, it is normal for a few eyelashes to fall out almost every day. It can take anywhere between **4 and 8 weeks** to completely replace an eyelash!" },
    { type: "flip", prompt: "Tap the card", frontLabel: "You find a lash with", front: "A small white ball at the end", backLabel: "It means", back: "Telogen: the lash had already shed from the follicle. A natural, healthy fall." },
    { type: "callout", tone: "key", title: "Why this matters", text: "It is this natural growth cycle that makes it right to refill every 2–3 weeks." },
  ]
);

const L5 = lesson(
  "Shedding, Fills & Clean Lashes",
  "Why clients lose lashes every day, and the simple habit that protects every set.",
  [
    { type: "heading", text: "Losing lashes is normal" },
    { type: "text", text: "Remember that it is normal to lose **1–4 lashes per day** as natural lashes move through the growth cycle." },
    { type: "text", text: "Each eyelash is at a different stage. So with extensions, some may stay on for weeks, while others fall within days. It all depends on the phase each natural lash is in when you lash it." },
    { type: "text", text: "Think of it like a garden where every plant was planted on a different day. You will never see the whole garden bloom and wilt at the same time. A few lashes go every day, and new ones take their place." },
    { type: "checkpoint", question: "Your client has lost about three extensions a day since her appointment. What is happening?", options: ["The glue has failed", "Her natural lashes are shedding as part of the normal growth cycle", "She is allergic to the lashes"], answer: 1, explain: "Losing 1–4 natural lashes a day is normal. The extensions fall with them." },

    { type: "heading", text: "Clean lashes last longer" },
    { type: "text", text: "Proper cleansing of the lashes keeps them clean and removes excess oils from make-up and the surrounding skin." },
    { type: "text", text: "This matters because facial oils can break down the bond and integrity of the extension, and cause the extensions to come off early." },
    { type: "callout", tone: "tip", title: "Tell your client", text: "Gentle, regular lash cleansing is the easiest thing she can do to keep her set looking full until her next fill." },
    { type: "text", text: "You now understand the lash you are working on. Next, let’s set up the station you will be working from." },
  ]
);

const Q1 = quiz(
  "Quiz: The Natural Lash",
  "Five questions on lash extensions and the growth cycle. Score 70% to pass.",
  [
    { q: "How far from the base of the natural lash should the extension be placed?", options: ["Touching the eyelid", "1–2 mm from the base", "Halfway up the lash"], answer: 1, explain: "Apply the extension 1–2 mm from the base of the natural eyelash, never making contact with the eyelid." },
    { q: "How often does a full set need a refill?", options: ["Every 2–3 weeks", "Every 2–3 months", "Never"], answer: 0, explain: "Maintaining a full set requires a refill every 2–3 weeks, or a new set every four weeks." },
    { q: "Which growth stage are new, fragile lashes in?", options: ["Anagen", "Catagen", "Telogen"], answer: 0, explain: "Anagen is the growth stage. New lashes in this phase may be too fragile to lash." },
    { q: "How long can the telogen (resting) stage last?", options: ["2–3 days", "2–3 weeks", "Over 100 days"], answer: 2, explain: "The telogen stage can last over 100 days." },
    { q: "How many natural lashes is it normal to lose per day?", options: ["None", "1–4", "20–30"], answer: 1, explain: "It is normal to lose 1–4 lashes per day as the lashes move through the growth cycle." },
  ]
);

// ---------------------------------------------------------------------------
// Module 3: Your lash kit
// ---------------------------------------------------------------------------

const L6 = lesson(
  "The Tools in Your Hands",
  "Tweezers, lashes, tape, lash brushes and micro brushes: the tools you touch on every lash.",
  [
    { type: "heading", text: "Lash product knowledge" },
    { type: "text", text: "These are the most common tools used in a lash procedure. We will start with the ones you hold in your hands, then move on to the products that make the lashes stay on." },

    { type: "heading", text: "1. Lash tweezers" },
    { type: "text", text: "Tweezers are an essential tool for lashing. You must have **two pairs** of tweezers to complete a lash service." },
    { type: "text", text: "You hold your **isolation tweezers** in one hand, to separate one natural lash from its neighbours. In your other hand you hold your **lashing tweezers**, which you use to pick up and apply the lash extensions." },
    { type: "callout", tone: "tip", title: "Picture it", text: "Isolation tweezers open a gap around one lash, like parting hair to find a single strand. Lashing tweezers then place the extension on that one lash only." },
    { type: "checkpoint", question: "What are the isolation tweezers for?", options: ["Picking up the extension", "Separating one natural lash from the others", "Removing glue from the stone"], answer: 1, explain: "Isolation tweezers separate one natural lash; the lashing tweezers pick up and apply the extension." },

    { type: "heading", text: "2. High-quality lashes" },
    { type: "text", text: "Well, eyelash extensions are essential for every service, and something you will also want to invest in. Clients wear them all day, every day, and will notice if you go the cheap route, and some may not take too kindly to it!" },
    { type: "text", text: "Invest in good-quality lashes that hold their curl while still looking natural." },

    { type: "heading", text: "3. Eyelash extension tape" },
    { type: "text", text: "Tape is used before lashing to hold down stubborn bottom lashes. Without tape, the lower lashes crisscross with the upper lashes, which could result in a client’s eye getting glued shut. That’s just not good for business." },

    { type: "heading", text: "4. Lash brushes" },
    { type: "text", text: "Lash brushes (also called mascara wands or spoolies) are good for so many reasons, but their number one purpose is to make sure everything stays separated." },
    { type: "text", text: "You may run into a sticky (literally) situation that a lash brush can’t get you out of, but 90% of the time your lash brushes will have your back." },

    { type: "heading", text: "5. Micro brushes" },
    { type: "text", text: "Micro brushes are the tiny disposable applicators you use to apply primer, and to apply remover when you take lashes off. Use a fresh one for every client." },
    { type: "text", text: "With the tools in your hands sorted, let’s look at the products that do the chemistry: preparing the lash, holding the extension, and taking it off again." },
  ]
);

const L7 = lesson(
  "Primer, Glue & Station Extras",
  "The products that make lashes stay on, and the extras that keep your client comfortable.",
  [
    { type: "heading", text: "Primer: the step you never skip" },
    { type: "text", text: "You need primer for every lash, for every client, for every service! Why? Because primer makes sure that all debris and oils are stripped from the lashes before application." },
    { type: "text", text: "This makes a huge difference to your client’s retention (how long her extensions stay on). Once she walks out of the door, we don’t know what she does or how she treats her lashes. It is up to her to follow the aftercare guidelines." },
    { type: "callout", tone: "key", title: "Remember", text: "We can’t control every part of retention, but one thing we can always do is use primer. Apply it with a micro brush." },

    { type: "heading", text: "Eyelash adhesive (glue)" },
    { type: "text", text: "Now, this is what will hold everything together, literally! Adhesive is probably the most important part of each service." },
    { type: "text", text: "Finding an adhesive that you can trust is vital to your career. Research your options and make sure you have a good adhesive ready for every single service." },

    { type: "heading", text: "Glue remover" },
    { type: "text", text: "Glue remover is a gel-like substance used to remove lash extensions, either one at a time or a whole set. You will learn the full removal procedure later in the course." },

    { type: "heading", text: "Eye pads" },
    { type: "text", text: "These make the appointment so much more comfortable for your client. And, girl, your client’s comfort is the MOST IMPORTANT!" },
    { type: "text", text: "Eye pads also make sure that all those little bottom lashes stay tucked away and secure, so they can’t get glued to the top ones." },

    { type: "heading", text: "Crystal stone" },
    { type: "text", text: "A crystal stone is your answer to “Where do I put my adhesive?” You place a drop of glue on it while you work. It keeps your adhesive fresh for longer and helps regulate its temperature. You may also hear it called a jade stone or glue stone." },

    { type: "heading", text: "Nano mister" },
    { type: "text", text: "A nano mister sprays a very fine mist that speeds up the adhesive’s curing (setting) process. It cuts the recommended “drying time” from 24–48 hours down to 4–10 hours! They are pretty cool, and definitely an extra worth looking into." },
    { type: "checkpoint", question: "Why do you use primer on every lash?", options: ["To make the lashes curlier", "To strip oils and debris so the glue holds better", "To dry the glue faster"], answer: 1, explain: "Primer strips debris and oils from the lashes before application, which makes a huge difference to retention." },
    { type: "text", text: "You have your kit. Before it ever touches a client, it has to be clean, and that is the next part of the course." },
  ]
);

// ---------------------------------------------------------------------------
// Module 4: Hygiene & safety
// ---------------------------------------------------------------------------

const L8 = lesson(
  "Why Hygiene Comes First",
  "How infections spread in a lash room, and the four levels of decontamination.",
  [
    { type: "heading", text: "Sanitation and safety" },
    { type: "text", text: "Tools on your lash station, such as tweezers, lash cleansing brushes and lash wands, and even your own hands, can spread eye infections between your clients if hygiene is overlooked." },
    { type: "text", text: "That is why making sure your lash room is clean and properly sanitised should be one of your top priorities. Failing to do so can cause damaging effects for your clients, such as eye infections and permanent loss of natural lashes (and, potentially, the loss of clients, too)." },
    { type: "text", text: "To start, it helps to understand the difference between cleaning, sanitising, disinfecting and sterilising. They are not the same thing." },

    { type: "heading", text: "Four methods of decontamination" },
    { type: "text", text: "Think of them as four levels, from the lightest clean to the strongest." },
    { type: "steps", items: [
      { title: "Cleaning", text: "Warm water and soap. This removes particles from the surface." },
      { title: "Sanitising", text: "Alcohol-based products that eliminate or reduce bacteria." },
      { title: "Disinfecting", text: "Products that contain germicides (germ-killing ingredients), reducing bacteria to a safe level." },
      { title: "Sterilising", text: "High heat. The most effective method for killing all living organisms on hard surfaces." },
    ] },
    { type: "checkpoint", question: "Which method is the most effective at killing all living organisms on hard surfaces?", options: ["Cleaning", "Sanitising", "Sterilising"], answer: 2, explain: "Sterilising with high heat is the most effective method on hard surfaces." },
    { type: "text", text: "Next, let’s turn those four levels into a routine you follow with every client." },
  ]
);

const L9 = lesson(
  "Your Hygiene Routine",
  "Hands, workstation, disinfecting and sterilising: the steps to take with every client.",
  [
    { type: "heading", text: "1. How to clean your hands" },
    { type: "text", text: "Make sure your hands are always sanitised and free from contamination by washing them thoroughly between clients with warm water and soap for **at least 30 seconds.**" },
    { type: "text", text: "Also, keep a bottle of hand sanitiser at your station during the service. The most effective way to use it is to apply at least a dime-sized (coin-sized) amount to the palm of one hand and rub both palms together for 30 seconds." },

    { type: "heading", text: "2. How to sanitise your workstation" },
    { type: "text", text: "First, get rid of everything that is non-reusable. This includes eye pads, micro brushes and lash wands." },
    { type: "text", text: "To keep your workstation hygienic, we recommend that you wipe down everything you touched during the service with a disinfectant wipe at the end of each working day." },
    { type: "text", text: "Tools that directly touched the client’s lashes, such as tweezers, need more: sanitise the tips of the tweezers with alcohol or peroxide **after every session.**" },

    { type: "heading", text: "3. How to disinfect your lash supplies" },
    { type: "text", text: "Before disinfecting your tools, always clean any visible debris off them first. Debris left on the surface can lead to cross-contamination." },
    { type: "steps", items: [
      { title: "Prepare", text: "Mix an approved hospital-grade disinfectant according to the manufacturer’s instructions." },
      { title: "Soak", text: "Make sure all tools are fully submerged, for the time the instructions give." },
      { title: "Lift out", text: "When time is up, remove the tools with clean tongs, so your fingers don’t re-contaminate them." },
      { title: "Dry", text: "Dry the tools with a clean towel, or let them air dry." },
    ] },

    { type: "heading", text: "4. How to sterilise your lash supplies" },
    { type: "text", text: "If you want to be extra squeaky clean with your tools, this method is for you." },
    { type: "callout", tone: "mistake", title: "Heat-resistant tools only", text: "Use this method only for heat-resistant tools like tweezers or a jade stone. DO NOT use it on any plastic products." },
    { type: "text", text: "To sterilise your tools, let them soak in **boiling water for 20 minutes.** Carefully remove them with a tool like pincers, let them air dry, and keep them in a container. High heat is the best way to completely eliminate bacteria." },

    { type: "heading", text: "Quick hygienic steps to remember" },
    { type: "text", text: "Here is the whole routine in one list. Tick each step off as you read it." },
    { type: "list", style: "checklist", items: [
      "Throw out any non-reusable tools immediately after use.",
      "Use warm water and soap to clean reusable tools.",
      "Rinse the tools in clean water to remove all residue.",
      "Use fresh disinfectant on the cleaned tools, following its instructions properly.",
      "Rinse the tools in clean water.",
      "Let them air dry.",
      "Store the tools in a closed container, or cover them with a clean cloth.",
    ] },
    { type: "callout", tone: "tip", title: "Plan your bookings", text: "Allow 10 to 15 minutes between lash services for your cleaning and disinfecting routine." },
    { type: "checkpoint", question: "When should you sanitise the tips of your tweezers?", options: ["Once a week", "After every session", "Only when they look dirty"], answer: 1, explain: "Tools that touched the client’s lashes, like tweezers, are sanitised with alcohol or peroxide after every session." },
  ]
);

const L10 = lesson(
  "Allergies & Eye Reactions",
  "What an allergic reaction to lash extensions looks like, how long it lasts, and what helps.",
  [
    { type: "heading", text: "What an allergic reaction looks like" },
    { type: "text", text: "Clean tools protect your client from infection. But even with a perfectly clean station, some clients can react to the products themselves." },
    { type: "text", text: "An allergic reaction to eyelash extensions can happen in one or both eyes. If both, it may be more severe in one eye than the other. Typical symptoms include redness, itchiness and swelling on the eyelid or the eye itself." },
    { type: "text", text: "In most cases, the person is allergic to the glue (adhesive) that attaches the eyelashes. Often the glue leaks onto the eyelid or into the eye, which can cause a reaction." },

    { type: "heading", text: "Allergic blepharitis" },
    { type: "text", text: "The most common complication associated with eyelash extensions is **allergic blepharitis**, which simply means an allergic inflammation of the eyelid. A person with allergic blepharitis may experience:" },
    { type: "list", style: "dot", items: ["Tearing", "Irritation", "Redness", "Itchiness", "Swelling"] },
    { type: "text", text: "It can happen soon after the lashes are applied, or take several hours or days to appear. The reaction can come from direct contact with the glue, or from the glue’s vapours (fumes)." },
    { type: "text", text: "To help avoid an allergic reaction, use formaldehyde-free products, and advise the client not to wash her face for a few hours after the application." },
    { type: "checkpoint", question: "What are clients most often allergic to?", options: ["The lash extensions", "The glue (adhesive)", "The eye pads"], answer: 1, explain: "In most cases a person is allergic to the glue, through direct contact or its vapours." },

    { type: "heading", text: "How long does the reaction last?" },
    { type: "text", text: "Depending on how severe the allergic reaction is, symptoms can last from a few hours to a few days. Treatment can also affect how long they last. A person should talk to their doctor if the reaction continues after a few days." },

    { type: "heading", text: "Treatment" },
    { type: "text", text: "For a mild reaction, a person may be able to treat the symptoms at home. They can try:" },
    { type: "list", style: "numbered", items: ["Eye drops", "Cold compresses", "Antihistamines", "Hydrocortisone cream or ointment"] },
    { type: "text", text: "It is also important to resist the temptation to rub the eyes if they are itchy." },
    { type: "callout", tone: "key", title: "Know your limits", text: "If symptoms are severe, the person should see their doctor. A doctor can assess how serious the reaction is and give specific treatment. As a lash tech, your job is to recognise the signs and refer, not to diagnose." },
  ]
);

const L11 = lesson(
  "Preventing Reactions",
  "Clean conditions, closed eyes, and the clients who should not get lash extensions.",
  [
    { type: "heading", text: "Prevention" },
    { type: "text", text: "Prevention starts with everything you have learned so far. If the procedure uses unsanitary equipment, or takes place in an unclean area, it could cause reactions or infections in the client’s eyes." },
    { type: "text", text: "In addition, the client should keep her eyes closed during the whole application. This stops the glue from dripping into the eyes." },
    { type: "text", text: "The vapours from the glue can also irritate the eyes. Contact with the glue or its vapours can result in symptoms of irritation." },
    { type: "compare", title: "Lower the risk", doLabel: "Do", dontLabel: "Don’t",
      do: ["Work with sanitised tools in a clean room", "Keep the client’s eyes fully closed", "Use formaldehyde-free products"],
      dont: ["Reuse disposable tools", "Let glue or fumes reach the eye", "Lash a client who should not be lashed"] },

    { type: "heading", text: "Who should not get lash extensions" },
    { type: "text", text: "Some people are more likely than others to react to eyelash extensions. The Board of Barbering and Cosmetology recommends that people with certain conditions or risk factors avoid getting eyelash extensions. These include people who:" },
    { type: "list", style: "checklist", items: [
      "Have alopecia (a condition that causes hair loss)",
      "Have trichotillomania, a condition that makes people want to pull out their eyelashes",
      "Are receiving radiation or chemotherapy",
    ] },
    { type: "text", text: "Ask about these before you begin, as part of your consultation and waiver." },

    { type: "heading", text: "Summary" },
    { type: "list", style: "dot", items: [
      "Eyelash extensions can cause allergic reactions in the eyelid or eye.",
      "If a person has an allergic reaction, the eyelash extensions should be removed. She should also avoid getting eyelash extensions in the future, and use mascara instead.",
      "A person can often treat a mild reaction with at-home solutions, such as eye drops or allergy medicine.",
      "If a reaction is severe, the person should visit their doctor.",
    ] },
    { type: "checkpoint", question: "A client tells you she is having chemotherapy. What should you do?", options: ["Go ahead with a light classic set", "Recommend she avoids lash extensions", "Use extra primer"], answer: 1, explain: "People receiving radiation or chemotherapy are advised to avoid eyelash extensions." },
  ]
);

const Q2 = quiz(
  "Quiz: Your Kit, Hygiene & Safety",
  "Seven questions on your tools, hygiene routine and allergies. Score 70% to pass.",
  [
    { q: "How many pairs of tweezers do you need for a lash service?", options: ["One", "Two", "Four"], answer: 1, explain: "You need two pairs: isolation tweezers in one hand, lashing tweezers in the other." },
    { q: "What is lash tape mainly used for?", options: ["Holding down the bottom lashes", "Curling the extensions", "Holding the glue stone"], answer: 0, explain: "Tape holds down stubborn bottom lashes so they can’t crisscross with the top lashes and get glued." },
    { q: "Which decontamination method uses alcohol-based products?", options: ["Cleaning", "Sanitising", "Sterilising"], answer: 1, explain: "Sanitising uses alcohol-based products to eliminate or reduce bacteria." },
    { q: "How long should you wash your hands with warm water and soap between clients?", options: ["5 seconds", "At least 30 seconds", "5 minutes"], answer: 1, explain: "Wash thoroughly with warm water and soap for at least 30 seconds." },
    { q: "Which of these can you sterilise in boiling water?", options: ["Plastic lash wands", "Stainless steel tweezers", "Micro brushes"], answer: 1, explain: "Boiling is only for heat-resistant tools like tweezers or a jade stone, never plastic." },
    { q: "What is the most common complication of eyelash extensions?", options: ["Allergic blepharitis", "Broken tweezers", "Lash curl falling"], answer: 0, explain: "Allergic blepharitis, an allergic inflammation of the eyelid, is the most common complication." },
    { q: "A client has a severe reaction. What is the right advice?", options: ["Wait two weeks and see", "See a doctor", "Rub the eyes to relieve the itch"], answer: 1, explain: "If symptoms are severe, the person should see their doctor for treatment." },
  ]
);

// ---------------------------------------------------------------------------
// Module 5: Designing the set
// ---------------------------------------------------------------------------

const L12 = lesson(
  "Classic, Hybrid & Volume",
  "The three types of lash set today, and the ratio behind each one.",
  [
    { type: "heading", text: "Three types of set" },
    { type: "text", text: "Your kit is clean and your client is safe to lash. Now comes the fun part: deciding what the lashes will look like. It starts with the type of set." },
    { type: "text", text: "Every set is described by a **ratio**: how many extensions go onto one natural lash. Keep that idea in mind as you read about each type." },

    { type: "heading", text: "Classic lashes" },
    { type: "figure", url: M + "classic-photo.webp", caption: "Classic" },
    { type: "text", text: "Classic lashes are a **1:1 ratio**: one extension applied to one natural lash." },
    { type: "text", text: "This application adds length to the lashes, not volume. The result looks like the client’s own lashes, just longer and more defined, like a perfect coat of mascara." },
    { type: "figure", url: M + "classic-ratio.webp", caption: "1:1 ratio: one extension on one natural lash" },

    { type: "heading", text: "Hybrid lashes" },
    { type: "figure", url: M + "hybrid-photo.webp", caption: "Hybrid" },
    { type: "text", text: "Hybrid lashes are classic lashes and volume fans mixed together." },
    { type: "text", text: "This application adds length, and a little volume. It is the in-between look for a client who wants more than classic but not a full volume set." },
    { type: "figure", url: M + "hybrid-ratio.webp", caption: "1:1 ratio + 3:1 – 8:1 ratio" },

    { type: "heading", text: "Volume lashes" },
    { type: "figure", url: M + "volume-photo.webp", caption: "Volume" },
    { type: "text", text: "Volume lashes are **2–6 thin eyelash extensions** made into a fan shape and applied to one natural lash, for a look of full, fluffy lashes." },
    { type: "text", text: "This application adds length and full volume. Because the fan lashes are very thin, a fan can be fuller without being heavier than one thick classic lash. The chart below shows fans from 3:1 up to 10:1: the bigger the first number, the denser the fan." },
    { type: "figure", url: M + "volume-ratio.webp", caption: "3:1 – 10:1 ratio: a fan on one natural lash" },

    { type: "heading", text: "Check your understanding" },
    { type: "flip", prompt: "Tap the card", frontLabel: "Ratio", front: "1:1", backLabel: "Set type", back: "Classic: one extension on one natural lash. Length, not volume." },
    { type: "checkpoint", question: "A client wants a little more fullness than classic, but not a full volume look. What do you suggest?", options: ["Classic", "Hybrid", "Volume"], answer: 1, explain: "Hybrid mixes classic lashes and volume fans: length with a little volume." },
    { type: "callout", tone: "note", title: "In this course", text: "This guide teaches the classic 1:1 technique. Master classic first: volume and hybrid build on the same isolation skills." },
  ]
);

const L13 = lesson(
  "Reading Eye Shapes",
  "Every client is different: how to look at the shape and position of the eyes before you choose a style.",
  [
    { type: "heading", text: "Lash styling & mapping" },
    { type: "text", text: "As a lash artist, you will learn quickly that no two clients are the same. You will come across all kinds of eye shapes in your lash career, and you may find that some clients have a mixture of eye shapes." },
    { type: "text", text: "Look at the shape of the eyes and how they are positioned on the face to work out the eye structure. This will help you decide the client’s eye shape, and from there the recommended style." },
    { type: "figure", url: M + "eye-shapes.webp", caption: "Common eye shapes" },
    { type: "text", text: "Eye shapes can include close-set, wide-set, monolid and downturned eyes, as well as almond, round, hooded, deep-set and protruding eyes. And remember: every client is different!" },

    { type: "heading", text: "Two questions to ask" },
    { type: "steps", items: [
      { title: "Position", text: "How far apart are the eyes? Close-set eyes sit nearer the nose; wide-set eyes sit further apart." },
      { title: "Shape", text: "What shape is the eye itself? Almond, round, hooded, downturned, monolid?" },
    ] },
    { type: "text", text: "The answers tell you what you want the lashes to do: make the eyes look wider apart, more open, lifted, or simply balanced. The next lesson shows how lash styles do exactly that." },
    { type: "checkpoint", question: "What do you look at to work out a client’s eye structure?", options: ["The shape and position of the eyes", "The colour of the iris", "The length of the eyebrows"], answer: 0, explain: "Look at the shape and positioning of the eyes to determine the eye structure." },
  ]
);

const L14 = lesson(
  "Lash Styles & Mapping",
  "Cat eye, doll eye and the wispy Kim K set, how to read a lash map, and the rules for choosing lengths.",
  [
    { type: "heading", text: "Choosing a lash style" },
    { type: "text", text: "Once you have decided on your client’s eye shape, you can choose the lash style. There are lots of different styles; in this course we focus on the **cat eye** and **doll eye**, with a bonus style at the end." },
    { type: "text", text: "Each style is drawn as a **lash map**: a sketch of the eye pad split into zones, with a number in each zone. The number is the extension length in millimetres for that part of the lash line. Changing where the longest lashes go changes the shape the eye appears to have." },

    { type: "heading", text: "1. Cat eye" },
    { type: "figure", url: M + "cat-eye.webp", caption: "Cat eye" },
    { type: "text", text: "To create the illusion of wide-set, “exotic” eyes, you place the **longest lashes towards the outer edge** of the lash line. The lift at the outer corner draws the eye outwards." },
    { type: "callout", tone: "tip", title: "Suits", text: "Almond, close-set and round eyes." },
    { type: "figure", url: M + "cat-map.webp", caption: "Cat eye map: lengths in mm, longest towards the outer corner" },

    { type: "heading", text: "2. Doll (open) eye" },
    { type: "figure", url: M + "doll-eye.webp", caption: "Doll eye" },
    { type: "text", text: "By using **longer lengths through the middle** of the lash line, you create the appearance of large, open eyes. Hence the name “Dolly”." },
    { type: "callout", tone: "tip", title: "Suits", text: "Almond and wide-set eyes." },
    { type: "figure", url: M + "doll-map.webp", caption: "Doll eye map: the longest lengths in the centre" },
    { type: "checkpoint", question: "Your client has close-set eyes. Which style helps them look wider apart?", options: ["Cat eye", "Doll eye", "Neither"], answer: 0, explain: "The cat eye puts the longest lashes towards the outside edge, creating the illusion of wide-set eyes. It suits close-set eyes." },

    { type: "heading", text: "Bonus style: Kim K / wispy set" },
    { type: "text", text: "One of the most popular lash styles. The Kim K look places **“spikes”** (longer lengths) in different sections of the lash line to create a wispy, textured set." },
    { type: "callout", tone: "tip", title: "Suits", text: "Almond and round eyes." },
    { type: "figure", url: M + "wispy-map.webp", caption: "Practice template: spiked lash maps in petite, short and standard lengths" },
    { type: "text", text: "As an extra helping hand, we have included the template above so you can practise mapping." },

    { type: "heading", text: "Use the correct lengths" },
    { type: "text", text: "Whatever the style, the length has to suit the natural lash it sits on. You can add an extension that is **shorter than the natural lash, or up to 3 mm longer.** You should never go more than **50% longer** than the natural lash." },
    { type: "text", text: "Here is an example. If a natural lash is 8 mm long, you could use an extension of up to 11 mm (3 mm longer). Half of 8 is 4, so 12 mm would be the absolute limit, and you would stay below it." },
    { type: "text", text: "If you are unsure how long the natural lashes are, lay your client down and hold a lash extension up against her natural lash. Measuring against the eye like this helps when lash mapping, because you can plan the lengths you want to use." },
    { type: "checkpoint", question: "A client’s natural lashes are 8 mm. Which extension length is safe?", options: ["10 mm", "14 mm", "16 mm"], answer: 0, explain: "You can go up to 3 mm longer than the natural lash and never more than 50% longer. 10 mm is within both rules." },
  ]
);

const L15 = lesson(
  "Choosing a Curl: C or D",
  "The two most used curls, which natural lashes each one suits, and when not to use it.",
  [
    { type: "heading", text: "Curls" },
    { type: "text", text: "The last design choice is the curl. The curl is the shape of the extension itself, and it decides how much lift the lashes get. The most used curls are **C** and **D.**" },
    { type: "text", text: "To choose, look at the direction the client’s natural lashes grow: do they curl up slightly, grow straight, or point downwards?" },

    { type: "heading", text: "C curl" },
    { type: "figure", url: M + "c-curl.webp", caption: "C curl" },
    { type: "text", text: "C curl is one of the most popular curls worldwide. C curl lashes are meant for clients with a slight curl in their natural lashes, and create an open-eye effect." },
    { type: "text", text: "Used on clients with slightly downward-angled lashes, C curl gives a satisfying lash lift. For clients with heavily downward-angled lashes, we recommend D curl instead." },

    { type: "heading", text: "D curl (also known as CC curl)" },
    { type: "figure", url: M + "d-curl.webp", caption: "D curl" },
    { type: "text", text: "D curl lashes are very similar to C curl, just curlier. They are especially effective for clients with downward-angled lashes who want a show-stopping look." },
    { type: "text", text: "These lashes brighten and widen the eye and give a noticeable curled effect. D curl is best for clients with downward-angled natural lashes." },

    { type: "heading", text: "C or D at a glance" },
    { type: "compare", title: "C curl", doLabel: "Use on", dontLabel: "Do not use on",
      do: ["Clients with a slight curl in their natural lashes", "Slightly downward-angled lashes, for a lash-lift effect"],
      dont: ["Heavily downward-angled lashes"] },
    { type: "compare", title: "D curl", doLabel: "Use on", dontLabel: "Do not use on",
      do: ["Clients with straight or downward-angled natural lashes", "Downward-angled lashes, for an open-eye effect"],
      dont: ["Upward-angled lashes", "Hooded eyelids"] },
    { type: "checkpoint", question: "A client’s natural lashes point heavily downwards. Which curl do you choose?", options: ["C curl", "D curl"], answer: 1, explain: "For heavily downward-angled lashes, D curl is recommended instead of C curl." },
    { type: "text", text: "You can now plan a whole set: the type, the style, the lengths and the curl. Time to put it on the client." },
  ]
);

const Q3 = quiz(
  "Quiz: Designing the Set",
  "Six questions on set types, eye shapes, styles, lengths and curls. Score 70% to pass.",
  [
    { q: "What ratio are classic lashes?", options: ["1:1", "3:1", "10:1"], answer: 0, explain: "Classic lashes are a 1:1 ratio: one extension applied to one natural lash." },
    { q: "Volume fans are made of how many thin extensions?", options: ["1", "2–6", "20–30"], answer: 1, explain: "Volume lashes are 2–6 thin eyelash extensions made into a fan shape." },
    { q: "Where do the longest lashes go in a doll eye set?", options: ["Towards the outer edge", "Through the middle", "At the inner corner"], answer: 1, explain: "Longer lengths through the midsection create large, open eyes." },
    { q: "Which eye shapes does the cat eye suit?", options: ["Almond, close-set and round", "Only hooded", "Only wide-set"], answer: 0, explain: "Cat eye suits almond, close-set and round eyes." },
    { q: "What is the most an extension should be longer than the natural lash?", options: ["Up to 3 mm, and never more than 50%", "Twice as long", "Any length the client likes"], answer: 0, explain: "Add up to 3 mm longer, and never more than 50% longer than the natural lash." },
    { q: "Which clients should NOT get a D curl?", options: ["Clients with downward-angled lashes", "Clients with upward-angled lashes or hooded eyelids", "Clients with straight lashes"], answer: 1, explain: "Do not use D curl on upward-angled lashes or hooded eyelids." },
  ]
);

// ---------------------------------------------------------------------------
// Module 6: The lash service
// ---------------------------------------------------------------------------

const L16 = lesson(
  "Preparing Your Client",
  "Steps 1–8: from the waiver to clean tweezers, everything you do before the first lash.",
  [
    { type: "heading", text: "Step-by-step application procedure" },
    { type: "text", text: "Everything you have learned so far comes together here. The service has 18 steps: 8 to prepare, and 10 to apply. Good preparation is what makes the application smooth, safe and long-lasting." },

    { type: "heading", text: "Prep steps 1–8" },
    { type: "steps", items: [
      { title: "Have your client sign a waiver", text: "A waiver is a consent form. It is also where you ask about allergies and the conditions you learned to screen for." },
      { title: "Determine your client’s desired look", text: "Agree on the set type, style, lengths and curl before she lies down." },
      { title: "Sanitise your hands", text: "Every service starts with clean hands." },
      { title: "Apply eye pads", text: "Check that your client’s eyes can fully close, and that the eye pads are not touching the eyes." },
      { title: "Use tape on the lower lashes, if needed", text: "Secure any lower lashes the pad doesn’t hold down." },
      { title: "Apply the primer with micro swabs", text: "Strip away oils and debris so the glue can grip." },
      { title: "Prepare your glue", text: "Shake your glue for 60 seconds, then put a pea-sized drop on your jade stone. Put a fresh dot of glue down every 20–30 minutes." },
      { title: "Make sure your tweezers are completely clean", text: "Clean tips mean a clean application." },
    ] },
    { type: "callout", tone: "mistake", title: "Don’t skip the eye-pad check", text: "If the eye can’t fully close, or the pad is touching the eye, glue fumes and lower lashes can reach the eye. Fix the pad before you go any further." },
    { type: "checkpoint", question: "How often should you put down a fresh dot of glue?", options: ["Every 20–30 minutes", "Once per service", "Every 2 hours"], answer: 0, explain: "Put a fresh dot of glue down every 20–30 minutes." },
  ]
);

const L17 = lesson(
  "Applying the Lashes",
  "Steps 9–18: isolating, dipping, placing and finishing a full classic set.",
  [
    { type: "heading", text: "Application steps 9–18" },
    { type: "text", text: "Your client is ready and your station is set. Now, one lash at a time." },
    { type: "steps", start: 9, items: [
      { title: "Isolate one lash", text: "Using your tweezers, separate one eyelash at a time. Do NOT apply more than one eyelash extension to one natural lash." },
      { title: "Pick, dip, apply", text: "Pick up a lash, dip it in the glue and apply it to the natural lash. Use one very small bead of glue on the extension." },
      { title: "Alternate eyes", text: "If you are a beginner, alternate between the eyes every 2–3 lash applications. This gives the glue time to set." },
      { title: "Brush as you go", text: "Throughout the application, use a mascara wand to brush the extensions." },
      { title: "Build a full set", text: "A full set is on average 60–125 lashes per eye, or 95–99% of the natural lashes covered." },
      { title: "Alternate until complete", text: "Keep alternating until the set is complete on each eye." },
      { title: "Separate any stuck lashes", text: "Separate lashes that are stuck together, or stuck to the eye pad, with your tweezers and wands." },
      { title: "Cure", text: "Use the nano mister to cure the lashes." },
      { title: "Remove tape and pads", text: "Remove the tape and eye pads while her eyes are still closed." },
      { title: "Open slowly", text: "Help the client slowly open her eyes." },
    ] },
    { type: "callout", tone: "key", title: "One lash, one extension", text: "Gluing lashes together (a “sticky”) stops them shedding naturally and can pull out healthy lashes. Isolation is the most important skill you will practise." },
    { type: "checkpoint", question: "As a beginner, why do you alternate between eyes every 2–3 lashes?", options: ["To give the glue time to set", "To finish faster", "So the client can open one eye"], answer: 0, explain: "Alternating gives each lash time to set before you work next to it." },
    { type: "text", text: "Be sure to explain extension aftercare to your client before she leaves! That is the next lesson." },
  ]
);

const L18 = lesson(
  "Lash Aftercare",
  "The aftercare instructions you give every client, and why each one matters.",
  [
    { type: "heading", text: "Lash aftercare instructions" },
    { type: "quote", text: "Lashes are a luxury, and special care is required to maintain full, gorgeous lashes." },
    { type: "text", text: "Remember: once she walks out of the door, retention is in her hands. Aftercare is how you hand her the knowledge to keep her lashes looking full. Go through each point with her, and tick them off as you read." },
    { type: "list", style: "checklist", items: [
      "Do not pick or pull on your lashes.",
      "Avoid anything oily, because oil breaks down the glue. This includes oil-based make-up, mascara, eye creams, eye serums and lotions.",
      "Gently cleanse your lashes each night. We recommend a lash bath: it removes make-up build-up, dirt and oils without risking your retention.",
      "Brush your lashes daily. This helps them shed properly and keeps them straight and luxurious.",
      "Do not sleep on your face. Whichever side you sleep on will lose more lashes.",
      "Use a silk pillowcase. It is gentler on your lashes and your skin (and helps with wrinkles). Dust mites don’t like silk either. Double bonus!",
      "Do not wear false lashes over your extensions.",
    ] },
    { type: "checkpoint", question: "Why should clients avoid oily products around the eyes?", options: ["Oil breaks down the glue", "Oil makes lashes curl too much", "Oil changes the lash colour"], answer: 0, explain: "Avoid anything oily, because it degrades the glue." },
    { type: "callout", tone: "tip", title: "Make it easy for her", text: "Give each client a printed or WhatsApp copy of these instructions, so she has them at home." },
  ]
);

const L19 = lesson(
  "Removing Lash Extensions",
  "The safe, step-by-step way to take a set off, and the mistakes to avoid.",
  [
    { type: "heading", text: "Step-by-step removal procedure" },
    { type: "text", text: "Sooner or later a client will need her extensions taken off: for a fresh set, after a reaction, or simply because she wants a break. Removal uses a strong product right next to the eye, so it is done slowly and carefully." },
    { type: "steps", items: [
      { title: "Prepare the remover", text: "Use a professional eyelash extension glue remover." },
      { title: "Protect the skin", text: "Place under-eye pads, and tape or cotton pads on top of the eye pads. This is a must, to protect the sensitive skin around the eye from the strong remover." },
      { title: "Set out a drop", text: "Place a drop of lash glue remover on a surface." },
      { title: "Apply the remover", text: "Apply the remover to the eyelash extensions with a micro swab." },
      { title: "Wait", text: "Wait for approximately 5 minutes." },
      { title: "Remove the extensions", text: "Use a swab or tweezers to slide the extensions off." },
      { title: "Clean off the remover", text: "Use a fresh swab to clean any remaining remover off the natural lashes." },
      { title: "Rinse", text: "Soak a cotton pad or cotton swab in water and rinse the natural lashes thoroughly." },
      { title: "Dry and brush", text: "Dry the wet lashes with a mini fan, and brush them." },
      { title: "Done", text: "The eyelash extensions are removed!" },
    ] },

    { type: "heading", text: "Important points for removal" },
    { type: "compare", doLabel: "Do", dontLabel: "Don’t",
      do: ["Wait at least 5 minutes before you remove the extensions", "Cleanse the remover off the natural lashes thoroughly with a lash bath", "Clean off all remover before any water touches the lashes"],
      dont: ["Keep rubbing or fiddling with the extensions right after applying the remover", "Leave remover on the natural lashes", "Let the client wash her face before the remover is cleansed off"] },
    { type: "text", text: "Why so careful? Constantly rubbing the extensions right after applying the remover can cause itchiness. And remover left on the lashes can cause a **“blooming” effect** (a white, cloudy residue), irritate the eyes, or affect the retention of her next set." },
    { type: "checkpoint", question: "How long should you wait after applying the remover?", options: ["About 30 seconds", "At least 5 minutes", "30 minutes"], answer: 1, explain: "Wait at least 5 minutes before you remove the extensions." },
  ]
);

// ---------------------------------------------------------------------------
// Module 7: Your clients
// ---------------------------------------------------------------------------

const L20 = lesson(
  "Answering Client Questions",
  "The questions every client asks about lash extensions, and how to answer them.",
  [
    { type: "heading", text: "Client FAQs" },
    { type: "text", text: "These are the questions about semi-permanent eyelash extensions that we hear most often. Knowing the answers by heart makes you look (and feel) like the professional you are. Read each question, think about your answer, then tap the card to check." },

    { type: "heading", text: "1. Do eyelash extensions hurt?" },
    { type: "flip", prompt: "Tap the card", frontLabel: "Client asks", front: "Do eyelash extensions hurt?", backLabel: "You answer", back: "No. Applied correctly, they should not hurt." },
    { type: "text", text: "They are applied with professional tools by isolating one natural lash, and attaching one extension to it for classic lashes, or a fan for volume lashes. Nothing touches the skin." },

    { type: "heading", text: "2. Do eyelash extensions look fake?" },
    { type: "text", text: "Eyelash extensions can be applied to look any way the client wants. She can choose shorter, natural lashes, or large, dramatic ones. Eyelash extensions don’t look fake unless that is the look she is going for." },

    { type: "heading", text: "3. How long do eyelash extensions last?" },
    { type: "text", text: "Most eyelash extension adhesives bond for anywhere from 2 to 6 weeks. However, the extensions only last as long as the natural lash does." },
    { type: "text", text: "Like all hair on the body, eyelashes grow in stages. It is normal to lose 1–4 natural lashes per day, which is why a fill is recommended every 2–3 weeks. (You learned exactly why in the growth cycle lesson.)" },

    { type: "heading", text: "4. How much do eyelash extensions cost?" },
    { type: "text", text: "The price of lash extensions depends on the artist and the area. In Kenya, the price is between **KES 2,000 and KES 20,000.**" },

    { type: "heading", text: "5. Do eyelash extensions damage my natural lashes?" },
    { type: "flip", prompt: "Tap the card", frontLabel: "Client asks", front: "Will extensions damage my natural lashes?", backLabel: "You answer", back: "Not when applied correctly: one extension, the right weight and length, on one natural lash." },
    { type: "text", text: "Certified lash artists apply to only one natural lash at a time, and choose an extension of the right weight and length to protect the natural lash." },
    { type: "text", text: "Eyelash extensions can be damaging if the lash artist does not use proper technique. Lashes that are too heavy, or clusters (pre-made fans), hold a larger amount of adhesive and can cause the natural lash to break." },

    { type: "heading", text: "6. Can I wear mascara with my eyelash extensions?" },
    { type: "text", text: "Yes, she can! However, an oil-free, extension-safe mascara is recommended. That way the mascara does not interfere with the bond of the adhesive or cause the extensions to come off early." },

    { type: "heading", text: "7. Can I wear eye make-up with my eyelash extensions?" },
    { type: "text", text: "She most definitely can wear make-up with her eyelash extensions. When choosing make-up, it is best to go with extension-safe products. Extension-safe make-up is oil-free, usually contains sealers that make the extensions last longer, and works together with the extensions for the best look." },
    { type: "text", text: "If she uses regular make-up, she should use a daily cleanser with a make-up remover that is safe for lashes, to remove the residue at the end of each day." },
    { type: "checkpoint", question: "A client asks if she can keep wearing her usual oil-based mascara. What do you tell her?", options: ["Yes, any mascara is fine", "Use an oil-free, extension-safe mascara instead", "Mascara is never allowed"], answer: 1, explain: "Oil-free, extension-safe mascara won’t interfere with the bond or cause early separation." },
  ]
);

const L21 = lesson(
  "You’re Ready to Start",
  "Everything you have learned, in one place, before your final assessment.",
  [
    { type: "heading", text: "Look how far you’ve come" },
    { type: "text", text: "At the start of this course you were a beginner. Now you understand the natural lash and its growth cycle, you know your kit, you can keep your clients safe, you can design a set to suit any eye, and you know every step of the service from the waiver to removal." },
    { type: "list", style: "checklist", items: [
      "I understand the natural lash and its growth cycle",
      "I know every tool and product in my kit",
      "I keep my station, my tools and my client safe",
      "I can design a set: type, style, length and curl",
      "I can prepare, apply, aftercare and remove a set",
      "I can answer my clients’ questions with confidence",
    ] },
    { type: "heading", text: "Your entrepreneurship journey" },
    { type: "text", text: "This is where your journey as a lash entrepreneur begins. Practise on lash heads and models until isolation feels natural, keep your hygiene routine strict, and give every client the aftercare she needs. Happy clients come back every 2–3 weeks, and they bring their friends." },
    { type: "callout", tone: "key", title: "Final step", text: "Take the final assessment to complete the course and earn your certificate." },
  ]
);

const FINAL = quiz(
  "Final Assessment",
  "Twelve questions across the whole course. Score 70% to pass and earn your certificate.",
  [
    { q: "What are eyelash extensions used to enhance?", options: ["The length, curl, fullness and thickness of natural lashes", "The colour of the eyes", "Eyebrow shape"], answer: 0, explain: "Eyelash extensions enhance the length, curl, fullness and thickness of natural eyelashes." },
    { q: "Why do extensions usually last only 2–6 weeks?", options: ["Because natural lashes shed through their growth cycle", "Because the glue always fails after a week", "Because clients wash their face"], answer: 0, explain: "We lose natural lashes every day, and the extensions fall with them." },
    { q: "What does a small white ball at the end of a fallen lash tell you?", options: ["It shed in the telogen (resting) stage", "It was in the anagen stage", "The glue was too strong"], answer: 0, explain: "The white “root” shows the hair had already shed from the follicle in the telogen phase." },
    { q: "Which product strips oils and debris from the lashes before application?", options: ["Primer", "Glue remover", "Nano mister"], answer: 0, explain: "Primer strips debris and oils from the lashes, which improves retention." },
    { q: "What is the right order of decontamination, from lightest to strongest?", options: ["Cleaning, sanitising, disinfecting, sterilising", "Sterilising, cleaning, disinfecting, sanitising", "Sanitising, sterilising, cleaning, disinfecting"], answer: 0, explain: "Cleaning (soap and water), sanitising (alcohol), disinfecting (germicides), sterilising (high heat)." },
    { q: "How much time should you allow between lash services for cleaning?", options: ["None", "10–15 minutes", "2 hours"], answer: 1, explain: "Allow 10 to 15 minutes between lash services for cleaning and disinfecting." },
    { q: "Which client should be advised to avoid lash extensions?", options: ["A client with trichotillomania", "A client with short lashes", "A client with almond eyes"], answer: 0, explain: "People with alopecia or trichotillomania, or receiving radiation or chemotherapy, are advised to avoid extensions." },
    { q: "Which lash style places the longest lashes towards the outer edge?", options: ["Cat eye", "Doll eye", "Classic"], answer: 0, explain: "The cat eye uses the longest lashes towards the outside edge to create the illusion of wide-set eyes." },
    { q: "How long should you shake your glue before use?", options: ["5 seconds", "60 seconds", "5 minutes"], answer: 1, explain: "Shake your glue for 60 seconds, then put a pea-sized drop on your jade stone." },
    { q: "How many extensions go on one natural lash in a classic set?", options: ["One", "Two", "As many as fit"], answer: 0, explain: "Never apply more than one eyelash extension to one natural lash in a classic set." },
    { q: "When do you remove the tape and eye pads?", options: ["While the client’s eyes are still closed", "After she opens her eyes", "Before curing"], answer: 0, explain: "Remove the tape and eye pads while her eyes are still closed, then help her open them slowly." },
    { q: "What should you do after applying glue remover?", options: ["Rub the extensions straight away", "Wait at least 5 minutes, then remove and cleanse thoroughly", "Rinse with water immediately"], answer: 1, explain: "Wait at least 5 minutes, remove the extensions, then cleanse the remover off thoroughly before any water." },
  ]
);

export const BEGINNER_LASHTECH_GUIDE = {
  slug: "beginner-lashtech-guide",
  title: "Beginner Lashtech Guide - Start Here",
  subtitle: "Your first lash course · From the Lashes by Shazz Academy training manual",
  description:
    "Start your lash career here: how natural lashes grow, the tools in your kit, hygiene and client safety, choosing the right set, style and curl, and the full classic application, aftercare and removal.",
  about:
    "A classic lash extension course is the perfect course for you as a beginner, so that you can start working with clients and market yourself effectively.\n\n" +
    "You will learn how the natural lash grows and why it sheds, the tools and products on a lash station, how to clean, sanitise, disinfect and sterilise, how to spot and prevent allergic reactions, how to choose between classic, hybrid and volume, how to read eye shapes and map a cat eye, doll eye or wispy set, how to choose between C and D curl, and every step of a classic application, aftercare and removal. You will finish by learning to answer the questions every client asks.\n\n" +
    "The course is written to be read like a book, with quick questions inside each lesson and a short quiz after each part. Adapted from the Lashes by Shazz Academy training manual.",
  duration_label: "Self-paced",
  level: "beginner",
  category: "beginner",
  course_type: "story",
  reading_view: "article",
  hero_url: M + "cover.webp",
  is_free: true,
  price: 0,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  sort_order: 1,
  learn_points: [
    "Understand how natural lashes grow, rest and shed",
    "Keep your tools, station and clients safe",
    "Choose the right set, style, length and curl for every eye",
    "Apply, aftercare and remove a full classic set step by step",
  ],
  modules: [
    { title: "Start Here", lessons: [L1, L2] },
    { title: "The Natural Lash", lessons: [L3, L4, L5, Q1] },
    { title: "Your Lash Kit", lessons: [L6, L7] },
    { title: "Hygiene & Safety", lessons: [L8, L9, L10, L11, Q2] },
    { title: "Designing the Set", lessons: [L12, L13, L14, L15, Q3] },
    { title: "The Lash Service", lessons: [L16, L17, L18, L19] },
    { title: "Your Clients", lessons: [L20, L21, FINAL] },
  ],
};
