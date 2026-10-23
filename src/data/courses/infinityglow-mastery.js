// InfinityGlow™ Mastery: built from the deck "InfinityGlow Mastery Training" (17 slides, presented by Wanyama Evans).
// The slide text is kept word for word. Around it, each lesson adds short plain-language explanations so the
// course reads from top to bottom, and each slide layout is mapped to an interactive block (step-by-step
// reveals, flip cards, tick-off checklists, pros/cons, quick checks).
// The images were taken out of the PDF and cropped to what each slide shows: public/course-media/infinityglow-mastery/.
// Every lesson ends with the small centred Infinity Glow logo (logo-footer.webp).
//
// Generate the Supabase seed with:
// node scripts/course-to-sql.mjs src/data/courses/infinityglow-mastery.js
// (0020_course_infinityglow_mastery.sql was written from this file; see the header of that file.)

const M = "/course-media/infinityglow-mastery/";

const rm = (blocks) => Math.max(3, Math.round(blocks.length * 0.22));

const FOOT = { type: "figure", url: M + "logo-footer.webp", caption: "" };

const lesson = (title, summary, blocks, extra = {}) => {
  const all = [...blocks, FOOT];
  return { title, kind: "reading", summary, is_preview: false, read_minutes: rm(all), blocks: all, ...extra };
};

// ---------------------------------------------------------------------------
// Module 1: Theory
// ---------------------------------------------------------------------------

const L1 = lesson(
  "Welcome to InfinityGlow™ Mastery",
  "What Infinity Glow™ is, what you will learn, and how the course flows.",
  [
    { type: "heading", text: "INFINITYGLOW™ MASTERY: THE COMPREHENSIVE TRAINING MANUAL" },
    { type: "text", text: "Presented by Wanyama Evans" },
    { type: "figure", url: M + "cover.webp", caption: "UV lashes: positioned, flashed and locked" },

    { type: "heading", text: "What is Infinity Glow™?" },
    { type: "text", text: "Infinity Glow™ is a UV lash system. Instead of a glue that dries when it meets moisture in the air, it uses a glue that stays liquid until you shine a special UV light on it." },
    { type: "text", text: "When the light hits, the glue hardens in about 1.5 seconds and locks the extension onto the natural lash. No waiting, no drying time, no guessing." },
    { type: "text", text: "That one difference changes your whole service: how fast you work, how comfortable your client is, how long the set lasts, and how much you can charge for it." },

    { type: "heading", text: "How this course flows" },
    { type: "text", text: "The course has five short modules. Each one builds on the one before it, so work through them in order." },
    { type: "steps", items: [
      { title: "Theory", text: "How UV glue works and why it beats traditional glue." },
      { title: "Safety", text: "How to protect yourself and your client, and who should not be treated." },
      { title: "Technical", text: "Your equipment, lamp setup and how to store your glue." },
      { title: "Practical", text: "The LuminaLock™ method: five steps you can repeat on every lash." },
      { title: "Business", text: "What clients get, and why UV is a premium upgrade for you." },
    ] },
    { type: "callout", tone: "key", title: "Remember", text: "Safety comes before speed. UV light needs respect, so do not skip the safety module." },
    { type: "checkpoint", question: "What is the big difference with Infinity Glow™?", options: ["The glue hardens when UV light hits it", "The glue needs a very humid room", "The glue never hardens"], answer: 0, explain: "Infinity Glow™ stays liquid until the UV light hits it, then hardens in about 1.5 seconds." },
  ],
  { is_preview: true }
);

const L2 = lesson(
  "The Science of Photopolymerization",
  "Traditional lash glue is a “diva.” UV glue is an “engineer.”",
  [
    { type: "heading", text: "The Science of Photopolymerization" },
    { type: "quote", text: "Traditional lash glue is a “diva.” UV glue is an “engineer.”" },
    { type: "text", text: "Why a “diva”? Traditional glue is moody. It reacts to the moisture in the air, so the room, the weather and even your client’s breath change how it behaves. You have to work around it." },
    { type: "text", text: "Why an “engineer”? UV glue does exactly what you tell it to, exactly when you tell it to. It stays liquid until you switch on the light." },
    { type: "figure", url: M + "glue-comparison.webp", caption: "Traditional glue (left) and Infinity Glow™ (right)" },
    { type: "text", text: "Tap each card to see what sets it off." },
    { type: "flip", prompt: "Tap the card", frontLabel: "H₂O", front: "TRADITIONAL GLUE", backLabel: "TRADITIONAL GLUE", back: "Moisture Activated: it starts hardening when it meets water vapour in the air, so you cannot control when." },
    { type: "flip", prompt: "Tap the card", frontLabel: "UV", front: "INFINITY GLOW™", backLabel: "INFINITY GLOW™", back: "Light Activated: it only hardens when the UV lamp shines on it, so you decide when." },
    { type: "checkpoint", question: "What activates INFINITY GLOW™ glue?", options: ["Moisture", "Light", "Heat"], answer: 1, explain: "Traditional glue is moisture activated. Infinity Glow™ is light activated." },

    { type: "heading", text: "Cyanoacrylate vs. Photo-Initiators" },
    { type: "text", text: "Two ingredients explain the difference. Traditional lash glue is made of cyanoacrylate, which turns solid when it reacts with moisture. Infinity Glow™ contains photo-initiators, special molecules that start the hardening only when UV light reaches them." },
    { type: "figure", url: M + "uv-lamp-head.webp", caption: "The lamp head that delivers the UV light" },
    { type: "text", text: "**TRADITIONAL GLUE**" },
    { type: "text", text: "Follow the three stages, one at a time." },
    { type: "steps", items: [
      { title: "Moisture", text: "Water in the air touches the glue." },
      { title: "Polymerization", text: "The glue’s tiny molecules start linking into long chains." },
      { title: "Bond", text: "The chains set solid and the lash is held." },
    ] },
    { type: "text", text: "**INFINITY GLOW™ GLUE**" },
    { type: "steps", items: [
      { title: "Liquid", text: "The glue stays soft and workable on the lash for as long as you need." },
      { title: "395nm UV Light", text: "You flash the lamp. 395nm is the UV wavelength that wakes up the photo-initiators." },
      { title: "Photopolymerization", text: "“Photo” means light. The light triggers the same linking of molecules, but on your command." },
      { title: "Solid Flexible Bond", text: "The glue sets in about 1.5 seconds into a bond that is solid yet flexible, so it moves with the lash." },
    ] },
    { type: "callout", tone: "tip", title: "Think of it like a dental filling", text: "*Think of it like a dental filling: a soft resin that only hardens the instant a curing light hits it.*" },
    { type: "text", text: "The dentist shapes the filling while it is soft, and it only turns rock hard when they click the blue light. We do the same for lashes: you shape and place, then you flash." },
    { type: "checkpoint", question: "Which light cures INFINITY GLOW™ glue?", options: ["395nm UV Light", "Daylight from a window", "A ring light"], answer: 0, explain: "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond." },
  ]
);

const L3 = lesson(
  "Why UV Lashes? (Value Proposition)",
  "Instant oil-proofing, low fumes, and why it matters in Nairobi.",
  [
    { type: "heading", text: "Why UV Lashes? (Value Proposition)" },
    { type: "text", text: "Now that you know how UV glue works, here is what it gives you and your clients. Two benefits matter most." },
    { type: "steps", items: [
      { title: "Instant Oil-Proofing", text: "UV lashes are cured 100% before the client even opens their eyes. Traditional lashes often fail because clients use oily face creams or sweat at the gym too soon. A bond that has already fully set is not affected." },
      { title: "Low Fumes", text: "Because the glue cures in 1.5 seconds, there is no \"off-gassing\" (the stinging sensation) for the next 24 hours." },
    ] },
    { type: "text", text: "In plain words: the bond is finished the moment you flash it. Nothing is left half-dry on the lash, so there is nothing left to sting the eyes or be spoilt by oil." },

    { type: "heading", text: "Why this matters in Nairobi" },
    { type: "text", text: "Traditional glue needs the air to be “just right”. In Nairobi it rarely is, and that is where UV glue wins." },
    { type: "callout", tone: "key", title: "WHY THIS MATTERS IN NAIROBI", text: "If Nairobi is too dry (January) or too humid (April), the glue turns brittle or \"shocks.\" Dust, heat and long commutes mean clients need a bond that locks in instantly — no waiting, no smudging." },
    { type: "text", text: "Because Infinity Glow™ cures with light and not with humidity, you get the same reliable result in January and in April." },
    { type: "checkpoint", question: "How long does the glue take to cure?", options: ["1.5 seconds", "24 hours", "20–30 minutes"], answer: 0, explain: "Because the glue cures in 1.5 seconds, there is no \"off-gassing\" for the next 24 hours." },
  ]
);

// ---------------------------------------------------------------------------
// Module 2: Safety
// ---------------------------------------------------------------------------

const L4 = lesson(
  "Health, Safety & Contraindications",
  "Safety is not an option. It is the foundation of our premium status.",
  [
    { type: "heading", text: "Health, Safety & Contraindications" },
    { type: "quote", text: "Safety is not an option. It is the foundation of our premium status." },
    { type: "text", text: "UV light is what makes this technology special, and it is also why we protect everyone in the room. Clients pay premium prices because they trust you, and safety is how you earn that trust." },
    { type: "text", text: "We protect everyone with one simple system with three parts." },
    { type: "text", text: "**THE TRIPLE-SHIELD SAFETY PROTOCOL**" },
    { type: "list", style: "numbered", items: ["Technician Shield", "Client Shield", "Beam Shield"] },

    { type: "heading", text: "The Triple-Shield Protocol" },
    { type: "text", text: "Here is what each shield means in practice. Tap through them one at a time." },
    { type: "steps", items: [
      { title: "Technician Shield", text: "UV400 certified safety glasses. Just as a welder protects their eyes, you protect yours from the flash of 100+ lashes in every set." },
      { title: "Client Shield", text: "Black, non-reflective eye pads and complete eye closure. Place the pad and check that none of the white of the eye shows. If the eye will not stay fully closed, gently tape the top lid." },
      { title: "Beam Shield", text: "Lamp positioned toward the lash base at all times. The light lands on the lash base, never on the client’s skin or your own hands." },
    ] },
    { type: "figure", url: M + "uv-protection-demo.webp", caption: "UV Lashes Protection demonstration" },
    { type: "text", text: "In the photo you can see all three shields working together: safety glasses on the technician, eye pads on the client, and the lamp aimed at the lash base." },
    { type: "checkpoint", question: "What does the Technician Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads", "Lamp positioned toward the lash base"], answer: 0, explain: "Technician Shield: UV400 certified safety glasses." },
    { type: "checkpoint", question: "What does the Client Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads and complete eye closure", "A foot pedal"], answer: 1, explain: "Client Shield: black, non-reflective eye pads and complete eye closure." },
  ]
);

const L5 = lesson(
  "Screening for Contraindications (The \"No-Go\" List)",
  "Before every procedure, screen for the No-Go list.",
  [
    { type: "heading", text: "Screening for Contraindications (The \"No-Go\" List)" },
    { type: "text", text: "A contraindication is a reason not to go ahead with a treatment. Some health conditions and medicines make UV light a bad idea, so you check before you ever pick up the lamp." },
    { type: "text", text: "The order never changes. You talk to the client, you complete the checklist, and only then do you start." },
    { type: "steps", items: [
      { title: "CONSULTATION", text: "Talk with the client about her health, medicines and expectations." },
      { title: "CHECKLIST", text: "Go through the No-Go list below, one item at a time." },
      { title: "PROCEDURE", text: "Only when the checklist is complete and clear do you begin." },
    ] },
    { type: "text", text: "**BEFORE EVERY PROCEDURE, SCREEN FOR:**" },
    { type: "text", text: "Tick each item as you read it. These are the four things you ask about every time." },
    { type: "list", style: "checklist", items: [
      "Roaccutane or certain antibiotics",
      "Lupus",
      "History of light-triggered epilepsy",
      "Recent Lasik surgery",
    ] },
    { type: "text", text: "Why these four? Roaccutane and some antibiotics make the skin sensitive to light. Lupus and light-triggered epilepsy can react badly to the UV flash. And eyes that have just had Lasik surgery need time to heal." },
    { type: "callout", tone: "mistake", title: "Example: recent Lasik", text: "A client who had Lasik surgery last month is a No-Go. She can have UV lashes once she is 6 months past the surgery." },
    { type: "text", text: "If the answer to any of these is yes, or you are not sure, do not carry on with UV lashes. The client can be offered a different service, and she can come back once a doctor has cleared her." },
    { type: "callout", tone: "key", title: "Remember", text: "*The checklist must be completed before every procedure begins.*" },
    { type: "figure", url: M + "uv-lash-application.webp", caption: "A client’s eyes are closed and padded before any flash" },
    { type: "checkpoint", question: "Which of these is on the \"No-Go\" list?", options: ["Recent Lasik surgery", "Oily skin", "Short natural lashes"], answer: 0, explain: "Screen for: Roaccutane or certain antibiotics, Lupus, history of light-triggered epilepsy, and recent Lasik surgery." },
  ]
);

// ---------------------------------------------------------------------------
// Module 3: Technical
// ---------------------------------------------------------------------------

const L6 = lesson(
  "Equipment Mastery",
  "Your tools are an extension of your body.",
  [
    { type: "heading", text: "Equipment Mastery" },
    { type: "text", text: "*Your tools are an extension of your body. Here is what you will use:*" },
    { type: "text", text: "A UV set-up is simple. Three main pieces do the work, and the rest of the kit supports them." },
    { type: "figure", url: M + "equipment-kit.webp", caption: "The lamp, UV glue, eye pads, safety glasses and foot pedal" },
    { type: "list", style: "numbered", items: ["LAMP", "GOOSENECK", "FOOT PEDAL"] },
    { type: "text", text: "The **lamp** makes the 395nm UV light. The **gooseneck** is the bendy arm that lets you place that light exactly where you need it. The **foot pedal** switches the light on, so both your hands stay free for the lash." },

    { type: "heading", text: "Infinity Glow™ Lamp Setup" },
    { type: "text", text: "Set up the same way every time. Four small decisions give you a safe, comfortable set-up." },
    { type: "steps", items: [
      { title: "Position", text: "Place the lamp base on the non-dominant hand side. Your working hand stays free and the lamp stays out of its way." },
      { title: "Distance", text: "The \"Gooseneck\" should be 10–15cm away from the eye. This is close enough to cure and far enough to be comfortable." },
      { title: "Foot Pedal", text: "Place it where your foot rests naturally, so you never have to look down or stretch for it." },
      { title: "The Tap", text: "Practice \"The Tap\"—a quick press for 1.5 seconds. That is all the glue needs." },
    ] },
    { type: "text", text: "**A quick note about the UV light -**" },
    { type: "text", text: "Distance is the thing to get right. Tap each card to see what happens when it is wrong." },
    { type: "flip", prompt: "Tap the card", frontLabel: "If", front: "Too far", backLabel: "→", back: "incomplete curing: at 20cm or more the light is too weak by the time it reaches the glue, so the bond does not fully set." },
    { type: "flip", prompt: "Tap the card", frontLabel: "If", front: "Too close", backLabel: "→", back: "uncomfortable heat: under 5cm the client feels warmth on her skin, so back the lamp off to 10–15cm." },
    { type: "checkpoint", question: "How far should the \"Gooseneck\" be from the eye?", options: ["2–5cm", "10–15cm", "30–40cm"], answer: 1, explain: "The \"Gooseneck\" should be 10–15cm away from the eye." },
  ]
);

const L7 = lesson(
  "Protect Your UV Glue",
  "UV glue is light-sensitive.",
  [
    { type: "heading", text: "Protect Your UV Glue" },
    { type: "text", text: "*UV glue is light-sensitive.*" },
    { type: "text", text: "The same light that cures the glue on the lash can also cure it in the bottle, or on the glue stone, if you are careless. Bright light is its enemy." },
    { type: "callout", tone: "key", title: "Remember", text: "**ALWAYS STORE IN THE BLACKOUT FOIL BAG**" },
    { type: "figure", url: M + "blackout-foil-bag.webp", caption: "The blackout foil bag keeps light out" },
    { type: "text", text: "Here is what can go wrong in real life." },
    { type: "text", text: "If you leave your glue stone under a bright window in a Westlands apartment, the glue will cure on the stone before you even touch a lash." },
    { type: "text", text: "A wasted drop of glue costs money, and glue that has half-cured gives you a weak bond. Put the glue back in the foil bag every time you finish, and keep it away from windows." },
    { type: "checkpoint", question: "Where should UV glue always be stored?", options: ["Under a bright window", "In the blackout foil bag", "On the glue stone"], answer: 1, explain: "ALWAYS STORE IN THE BLACKOUT FOIL BAG." },
  ]
);

// ---------------------------------------------------------------------------
// Module 4: Practical
// ---------------------------------------------------------------------------

const L8 = lesson(
  "The LuminaLock™ Method",
  "SPEED + PRECISION = PROFIT",
  [
    { type: "heading", text: "The LuminaLock™ Method" },
    { type: "quote", text: "SPEED + PRECISION = PROFIT" },
    { type: "text", text: "Precision gives you a clean, safe set that lasts. Speed lets you do more clients in a day. Together they are what turns your skill into profit." },
    { type: "text", text: "LuminaLock™ is our method for getting both. It has five parts, and you do them in the same order on every single lash." },
    { type: "figure", url: M + "gooseneck-lamp.webp", caption: "The lamp, gooseneck and foot pedal in position" },
    { type: "list", style: "numbered", items: ["Isolation", "The Dip", "Attachment", "The Flash", "The Release"] },

    { type: "heading", text: "The 5-Step Application" },
    { type: "text", text: "Here is what you do at each step. Tap through them in order." },
    { type: "steps", items: [
      { title: "ISOLATE", text: "Isolate one healthy natural lash. Separate it cleanly so the extension only touches that one lash." },
      { title: "DIP", text: "Dip extension 2mm. Just the tip goes in, and you need less glue than with traditional glue." },
      { title: "ATTACH", text: "Position and align. The glue will not set until you flash, so take your time: slide the extension until the alignment is perfect." },
      { title: "FLASH", text: "Flash for 1.5 seconds. Tap the pedal once and the glue is set, so nothing can move." },
      { title: "RELEASE", text: "Release isolation. Let go of the natural lash and move on to the next one." },
    ] },
    { type: "callout", tone: "key", title: "Remember", text: "*This is the most important practical training slide — practice each step until it is muscle memory.*" },
    { type: "text", text: "When the five steps feel automatic, your hands stay calm and quick. That is how a skilled UV technician works." },
    { type: "checkpoint", question: "What comes straight after ATTACH?", options: ["DIP", "FLASH", "RELEASE"], answer: 1, explain: "ISOLATE → DIP → ATTACH → FLASH → RELEASE." },
    { type: "checkpoint", question: "How far do you dip the extension?", options: ["2mm", "10mm", "15mm"], answer: 0, explain: "DIP: Dip extension 2mm." },
  ]
);

const L9 = lesson(
  "The “No Stickies” Advantage",
  "Traditional lashing vs. UV lashing.",
  [
    { type: "heading", text: "The “No Stickies” Advantage" },
    { type: "text", text: "A “sticky” is a lash that is still tacky and not yet set. With traditional glue you have to wait for each one to dry, and a lash that moves too soon can stick to its neighbour." },
    { type: "text", text: "Tap the card to compare how each method works." },
    { type: "flip", prompt: "Tap the card", frontLabel: "TRADITIONAL LASHING", front: "“Wait for the glue to tack before moving.”", backLabel: "UV LASHING", back: "“Position → Flash → Locked.” Each lash is finished the moment you flash it." },
    { type: "text", text: "With UV there is no waiting. You position the lash, flash it, and it is locked. You can move straight on." },
    { type: "text", text: "Those saved seconds on every lash add up over a full set." },
    { type: "callout", tone: "key", title: "20–30 MINUTES", text: "POTENTIAL SERVICE-TIME REDUCTION" },
    { type: "text", text: "Less time per client means a more comfortable client and more bookings in your day." },
    { type: "checkpoint", question: "What is the potential service-time reduction with UV lashing?", options: ["5 minutes", "20–30 minutes", "2 hours"], answer: 1, explain: "20–30 MINUTES: POTENTIAL SERVICE-TIME REDUCTION." },
  ]
);

// ---------------------------------------------------------------------------
// Module 5: Business
// ---------------------------------------------------------------------------

const L10 = lesson(
  "UV Lashes: The Client Experience",
  "Pros and cons for the client.",
  [
    { type: "heading", text: "UV Lashes: The Client Experience" },
    { type: "text", text: "To sell UV lashes well, you need to be honest about what the client gets. Here are the good things and the trade-offs." },
    { type: "compare", doLabel: "PROS", dontLabel: "CONS",
      do: ["Instant shower / gym / swim", "4–8 week retention", "Comfort", "Less stinging or red eyes"],
      dont: ["Higher premium cost", "Eyes must remain closed / still", "Sensitivity restrictions"] },
    { type: "text", text: "**The pros.** Because the glue is fully cured at once, clients can shower, work out or swim straight away. The lashes last 4–8 weeks, and the service is gentler on the eyes." },
    { type: "text", text: "**The cons.** The service costs more. The client must keep her eyes closed and still while you flash. And clients with sensitivities or on the No-Go list cannot have it." },
    { type: "text", text: "Explain both sides up front. Clients who know what to expect are happier, and they are glad to pay for the result." },
    { type: "checkpoint", question: "What retention do UV lashes give?", options: ["1 week", "4–8 week retention", "6 months"], answer: 1, explain: "PROS: 4–8 week retention." },
  ]
);

const L11 = lesson(
  "Why Technicians Should Learn UV",
  "Exclusivity, higher payout, efficiency and a business upgrade.",
  [
    { type: "heading", text: "Why Technicians Should Learn UV" },
    { type: "text", text: "UV is a great result for the client, and it is also a smart business move for you. There are four reasons. Tap each card to read it." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "EXCLUSIVITY", backLabel: "EXCLUSIVITY", back: "Be among the few offering the technology. When few techs offer it, clients come to you." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "HIGHER PAYOUT", backLabel: "HIGHER PAYOUT", back: "Charge more for retention assurance. A set that lasts longer is worth a higher price." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "EFFICIENCY", backLabel: "EFFICIENCY", back: "Fewer stickies means faster service. You finish sooner and can book more clients." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "BUSINESS UPGRADE", backLabel: "BUSINESS UPGRADE", back: "Premium technology, premium positioning. You become the lash artist known for the best." },
    { type: "text", text: "Learning UV does ask something of you. Be ready for these three things:" },
    { type: "list", style: "dot", items: ["Investment — the lamp and glue cost more to start", "Learning Curve — it takes practice to get the five steps smooth", "Safety Discipline — you follow the Triple-Shield protocol every single time"] },
    { type: "text", text: "Put together, you earn more per set, work faster and stand apart from other techs. That is why UV is worth the effort." },
  ]
);

const L12S = lesson(
  "Selling UV Lashes",
  "Simple scripts for offering UV lashes to clients and for recruiting students.",
  [
    { type: "heading", text: "Talking to your clients" },
    { type: "text", text: "Now you know why UV lashes are worth it, you need to be able to say so in a few friendly words. Lead with what the client gets, not with the technology." },
    { type: "text", text: "Here is how the trainer offers it to a regular housecall client:" },
    { type: "callout", tone: "tip", title: "Script: the upsell to a housecall client", text: "Hi [Client Name]! I noticed you have a busy week ahead. Would you like to try our new Infinity Glow™ UV technology? It’s the latest in the industry. The best part? You don't have to wait 24 hours to shower or hit the gym—it’s waterproof instantly. Plus, while normal lashes last 2-3 weeks, these stay flawless for a full month. Since you’re a regular, we’re keeping it at your normal rate until March!" },
    { type: "text", text: "Notice what the script does: it starts with her busy week, names the biggest benefit (shower and gym straight away), compares retention with normal lashes, and gives a regular a reason to say yes now. Change the offer at the end to suit your own prices." },

    { type: "heading", text: "Talking to future students" },
    { type: "text", text: "If you train other techs, speak to their pain first: humidity and lashes that fall out too soon. Then show UV as the way out." },
    { type: "callout", tone: "tip", title: "Script: recruiting a new student", text: "Stop struggling with Nairobi’s humidity and client complaints about falling lashes. Our Advanced UV Masterclass gives you the tech to guarantee 4-week retention. You aren't just buying a kit; you're buying a business upgrade. By the time other salons catch up, you’ll already be the 'Retention Queen' of your neighborhood. With the kit included, you’ll break even on your 50k investment in just 10 clients. Ready to lead 2026?" },
    { type: "checkpoint", question: "What does the client script lead with?", options: ["What the client gets: no waiting to shower or hit the gym", "The chemistry of photo-initiators", "The price of the lamp"], answer: 0, explain: "Lead with what the client gets. The best part: you don't have to wait 24 hours to shower or hit the gym." },
  ]
);

const L12 = lesson(
  "You’re Now Ready to Glow",
  "Master the Technology, Protect Your Clients, Deliver Better Retention, Build a Premium Business.",
  [
    { type: "heading", text: "YOU’RE NOW READY TO GLOW" },
    { type: "text", text: "You have worked through the whole course. Here is a final checklist of what you can now do. Tick each one off." },
    { type: "list", style: "checklist", items: ["Master the Technology", "Protect Your Clients", "Deliver Better Retention", "Build a Premium Business"] },
    { type: "text", text: "**Master the Technology.** You know how UV glue cures, how to set up your lamp and how to apply with LuminaLock™." },
    { type: "text", text: "**Protect Your Clients.** You use the Triple-Shield protocol and screen with the No-Go list every time." },
    { type: "text", text: "**Deliver Better Retention.** Your instant cure gives clients lashes that last 4–8 weeks." },
    { type: "text", text: "**Build a Premium Business.** You can offer a premium service and charge for it." },
    { type: "text", text: "**INFINITYGLOW™**" },
    { type: "text", text: "Next, take the final assessment. Practise the five steps until they feel automatic. Good luck, and glow on!" },
  ]
);

const FINAL = {
  title: "Final assessment",
  kind: "assessment",
  summary: "Review the InfinityGlow™ Mastery course. Score 70% to pass.",
  is_preview: false,
  read_minutes: 0,
  blocks: [
    {
      type: "quiz",
      passScore: 70,
      questions: [
        { q: "What activates traditional lash glue?", options: ["Moisture", "395nm UV Light", "Heat"], answer: 0, explain: "TRADITIONAL GLUE: Moisture Activated. INFINITY GLOW™: Light Activated." },
        { q: "What is the INFINITY GLOW™ GLUE sequence?", options: ["Moisture → Polymerization → Bond", "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond", "Dip → Wait → Tack → Bond"], answer: 1, explain: "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond." },
        { q: "Why are there low fumes with UV glue?", options: ["The glue cures in 1.5 seconds, so there is no \"off-gassing\" for the next 24 hours", "The glue has no smell", "The client wears a mask"], answer: 0, explain: "Because the glue cures in 1.5 seconds, there is no \"off-gassing\" (the stinging sensation) for the next 24 hours." },
        { q: "What does the Beam Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads", "Lamp positioned toward the lash base at all times"], answer: 2, explain: "Beam Shield: lamp positioned toward the lash base at all times." },
        { q: "Which of these is NOT on the \"No-Go\" list?", options: ["Lupus", "History of light-triggered epilepsy", "4–8 week retention"], answer: 2, explain: "The No-Go list is Roaccutane or certain antibiotics, Lupus, history of light-triggered epilepsy, and recent Lasik surgery." },
        { q: "When must the contraindications checklist be completed?", options: ["After the procedure", "Before every procedure begins", "Only for new clients"], answer: 1, explain: "The checklist must be completed before every procedure begins." },
        { q: "Where should the lamp base be placed?", options: ["On the non-dominant hand side", "On the dominant hand side", "Behind the client"], answer: 0, explain: "Position: place the lamp base on the non-dominant hand side." },
        { q: "What happens if the UV light is too far?", options: ["Uncomfortable heat", "Incomplete curing", "Faster curing"], answer: 1, explain: "If too far → incomplete curing. If too close → uncomfortable heat." },
        { q: "A client had Lasik surgery last month. When can she have UV lashes?", options: ["Today", "Once she is 6 months past the surgery", "Never"], answer: 1, explain: "Recent Lasik is on the No-Go list. She can have UV lashes once she is 6 months past the surgery." },
        { q: "How long is the FLASH in the 5-Step Application?", options: ["0.5 seconds", "1.5 seconds", "15 seconds"], answer: 1, explain: "FLASH: Flash for 1.5 seconds." },
        { q: "Which is a CON of UV lashes for the client?", options: ["Instant shower / gym / swim", "Comfort", "Eyes must remain closed / still"], answer: 2, explain: "CONS: higher premium cost, eyes must remain closed / still, sensitivity restrictions." },
      ],
    },
  ],
};

export const INFINITYGLOW_MASTERY = {
  slug: "infinityglow-mastery",
  title: "InfinityGlow™ Mastery",
  subtitle: "The Comprehensive Training Manual · Presented by Wanyama Evans",
  description:
    "UV lashes are the premium upgrade every lash tech can offer: more revenue per set, a premium service, 4–6 weeks retention, and instant curing so your results never depend on humidity.",
  level: "advanced",
  category: "advanced",
  course_type: "story",
  hero_url: M + "cover.webp",
  is_free: false,
  price: 30000,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  sort_order: 20,
  learn_points: ["Charge a premium and earn more revenue per set", "Offer a premium service with 4–6 weeks retention", "Cure instantly so humidity never affects your results", "Protect your clients with the Triple-Shield safety protocol"],
  modules: [
    { title: "Theory", lessons: [L1, L2, L3] },
    { title: "Safety", lessons: [L4, L5] },
    { title: "Technical", lessons: [L6, L7] },
    { title: "Practical", lessons: [L8, L9] },
    { title: "Business", lessons: [L10, L11, L12S, L12, FINAL] },
  ],
};
