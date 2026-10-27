// InfinityGlow™ Mastery, rewritten as an ARTICLE-mode course (same format as the Beginner Lashtech Guide).
// Sources: the deck "InfinityGlow Mastery Training" (17 slides) and the trainer's manual "Infinity Glow™ Mastery:
// The Comprehensive Training Manual" (Wanyama Evans). Every fact, number and script from the trainer is kept; the
// prose around it is written to walk the student through each idea: ask the question, answer it plainly, give an
// example, then check understanding. The modules follow the ideas (how the glue works, staying safe, kit and glue
// care, the method, the business case), not the order of the slides.
//
// Article mode only: 0038 sets courses.reading_view = 'article' (see 0037 for how that switch works).
// Images: public/course-media/infinityglow-mastery/ (unchanged). Every lesson ends with the small centred logo.
//
// Generate the Supabase seed with:
// node scripts/course-to-sql.mjs src/data/courses/infinityglow-mastery.js
// (0038_infinityglow_article_rewrite.sql was written from this file; see the header of that file.)

const M = "/course-media/infinityglow-mastery/";

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
  "Welcome to InfinityGlow™ Mastery",
  "What Infinity Glow™ is, what it changes for you and your clients, and how this course is laid out.",
  [
    { type: "heading", text: "InfinityGlow™ Mastery: the comprehensive training manual" },
    { type: "text", text: "Presented by Wanyama Evans" },
    { type: "figure", url: M + "cover.webp", caption: "UV lashes: positioned, flashed and locked" },

    { type: "heading", text: "What is Infinity Glow™?" },
    { type: "text", text: "Infinity Glow™ is UV lash technology. Instead of a glue that dries on its own, it uses a glue that stays liquid until you shine a special UV light on it. When the light hits, the glue turns into a solid, flexible bond in about **1.5 seconds** and locks the extension onto the natural lash." },
    { type: "text", text: "That sounds like a small change. It is not. It changes how fast you work, how comfortable your client is, how long the set lasts and how much you can charge for it." },
    { type: "text", text: "The trainer sums up the whole idea in one picture, and we will come back to it again and again:" },
    { type: "quote", text: "Traditional lash glue is a “diva.” UV glue is an “engineer.”" },
    { type: "text", text: "A diva needs everything to be perfect before she will perform: the right humidity, the right temperature, the right moment. An engineer does exactly what you tell them, exactly when you tell them. By the end of this course you will know why that difference matters so much." },

    { type: "heading", text: "How this course flows" },
    { type: "text", text: "The course is written to be read like a book, from top to bottom. Each part answers the question the part before it raises, so take it in order. You will find quick questions inside the lessons and a short quiz at the end of the bigger parts." },
    { type: "steps", items: [
      { title: "How UV glue works", text: "Why traditional glue is a diva, what actually happens when UV light hits the glue, and why this matters in Nairobi." },
      { title: "Staying safe under UV", text: "The Triple-Shield protocol that protects you, your client and the beam, and the “No-Go” list of clients who should not be treated." },
      { title: "Your kit and your glue", text: "The equipment, how to set up your lamp, and how to keep UV glue from curing before you use it." },
      { title: "The LuminaLock™ method", text: "Five steps you repeat on every lash, and why they save you 20–30 minutes a set." },
      { title: "UV for your clients and your business", text: "What clients get, why technicians should learn UV, and the scripts for selling it." },
    ] },
    { type: "callout", tone: "key", title: "Remember", text: "Safety is not an option. It is the foundation of our premium status. Do not skip the safety module." },
    { type: "checkpoint", question: "What is the big difference with Infinity Glow™?", options: ["The glue hardens when UV light hits it", "The glue needs a very humid room", "The glue never hardens"], answer: 0, explain: "Infinity Glow™ stays liquid until the UV light hits it, then turns into a solid, flexible bond in about 1.5 seconds." },
  ],
  { is_preview: true }
);

// ---------------------------------------------------------------------------
// Module 2: How UV glue works
// ---------------------------------------------------------------------------

const L2 = lesson(
  "Diva or Engineer? Two Ways to Glue a Lash",
  "Why traditional glue is moisture activated, why UV glue is light activated, and why who is in control matters.",
  [
    { type: "heading", text: "Two kinds of glue, two ways to trigger them" },
    { type: "text", text: "Every lash glue has one job: stay liquid long enough for you to place the extension, then turn solid and hold it. The real question is what tells the glue to switch from liquid to solid. For the two glues in this course, the answer is completely different." },
    { type: "figure", url: M + "glue-comparison.webp", caption: "Traditional glue (left) and Infinity Glow™ (right)" },

    { type: "heading", text: "Traditional glue: the diva" },
    { type: "text", text: "Traditional lash glue is triggered by **moisture in the air.** It starts drying the moment it meets water vapour, and you cannot tell it to wait." },
    { type: "text", text: "This is why the trainer calls it a diva. It needs perfect humidity and temperature to dry properly. On a good day it behaves. On a bad day, you work around its moods." },
    { type: "flip", prompt: "Tap the card", frontLabel: "H₂O", front: "TRADITIONAL GLUE", backLabel: "Moisture activated", back: "It starts hardening when it meets moisture in the air, so the room decides when it dries, not you." },

    { type: "heading", text: "Infinity Glow™: the engineer" },
    { type: "text", text: "Infinity Glow™ is triggered by **light.** It stays liquid for as long as you need, even if the room is hot, cold, dry or humid. It only hardens when you shine the UV lamp on it." },
    { type: "text", text: "That is why the trainer calls it an engineer: it only works when you tell it to." },
    { type: "flip", prompt: "Tap the card", frontLabel: "UV", front: "INFINITY GLOW™", backLabel: "Light activated", back: "It only hardens when the UV lamp shines on it, so you decide exactly when." },

    { type: "heading", text: "Why control matters" },
    { type: "text", text: "Picture placing an extension with traditional glue. The clock starts the moment the glue leaves the stone, and the room is also helping it dry. You have to place the lash quickly and get it right the first time." },
    { type: "text", text: "Now picture the same moment with UV glue. There is no clock. You can place the lash, look at it, slide it a little, and only flash the lamp when you are completely happy. The glue waits for you." },
    { type: "callout", tone: "tip", title: "In one line", text: "Traditional glue: the weather decides when it dries. UV glue: you decide." },
    { type: "checkpoint", question: "What activates INFINITY GLOW™ glue?", options: ["Moisture", "Light", "Heat"], answer: 1, explain: "Traditional glue is moisture activated. Infinity Glow™ is light activated: it only hardens when the UV lamp shines on it." },
  ]
);

const L3 = lesson(
  "Inside the Bond: Photopolymerization",
  "The science in plain words: cyanoacrylate, photo-initiators, and what happens in the 1.5 seconds of the flash.",
  [
    { type: "heading", text: "A big word with a simple meaning" },
    { type: "text", text: "**Photopolymerization** sounds like something from a chemistry exam. Let’s break it into two pieces:" },
    { type: "list", style: "dot", items: [
      "**Photo** means light.",
      "**Polymerization** means small molecules linking together into long chains, which turns a liquid into a solid.",
    ] },
    { type: "text", text: "So photopolymerization simply means: *light makes the glue’s tiny molecules link up and turn solid.* Traditional glue does the same linking, but it is triggered by moisture instead of light." },
    { type: "figure", url: M + "uv-lamp-head.webp", caption: "The lamp head that delivers the UV light" },

    { type: "heading", text: "Traditional glue: cyanoacrylate and moisture" },
    { type: "text", text: "Traditional lash glue is made of cyanoacrylate. Moisture in the air triggers it, so the glue dries through polymerization on its own schedule. Follow the three stages one at a time:" },
    { type: "steps", items: [
      { title: "Moisture", text: "Moisture in the air reaches the glue." },
      { title: "Polymerization", text: "The moisture triggers polymerization: the molecules begin linking into chains." },
      { title: "Bond", text: "The glue dries into the bond and the lash is held." },
    ] },
    { type: "text", text: "The weak spot is the first step. Moisture in the air is not something you control. If Nairobi is too dry (January) or too humid (April), the glue turns brittle or “shocks.”" },

    { type: "heading", text: "Infinity Glow™: photo-initiators and light" },
    { type: "text", text: "Infinity Glow™ contains **photo-initiators.** An initiator is a starter: it is the part of the glue that starts the hardening. These photo-initiators stay liquid indefinitely, until they are hit by one specific wavelength of UV light: **395nm.**" },
    { type: "text", text: "At that exact second, they undergo photopolymerization and turn into a solid, flexible plastic bond. Follow the four stages:" },
    { type: "steps", items: [
      { title: "Liquid", text: "The photo-initiators remain liquid indefinitely. Nothing is happening, and there is no rush." },
      { title: "395nm UV Light", text: "You flash the lamp. 395nm is the specific wavelength that wakes the photo-initiators up." },
      { title: "Photopolymerization", text: "At that exact second the molecules link up, because the light has told them to." },
      { title: "Solid Flexible Bond", text: "The glue becomes a solid, flexible plastic bond in about 1.5 seconds." },
    ] },
    { type: "text", text: "Notice the word *flexible.* A bond that is solid but still moves a little with the lash is exactly what you want on a living, growing, blinking eyelash." },

    { type: "heading", text: "Think of a dental filling" },
    { type: "callout", tone: "tip", title: "The trainer’s example", text: "Think of it like a dental filling: a soft resin that only hardens the instant a curing light hits it." },
    { type: "text", text: "The dentist shapes the material while it is still soft. Only when they click the blue light does it become rock hard. We are doing exactly the same for lashes: you shape and place while the glue is soft, and the flash makes it hard." },
    { type: "checkpoint", question: "Which light cures INFINITY GLOW™ glue?", options: ["395nm UV Light", "Daylight from a window", "A ring light"], answer: 0, explain: "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond." },
    { type: "checkpoint", question: "In the dental filling example, what is the “blue light” in lash work?", options: ["The UV lamp flash", "The foot pedal", "The eye pad"], answer: 0, explain: "The soft resin hardens when the curing light hits it. In lash work, the UV lamp flash does the same job." },
  ]
);

const L4 = lesson(
  "Why UV Wins in Nairobi",
  "The “Nairobi Advantage”: instant oil-proofing, low fumes and a bond that does not depend on the weather.",
  [
    { type: "heading", text: "Why UV lashes? The value for your clients" },
    { type: "text", text: "Now that you know how the glue works, the next question is the one your clients care about: what do I get? Trainer Wanyama calls it the **Nairobi Advantage.** Two benefits matter most." },
    { type: "steps", items: [
      { title: "Instant oil-proofing", text: "Traditional lashes often fail because clients use oily face creams or sweat at the gym too soon. UV lashes are cured 100% before the client even opens her eyes." },
      { title: "Low fumes", text: "Because the glue cures in 1.5 seconds, there is no “off-gassing” (the stinging sensation) for the next 24 hours." },
    ] },

    { type: "heading", text: "Instant oil-proofing, explained" },
    { type: "text", text: "Think about why oil is a problem for traditional lashes. The glue needs time to finish drying. Until it does, a bond that is still setting can be weakened by oily creams or by sweat." },
    { type: "text", text: "With UV glue, the bond is finished the moment you flash it. There is no half-dry stage for oil or sweat to attack, so the set is ready for real life straight away." },

    { type: "heading", text: "Low fumes, explained" },
    { type: "text", text: "“Off-gassing” is the stinging sensation clients can feel when glue is still releasing fumes as it dries. A bond that sets in 1.5 seconds does not keep releasing fumes for hours afterwards, so the eyes stay comfortable for the next 24 hours." },

    { type: "heading", text: "Why this matters in Nairobi" },
    { type: "text", text: "Remember, traditional glue is a diva about the weather. In Nairobi the weather is rarely perfect." },
    { type: "callout", tone: "key", title: "Why this matters in Nairobi", text: "If Nairobi is too dry (January) or too humid (April), the glue turns brittle or “shocks.” Dust, heat and long commutes mean clients need a bond that locks in instantly: no waiting, no smudging." },
    { type: "text", text: "Because Infinity Glow™ cures with light and not with humidity, you get the same reliable result in January and in April." },
    { type: "checkpoint", question: "How long does the glue take to cure?", options: ["1.5 seconds", "24 hours", "20–30 minutes"], answer: 0, explain: "Because the glue cures in 1.5 seconds, there is no “off-gassing” for the next 24 hours." },
    { type: "checkpoint", question: "Why can a UV client go to the gym straight away?", options: ["The bond is already 100% cured before she opens her eyes", "The gym has low humidity", "UV lashes are glued to the eyelid"], answer: 0, explain: "UV lashes are cured 100% before the client even opens her eyes, so oil and sweat cannot spoil a half-dry bond." },
  ]
);

const Q1 = quiz(
  "Quiz: How UV Glue Works",
  "Five questions on the science. Score 70% to pass.",
  [
    { q: "What activates traditional lash glue?", options: ["Moisture", "395nm UV Light", "Heat"], answer: 0, explain: "Traditional glue is moisture activated. Infinity Glow™ is light activated." },
    { q: "What is the INFINITY GLOW™ GLUE sequence?", options: ["Moisture → Polymerization → Bond", "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond", "Dip → Wait → Tack → Bond"], answer: 1, explain: "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond." },
    { q: "What does the “photo” in photopolymerization mean?", options: ["Picture", "Light", "Heat"], answer: 1, explain: "Photo means light: the light makes the glue’s molecules link up and turn solid." },
    { q: "Why are there low fumes with UV glue?", options: ["The glue cures in 1.5 seconds, so there is no “off-gassing” for the next 24 hours", "The glue has no smell", "The client wears a mask"], answer: 0, explain: "Because the glue cures in 1.5 seconds, there is no “off-gassing” (the stinging sensation) for the next 24 hours." },
    { q: "Why does UV glue suit Nairobi’s weather?", options: ["It cures with light, not humidity, so January and April give the same result", "It needs high humidity to work", "It only works indoors"], answer: 0, explain: "Traditional glue turns brittle or “shocks” when Nairobi is too dry or too humid. UV glue does not depend on humidity." },
  ]
);

// ---------------------------------------------------------------------------
// Module 3: Staying safe under UV
// ---------------------------------------------------------------------------

const L5 = lesson(
  "The Triple-Shield Safety Protocol",
  "Three shields that protect the technician, the client and the beam.",
  [
    { type: "heading", text: "Safety is the foundation" },
    { type: "quote", text: "Safety is not an option. It is the foundation of our premium status." },
    { type: "text", text: "UV light is what makes this technology special, and it is also the reason we protect everyone in the room. Clients pay premium prices because they trust you, and safety is how you earn that trust." },
    { type: "text", text: "To make safety easy to remember, the trainer breaks it into one simple system with three parts, the **Triple-Shield Safety Protocol.** Each shield protects someone different:" },
    { type: "list", style: "numbered", items: ["Technician Shield: protects you", "Client Shield: protects your client", "Beam Shield: protects everything the light should not touch"] },

    { type: "heading", text: "Shield 1: The Technician Shield" },
    { type: "text", text: "The rule: you must wear **UV400 certified safety glasses.**" },
    { type: "callout", tone: "tip", title: "The trainer’s example", text: "Just as a welder protects their eyes, our techs protect theirs from the cumulative “flash” of 100+ lashes per set." },
    { type: "text", text: "Why “cumulative”? One flash is short. But a full set means flashing 100 times or more, and those flashes add up over a set, over a day and over a career. The glasses protect you from all of them." },

    { type: "heading", text: "Shield 2: The Client Shield" },
    { type: "text", text: "The rule: use **black, non-reflective eye pads,** and make sure of **complete eye closure.**" },
    { type: "text", text: "The pad is only as good as the closure behind it, so check it every time. Tick each step off as you read it:" },
    { type: "list", style: "checklist", items: [
      "Place the pad.",
      "Ensure no white of the eye is visible.",
      "Tape the top lid if necessary to ensure 100% closure.",
    ] },
    { type: "figure", url: M + "uv-protection-demo.webp", caption: "UV Lashes Protection demonstration" },

    { type: "heading", text: "Shield 3: The Beam Shield" },
    { type: "text", text: "The rule: the lamp must be angled so the light hits the **lash base,** not the client’s skin or the technician’s hands." },
    { type: "text", text: "Think of the beam as something you aim, like a torch. The glue sits at the lash base, so that is the only place the light needs to go. Everywhere else is a place you are protecting." },
    { type: "text", text: "In the photo above you can see all three shields working together: safety glasses on the technician, eye pads on the client, and the lamp aimed at the lash base." },
    { type: "checkpoint", question: "What does the Technician Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads", "Lamp positioned toward the lash base"], answer: 0, explain: "Technician Shield: you must wear UV400 certified safety glasses." },
    { type: "checkpoint", question: "What does the Client Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads, with complete eye closure", "A foot pedal"], answer: 1, explain: "Client Shield: black, non-reflective eye pads, with complete eye closure." },
    { type: "checkpoint", question: "Where must the Beam Shield aim the light?", options: ["At the client’s skin", "At the lash base", "At the technician’s hands"], answer: 1, explain: "The lamp must be angled so the light hits the lash base, not the client’s skin or the technician’s hands." },
  ]
);

const L6 = lesson(
  "Screening for Contraindications: The “No-Go” List",
  "Who should not get UV lashes, the questions to ask, and why the checklist comes before every procedure.",
  [
    { type: "heading", text: "What is a contraindication?" },
    { type: "text", text: "A **contraindication** is a reason not to go ahead with a treatment. Some health conditions and medicines make UV light a bad idea, so you check before you ever pick up the lamp. The trainer calls this the **“No-Go” list.**" },
    { type: "text", text: "The order never changes. Follow the three stages one at a time:" },
    { type: "steps", items: [
      { title: "CONSULTATION", text: "Ask the screening questions." },
      { title: "CHECKLIST", text: "Fill in the checklist, one item at a time." },
      { title: "PROCEDURE", text: "Only then begin." },
    ] },

    { type: "heading", text: "The four things you screen for" },
    { type: "text", text: "**Before every procedure, screen for:**" },
    { type: "list", style: "checklist", items: [
      "Roaccutane or certain antibiotics",
      "Lupus",
      "History of light-triggered epilepsy",
      "Recent Lasik surgery",
    ] },

    { type: "heading", text: "What to actually ask" },
    { type: "text", text: "During the consultation the tech must ask, in plain words:" },
    { type: "list", style: "dot", items: [
      "“Are you on Roaccutane or antibiotics?” (These make skin light-sensitive.)",
      "“Do you have Lupus or a history of light-triggered epilepsy?”",
    ] },
    { type: "text", text: "And do not forget the fourth item: ask whether she has had Lasik surgery recently." },
    { type: "text", text: "Notice why the first two questions matter. Roaccutane and certain antibiotics make skin sensitive to light, and UV lashes are a light-based service. That is exactly why they are on the list." },

    { type: "heading", text: "A worked example: recent Lasik" },
    { type: "callout", tone: "mistake", title: "Recent Lasik surgery", text: "If a client just had Lasik surgery last month, she is a No-Go until 6 months post-op." },
    { type: "text", text: "“Post-op” just means after the operation. So for a client who had Lasik last month, the answer today is no. She is welcome to book UV lashes once she is 6 months past her surgery, and in the meantime you can offer her a different service." },
    { type: "callout", tone: "key", title: "Remember", text: "*The checklist must be completed before every procedure begins.*" },
    { type: "figure", url: M + "uv-lash-application.webp", caption: "A client’s eyes are closed and padded before any flash" },
    { type: "checkpoint", question: "Why are Roaccutane and antibiotics on the “No-Go” list?", options: ["They make skin light-sensitive", "They make lashes grow faster", "They stop the glue curing"], answer: 0, explain: "Roaccutane and certain antibiotics make skin light-sensitive, and UV lashes use UV light." },
    { type: "checkpoint", question: "A client had Lasik surgery last month. What do you do?", options: ["Go ahead as normal", "She is a No-Go until 6 months post-op", "Use a shorter flash"], answer: 1, explain: "If a client just had Lasik surgery last month, she is a No-Go until 6 months post-op." },
  ]
);

const Q2 = quiz(
  "Quiz: Staying Safe Under UV",
  "Five questions on the Triple-Shield protocol and the No-Go list. Score 70% to pass.",
  [
    { q: "What does the Beam Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads", "Lamp angled so the light hits the lash base"], answer: 2, explain: "Beam Shield: the lamp must be angled so the light hits the lash base, not the client’s skin or the technician’s hands." },
    { q: "How do you make sure of complete eye closure?", options: ["Place the pad, check that no white of the eye is visible, and tape the top lid if necessary", "Ask the client to try her best", "Use a brighter lamp"], answer: 0, explain: "Place the pad. Ensure no white of the eye is visible. Tape the top lid if necessary to ensure 100% closure." },
    { q: "Which of these is NOT on the “No-Go” list?", options: ["Lupus", "History of light-triggered epilepsy", "4–8 week retention"], answer: 2, explain: "The No-Go list is Roaccutane or certain antibiotics, Lupus, history of light-triggered epilepsy, and recent Lasik surgery." },
    { q: "When must the contraindications checklist be completed?", options: ["After the procedure", "Before every procedure begins", "Only for new clients"], answer: 1, explain: "The checklist must be completed before every procedure begins." },
    { q: "A client had Lasik surgery last month. When can she have UV lashes?", options: ["Today", "Once she is 6 months post-op", "Never"], answer: 1, explain: "Recent Lasik is on the No-Go list. She is a No-Go until 6 months post-op." },
  ]
);

// ---------------------------------------------------------------------------
// Module 4: Your kit and your glue
// ---------------------------------------------------------------------------

const L7 = lesson(
  "Meet Your Equipment",
  "The lamp, the gooseneck and the foot pedal: what each one does and why your hands stay free.",
  [
    { type: "heading", text: "Equipment mastery" },
    { type: "quote", text: "Your tools are an extension of your body." },
    { type: "text", text: "A UV set-up is simple. Three main pieces do the work, and the rest of the kit supports them. Here is what you will use:" },
    { type: "figure", url: M + "equipment-kit.webp", caption: "The lamp, UV glue, eye pads, safety glasses and foot pedal" },
    { type: "list", style: "numbered", items: ["LAMP", "GOOSENECK", "FOOT PEDAL"] },

    { type: "heading", text: "What each one does" },
    { type: "text", text: "**The lamp** gives the UV light. It is the 395nm light you learned about in the science lessons, the light that wakes up the glue." },
    { type: "text", text: "**The gooseneck** is the flexible arm that holds the lamp. Because it bends and stays where you put it, you can place the light exactly where you need it, at the right distance from the eye." },
    { type: "text", text: "**The foot pedal** switches the light on. This is a clever detail: both of your hands are busy holding tweezers and lashes, so your foot does the switching. Your hands never have to leave the lash." },
    { type: "figure", url: M + "gooseneck-lamp.webp", caption: "The lamp, gooseneck and foot pedal in position" },
    { type: "text", text: "The rest of your kit you have already met in the safety lessons: the UV400 safety glasses and the black, non-reflective eye pads. Together with the UV glue, that is your complete UV set-up." },
    { type: "checkpoint", question: "Why does the foot pedal switch on the light?", options: ["So both hands stay on the lash", "Because the lamp is too heavy to hold", "To keep the glue cool"], answer: 0, explain: "The foot pedal switches the light on so your hands stay on the lash." },
  ]
);

const L8 = lesson(
  "Setting Up Your Lamp",
  "Position, distance, foot pedal and “The Tap”: the four decisions that give you a safe, repeatable set-up.",
  [
    { type: "heading", text: "Infinity Glow™ lamp setup" },
    { type: "text", text: "Set your lamp up the same way every time. Then you never have to think about it, and your attention can stay on the lash and your client. There are four small decisions. Tap through them in order:" },
    { type: "steps", items: [
      { title: "Position", text: "Step 1: Positioning. Place the lamp base on the non-dominant hand side. Your working hand stays free and the lamp stays out of its way." },
      { title: "Distance", text: "Step 2: The “Gooseneck” should be 10–15cm away from the eye." },
      { title: "Foot Pedal", text: "Step 3: The foot pedal. Place it where your foot rests naturally, so you never have to look down or stretch for it." },
      { title: "The Tap", text: "Practise “The Tap”: a quick press for 1.5 seconds. That is all the glue needs." },
    ] },
    { type: "text", text: "If you are right-handed, your non-dominant side is your left. Put the lamp base there, and your right hand has the whole space to work." },

    { type: "heading", text: "A quick note about the UV light" },
    { type: "text", text: "Distance is the thing to get right. 10–15cm is the sweet spot. Tap each card to see what happens when you stray from it:" },
    { type: "flip", prompt: "Tap the card", frontLabel: "If the light is", front: "Too far", backLabel: "Then you get", back: "Incomplete curing. At 20cm or more, the glue won’t cure fully." },
    { type: "flip", prompt: "Tap the card", frontLabel: "If the light is", front: "Too close", backLabel: "Then you get", back: "Uncomfortable heat. Under 5cm, it may generate uncomfortable heat." },
    { type: "text", text: "So the rule is simple: not too far and not too close. If curing seems weak, check the distance first. If your client feels warmth, check the distance again." },
    { type: "checkpoint", question: "How far should the “Gooseneck” be from the eye?", options: ["Under 5cm", "10–15cm", "20cm or more"], answer: 1, explain: "The “Gooseneck” should be 10–15cm away from the eye. Too far (20cm+) won’t cure fully; too close (under 5cm) may generate uncomfortable heat." },
    { type: "checkpoint", question: "Which side does the lamp base go on?", options: ["The dominant hand side", "The non-dominant hand side", "Behind the client"], answer: 1, explain: "Place the lamp base on the non-dominant hand side, so your working hand stays free." },
  ]
);

const L9 = lesson(
  "Protect Your UV Glue",
  "UV glue is light-sensitive: how to store it and what happens if you do not.",
  [
    { type: "heading", text: "Light-sensitive glue" },
    { type: "text", text: "Here is a question worth asking. If UV glue hardens when light hits it, what happens if the *wrong* light hits it?" },
    { type: "text", text: "The same light that cures the glue on the lash can cure it in the bottle, or on your glue stone, if you are careless. UV glue is **light-sensitive,** so it must be kept in the **Blackout Foil Bag** provided in the kit." },
    { type: "callout", tone: "key", title: "Remember", text: "**ALWAYS STORE IN THE BLACKOUT FOIL BAG**" },
    { type: "figure", url: M + "blackout-foil-bag.webp", caption: "The blackout foil bag keeps light out" },

    { type: "heading", text: "A worked example" },
    { type: "callout", tone: "mistake", title: "The trainer’s example", text: "If you leave your glue stone under a bright window in a Westlands apartment, the glue will cure on the stone before you even touch a lash." },
    { type: "text", text: "Think about what that costs you. A wasted drop is wasted money, and glue that has started to harden gives you a weak, unreliable bond. It is a small mistake with an expensive result." },
    { type: "text", text: "The habit is simple. Put the glue back in the foil bag every time you finish, and keep your glue stone away from bright windows while you work." },
    { type: "checkpoint", question: "Where should UV glue always be stored?", options: ["Under a bright window", "In the blackout foil bag", "On the glue stone"], answer: 1, explain: "ALWAYS STORE IN THE BLACKOUT FOIL BAG." },
  ]
);

// ---------------------------------------------------------------------------
// Module 5: The LuminaLock™ method
// ---------------------------------------------------------------------------

const L10 = lesson(
  "The LuminaLock™ Method at a Glance",
  "Speed plus precision equals profit, and the five steps you repeat on every lash.",
  [
    { type: "heading", text: "Speed + Precision = Profit" },
    { type: "quote", text: "SPEED + PRECISION = PROFIT" },
    { type: "text", text: "This is the practical part of the course, where everything you have learned turns into hand skills. The trainer’s formula is short, so let’s unpack it:" },
    { type: "list", style: "dot", items: [
      "**Precision** gives you a clean, safe set that lasts.",
      "**Speed** lets you do more clients in a day.",
      "Together, they turn your skill into **profit.**",
    ] },
    { type: "text", text: "**LuminaLock™** is the trainer’s method for getting both. It has five steps, and you do them in the same order on every single lash." },
    { type: "figure", url: M + "gooseneck-lamp.webp", caption: "The lamp, gooseneck and foot pedal in position" },

    { type: "heading", text: "The five steps in one list" },
    { type: "list", style: "numbered", items: ["Isolation", "The Dip", "The Attachment", "The Flash", "The Release"] },
    { type: "text", text: "Say them out loud a few times: **isolate, dip, attach, flash, release.** Notice the rhythm. The first three steps are all about getting it right, and the last two are about locking it in. The next lesson walks through each step in detail." },
    { type: "checkpoint", question: "What does the “speed” part of Speed + Precision = Profit let you do?", options: ["Do more clients in a day", "Skip the safety checks", "Use less glue stone"], answer: 0, explain: "Precision gives a clean, safe set that lasts. Speed lets you do more clients in a day. Together they are profit." },
  ]
);

const L11 = lesson(
  "The Five Steps, One at a Time",
  "ISOLATE, DIP, ATTACH, FLASH, RELEASE: what to do at each step and why.",
  [
    { type: "heading", text: "The 5-step application" },
    { type: "text", text: "Here is what you do at each step. Work through them in order, and picture your own hands doing each one." },
    { type: "steps", items: [
      { title: "ISOLATE", text: "Isolation: use your isolation tweezer to find one healthy natural lash. Separate it cleanly, so the extension only touches that one lash." },
      { title: "DIP", text: "The Dip: dip the extension 2mm into the UV glue. Just the tip goes in, and you need less glue than with traditional methods." },
      { title: "ATTACH", text: "The Attachment: place the extension on the natural lash. You have time to slide it and make the alignment perfect, because the glue won’t dry yet!" },
      { title: "FLASH", text: "The “Flash”: once you are satisfied with the placement, tap the foot pedal for 1.5 seconds." },
      { title: "RELEASE", text: "The Release: release the isolation. The lash is now “Locked.”" },
    ] },

    { type: "heading", text: "Why the order matters" },
    { type: "text", text: "Look at step three again. In traditional lashing, you must place the lash quickly, because the glue is already drying. With UV glue, ATTACH is the step where you can take your time. Slide the extension until you are happy with it. Nothing is setting yet." },
    { type: "text", text: "Then step four, FLASH, is the moment you decide. One tap of the pedal for 1.5 seconds, and the glue is solid. Only after that do you let go of the natural lash in step five." },
    { type: "text", text: "That is the engineer at work: it waits for you through the first three steps, and finishes the job the moment you flash." },
    { type: "callout", tone: "key", title: "Remember", text: "*This is the most important practical training slide. Practise each step until it is muscle memory.*" },
    { type: "text", text: "When the five steps feel automatic, your hands stay calm and quick. That is how a skilled UV technician works." },
    { type: "checkpoint", question: "What comes straight after ATTACH?", options: ["DIP", "FLASH", "RELEASE"], answer: 1, explain: "ISOLATE → DIP → ATTACH → FLASH → RELEASE." },
    { type: "checkpoint", question: "How far do you dip the extension into the glue?", options: ["2mm", "10mm", "15mm"], answer: 0, explain: "DIP: dip the extension 2mm into the UV glue." },
    { type: "checkpoint", question: "Why do you have time to slide the extension into perfect alignment?", options: ["The glue won’t dry until you flash", "The lash is taped down", "The extension is lighter"], answer: 0, explain: "You have time to slide it and ensure perfect alignment because it won’t dry yet." },
  ]
);

const L12 = lesson(
  "The “No Stickies” Advantage",
  "Why UV lashing can cut 20–30 minutes from a service.",
  [
    { type: "heading", text: "What is a “sticky”?" },
    { type: "text", text: "A “sticky” is when two lashes end up stuck together. It happens when you move onto the lash next to one that is still tacky, which means it has not finished setting." },
    { type: "text", text: "With traditional lashing you have to wait for the glue to “tack” before moving. That waiting is built into every lash of every set." },

    { type: "heading", text: "Compare the two ways of working" },
    { type: "flip", prompt: "Tap the card", frontLabel: "Traditional lashing", front: "“Wait for the glue to tack before moving.”", backLabel: "UV lashing", back: "“Position → Flash → Locked.” Each lash is finished the moment you flash it." },
    { type: "callout", tone: "tip", title: "The trainer’s example", text: "In traditional lashing, you have to wait for the glue to “tack” before moving. In UV lashing, you can move to the lash immediately next to it without fear of them sticking together (no “stickies”). This reduces service time by 20–30 minutes." },
    { type: "text", text: "Because each lash is finished the instant you flash it, you can move straight on to the lash beside it. No waiting, and no fear of sticking." },
    { type: "callout", tone: "key", title: "20–30 minutes", text: "POTENTIAL SERVICE-TIME REDUCTION" },

    { type: "heading", text: "What that means for your day" },
    { type: "text", text: "Those saved minutes add up. A shorter service is kinder to a client who has to lie still, and it gives you room for more bookings in a day. This is the *speed* half of Speed + Precision = Profit." },
    { type: "checkpoint", question: "What is the potential service-time reduction with UV lashing?", options: ["5 minutes", "20–30 minutes", "2 hours"], answer: 1, explain: "20–30 minutes: potential service-time reduction." },
  ]
);

const Q3 = quiz(
  "Quiz: Kit, Glue Care and the LuminaLock™ Method",
  "Six questions on your equipment and the five steps. Score 70% to pass.",
  [
    { q: "Where should the lamp base be placed?", options: ["On the non-dominant hand side", "On the dominant hand side", "Behind the client"], answer: 0, explain: "Position: place the lamp base on the non-dominant hand side." },
    { q: "What happens if the UV light is too far (20cm or more)?", options: ["Uncomfortable heat", "Incomplete curing", "Faster curing"], answer: 1, explain: "If too far, the glue won’t cure fully. If too close (under 5cm), it may generate uncomfortable heat." },
    { q: "Where should UV glue be stored?", options: ["In the blackout foil bag", "On the glue stone near a window", "In the lamp head"], answer: 0, explain: "Always store UV glue in the blackout foil bag, because it is light-sensitive." },
    { q: "How long is the FLASH in the 5-step application?", options: ["0.5 seconds", "1.5 seconds", "15 seconds"], answer: 1, explain: "FLASH: tap the foot pedal for 1.5 seconds." },
    { q: "What is the correct LuminaLock™ order?", options: ["Isolate, Dip, Attach, Flash, Release", "Dip, Flash, Attach, Isolate, Release", "Attach, Isolate, Flash, Dip, Release"], answer: 0, explain: "ISOLATE → DIP → ATTACH → FLASH → RELEASE." },
    { q: "What are “stickies”?", options: ["Lashes stuck together because the glue has not set yet", "A type of eye pad", "Sticky notes for the client file"], answer: 0, explain: "With traditional glue you wait for each lash to “tack”, or risk stickies. UV lashing avoids them." },
  ]
);

// ---------------------------------------------------------------------------
// Module 6: UV for your clients and your business
// ---------------------------------------------------------------------------

const L13 = lesson(
  "What Your Client Gets: Pros and Cons",
  "The honest picture for the client: the value, and the reality.",
  [
    { type: "heading", text: "UV lashes: the client experience" },
    { type: "text", text: "To sell UV lashes well, you need to be honest about what the client gets, the good and the trade-offs. Here is the whole picture at a glance:" },
    { type: "compare", doLabel: "PROS", dontLabel: "CONS",
      do: ["Instant shower / gym / swim", "4–8 week retention", "Comfort", "Less stinging or red eyes"],
      dont: ["Higher premium cost", "Eyes must remain closed / still", "Sensitivity restrictions"] },

    { type: "heading", text: "The pros: the value" },
    { type: "text", text: "Here is the value behind each pro, in the trainer’s words." },
    { type: "steps", items: [
      { title: "Instant Everything", text: "Shower, gym, or swim immediately." },
      { title: "4–8 Week Retention", text: "Lasts twice as long as normal glue." },
      { title: "Comfort", text: "No stinging or “red eyes” after the set." },
    ] },

    { type: "heading", text: "The cons: the reality" },
    { type: "text", text: "Now the honest side. Each of these has a reason you can explain." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Con", front: "Slightly Higher Cost", backLabel: "Slightly Higher Cost", back: "It’s a premium tech service." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Con", front: "Closed Eyes", backLabel: "Closed Eyes", back: "She must be 100% still, with eyes closed." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Con", front: "Sensitivity Check", backLabel: "Sensitivity Check", back: "Not suitable for those on certain meds." },
    { type: "text", text: "Each con connects to something you already know. The higher cost comes from the premium technology. The closed, still eyes are the Client Shield. And the sensitivity check is the No-Go list." },
    { type: "text", text: "Explain both sides up front. Clients who know what to expect are happier, and they are glad to pay for the result." },
    { type: "checkpoint", question: "How does UV retention compare to normal glue?", options: ["About the same", "It lasts twice as long", "Half as long"], answer: 1, explain: "4–8 week retention: lasts twice as long as normal glue." },
  ]
);

const L14 = lesson(
  "Why Technicians Should Learn UV",
  "Exclusivity, higher payout, efficiency and a business upgrade, plus the honest challenges.",
  [
    { type: "heading", text: "The career boost" },
    { type: "text", text: "UV is a great result for your client, and it is also a smart business move for you. Tap each card to read the four reasons." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "EXCLUSIVITY", backLabel: "EXCLUSIVITY", back: "Be among the few offering the technology. Be the 1% in Nairobi offering this." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "HIGHER PAYOUT", backLabel: "HIGHER PAYOUT", back: "Charge more for “Retention Assurance.”" },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "EFFICIENCY", backLabel: "EFFICIENCY", back: "No “stickies” means faster service." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Why learn UV", front: "BUSINESS UPGRADE", backLabel: "BUSINESS UPGRADE", back: "Premium technology, premium positioning." },
    { type: "text", text: "Put them together. When few techs offer UV, clients come to you. A set that lasts longer is worth a higher price. Fewer stickies mean you finish sooner and book more clients. And all of this positions you as the lash artist known for the best." },

    { type: "heading", text: "The challenges" },
    { type: "text", text: "Learning UV does ask something of you. Be ready for these three things:" },
    { type: "compare", doLabel: "The career boost", dontLabel: "The challenge",
      do: ["Exclusivity: be the 1% in Nairobi offering this.", "Higher payout: charge more for “Retention Assurance.”", "Efficiency: no “stickies” means faster service."],
      dont: ["Upfront investment: kit and training cost.", "Learning curve: managing the foot pedal and lamp.", "Safety rigor: you must be disciplined with goggle use."] },
    { type: "text", text: "None of these is a reason to hold back. The investment pays back through higher prices, the learning curve disappears with practice of the five steps, and safety discipline is simply the Triple-Shield protocol, every single time." },
    { type: "checkpoint", question: "What is the learning curve with UV?", options: ["Managing the foot pedal and lamp", "Learning to wait for the glue to tack", "Mixing the glue"], answer: 0, explain: "Learning curve: managing the foot pedal and lamp." },
  ]
);

const L15 = lesson(
  "Selling UV Lashes: The Scripts",
  "The trainer’s word-for-word scripts for offering UV to a client and recruiting a student, and why they work.",
  [
    { type: "heading", text: "Knowing the technology is half the job" },
    { type: "text", text: "The other half is being able to say it in a few friendly words. The golden rule of both scripts below: **lead with what the person gets,** not with the technology." },

    { type: "heading", text: "To a housecall client: the upsell" },
    { type: "text", text: "Here is how the trainer offers UV to a regular client. Read it slowly, then we will pull it apart." },
    { type: "quote", text: "Hi [Client Name]! I noticed you have a busy week ahead. Would you like to try our new Infinity Glow™ UV technology? It’s the latest in the industry. The best part? You don't have to wait 24 hours to shower or hit the gym—it’s waterproof instantly. Plus, while normal lashes last 2-3 weeks, these stay flawless for a full month. Since you’re a regular, we’re keeping it at your normal rate until March!" },
    { type: "text", text: "Why does it work? Look at the order:" },
    { type: "steps", items: [
      { title: "Start with her", text: "“I noticed you have a busy week ahead.” It shows you are thinking about her life, not your sales target." },
      { title: "Name the biggest benefit", text: "No waiting 24 hours to shower or hit the gym: it’s waterproof instantly." },
      { title: "Compare retention", text: "Normal lashes last 2–3 weeks. These stay flawless for a full month." },
      { title: "Give her a reason to say yes now", text: "As a regular, she keeps her normal rate until March." },
    ] },
    { type: "text", text: "Change the offer at the end to suit your own prices, but keep that order." },

    { type: "heading", text: "To a potential student: the recruitment" },
    { type: "text", text: "If you train other techs, speak to their pain first. Here is the trainer’s script:" },
    { type: "quote", text: "Stop struggling with Nairobi’s humidity and client complaints about falling lashes. Our Advanced UV Masterclass gives you the tech to guarantee 4-week retention. You aren't just buying a kit; you're buying a business upgrade. By the time other salons catch up, you’ll already be the 'Retention Queen' of your neighborhood. With the kit included, you’ll break even on your 50k investment in just 10 clients. Ready to lead 2026?" },
    { type: "text", text: "The pattern is the same. It starts with the pain (humidity and falling lashes), offers the way out (4-week retention), frames the price as a business upgrade, and ends with the numbers: break even on the 50k investment in just 10 clients." },
    { type: "checkpoint", question: "What does the client script lead with?", options: ["What the client gets: no waiting to shower or hit the gym", "The chemistry of photo-initiators", "The price of the lamp"], answer: 0, explain: "Lead with what the client gets. The best part: you don’t have to wait 24 hours to shower or hit the gym." },
    { type: "checkpoint", question: "According to the recruitment script, how many clients does it take to break even on the 50k investment?", options: ["10", "50", "100"], answer: 0, explain: "With the kit included, you’ll break even on your 50k investment in just 10 clients." },
  ]
);

const L16 = lesson(
  "You’re Now Ready to Glow",
  "Everything you have learned, in one place, before the final assessment.",
  [
    { type: "heading", text: "You’re now ready to glow" },
    { type: "text", text: "Look how far you have come. You started by asking why one glue behaves like a diva and another like an engineer. Now you can explain the science, protect everyone in the room, set up your equipment, apply with LuminaLock™ and talk about UV with confidence. Tick off each thing you can now do:" },
    { type: "list", style: "checklist", items: ["Master the Technology", "Protect Your Clients", "Deliver Better Retention", "Build a Premium Business"] },
    { type: "text", text: "**Master the Technology.** You know how UV glue cures, how to set up your lamp and how to apply with LuminaLock™." },
    { type: "text", text: "**Protect Your Clients.** You use the Triple-Shield protocol and screen with the No-Go list every time." },
    { type: "text", text: "**Deliver Better Retention.** Your instant cure gives clients lashes that last 4–8 weeks." },
    { type: "text", text: "**Build a Premium Business.** You can offer a premium service and charge for it." },
    { type: "text", text: "**INFINITYGLOW™**" },
    { type: "text", text: "Next, take the final assessment. Practise the five steps until they feel automatic. Good luck, and glow on!" },
  ]
);

const FINAL = quiz(
  "Final assessment",
  "Twelve questions across the whole course. Score 70% to pass.",
  [
    { q: "What activates traditional lash glue?", options: ["Moisture", "395nm UV Light", "Heat"], answer: 0, explain: "Traditional glue: moisture activated. Infinity Glow™: light activated." },
    { q: "What is the INFINITY GLOW™ GLUE sequence?", options: ["Moisture → Polymerization → Bond", "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond", "Dip → Wait → Tack → Bond"], answer: 1, explain: "Liquid → 395nm UV Light → Photopolymerization → Solid Flexible Bond." },
    { q: "Why are there low fumes with UV glue?", options: ["The glue cures in 1.5 seconds, so there is no “off-gassing” for the next 24 hours", "The glue has no smell", "The client wears a mask"], answer: 0, explain: "Because the glue cures in 1.5 seconds, there is no “off-gassing” (the stinging sensation) for the next 24 hours." },
    { q: "What does the Beam Shield require?", options: ["UV400 certified safety glasses", "Black, non-reflective eye pads", "Lamp angled so the light hits the lash base"], answer: 2, explain: "Beam Shield: the lamp must be angled so the light hits the lash base, not the client’s skin or the technician’s hands." },
    { q: "Which of these is NOT on the “No-Go” list?", options: ["Lupus", "History of light-triggered epilepsy", "4–8 week retention"], answer: 2, explain: "The No-Go list is Roaccutane or certain antibiotics, Lupus, history of light-triggered epilepsy, and recent Lasik surgery." },
    { q: "When must the contraindications checklist be completed?", options: ["After the procedure", "Before every procedure begins", "Only for new clients"], answer: 1, explain: "The checklist must be completed before every procedure begins." },
    { q: "Where should the lamp base be placed?", options: ["On the non-dominant hand side", "On the dominant hand side", "Behind the client"], answer: 0, explain: "Position: place the lamp base on the non-dominant hand side." },
    { q: "What happens if the UV light is too far?", options: ["Uncomfortable heat", "Incomplete curing", "Faster curing"], answer: 1, explain: "If too far, incomplete curing. If too close, uncomfortable heat." },
    { q: "A client had Lasik surgery last month. When can she have UV lashes?", options: ["Today", "Once she is 6 months post-op", "Never"], answer: 1, explain: "Recent Lasik is on the No-Go list. She is a No-Go until 6 months post-op." },
    { q: "How long is the FLASH in the 5-step application?", options: ["0.5 seconds", "1.5 seconds", "15 seconds"], answer: 1, explain: "FLASH: tap the foot pedal for 1.5 seconds." },
    { q: "What is the potential service-time reduction with UV lashing?", options: ["5 minutes", "20–30 minutes", "2 hours"], answer: 1, explain: "No stickies means a potential service-time reduction of 20–30 minutes." },
    { q: "Which is a CON of UV lashes for the client?", options: ["Instant shower / gym / swim", "Comfort", "Eyes must remain closed / still"], answer: 2, explain: "Cons: higher premium cost, eyes must remain closed / still, sensitivity restrictions." },
  ]
);

export const INFINITYGLOW_MASTERY = {
  slug: "infinityglow-mastery",
  title: "InfinityGlow™ Mastery",
  subtitle: "The Comprehensive Training Manual · Presented by Wanyama Evans",
  description:
    "UV lashes are the premium upgrade every lash tech can offer: more revenue per set, a premium service, 4–6 weeks retention, and instant curing so your results never depend on humidity.",
  about:
    "Why UV lashes? Traditional lash glue is moisture activated, so a dry or humid day can make it turn brittle or “shock.” Infinity Glow™ is light activated: it cures instantly under the lamp, so the bond never depends on humidity to dry, the lashes are oil-proof before your client opens her eyes, and there is no stinging off-gassing afterwards.\n\n" +
    "Why should you offer it to your clients? More revenue for you: you can charge a premium for a technology few techs offer. A premium service: instant curing means no waiting, no smudging and no “stickies”, which can cut 20–30 minutes off a service. Better results for your clients: 4–6 weeks retention, and they can shower, gym or swim straight away.\n\n" +
    "You will learn the science of photopolymerization, the Triple-Shield safety protocol and the “No-Go” screening list, lamp setup, the LuminaLock™ 5-step application and how to build a premium UV business. The course is written to be read like a book, with quick questions inside each lesson and a short quiz after each part. Presented by Wanyama Evans.",
  duration_label: "Self-paced",
  level: "advanced",
  category: "advanced",
  course_type: "story",
  reading_view: "article",
  hero_url: M + "cover.webp",
  is_free: false,
  price: 30000,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  sort_order: 20,
  learn_points: [
    "Charge a premium and earn more revenue per set",
    "Offer a premium service with 4–6 weeks retention",
    "Cure instantly so humidity never affects your results",
    "Protect your clients with the Triple-Shield safety protocol",
  ],
  modules: [
    { title: "Start Here", lessons: [L1] },
    { title: "How UV Glue Works", lessons: [L2, L3, L4, Q1] },
    { title: "Staying Safe Under UV", lessons: [L5, L6, Q2] },
    { title: "Your Kit & Your Glue", lessons: [L7, L8, L9] },
    { title: "The LuminaLock™ Method", lessons: [L10, L11, L12, Q3] },
    { title: "UV for Your Clients & Your Business", lessons: [L13, L14, L15, L16, FINAL] },
  ],
};
