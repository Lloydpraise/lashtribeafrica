// Classic Set Essentials: converted from the "Lashes By Shazz Academy Training Manual" (39 slides).
//
// Every screen in story mode is built from the blocks below. All facts, numbers and safety guidance
// come from the manual; wording was shortened into one-idea screens. The quick-check questions and the
// final quiz are drafted from the manual's content, so skim them before launch.
//
// Same shape as src/data/demo-courses.js. Turn into SQL with:
//   node scripts/course-to-sql.mjs src/data/courses/classic-set-essentials.js > supabase/migrations/NNNN_course.sql

const M = "/course-media/classic-set-essentials/";

// rough reading time: ~13 seconds per block, never under 3 minutes
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
  "Welcome and lash history",
  "What lash extensions are, how long they last, and where this course will take you.",
  [
    { type: "heading", text: "Welcome" },
    { type: "text", text: "Congratulations on starting your lash journey." },
    { type: "text", text: "This course is made for **beginners** who want to start working with clients and market themselves well." },
    { type: "text", text: "You will learn how to **choose and apply lashes**, and the **health and safety steps** that keep every client protected." },
    { type: "quote", text: "You are joining a vast, growing industry, and you are at the start of an entrepreneurship journey." },

    { type: "heading", text: "What are lash extensions?" },
    { type: "text", text: "Eyelash extensions are a cosmetic application that enhances the **length, curl, fullness and thickness** of natural lashes." },
    { type: "text", text: "Extensions can be made from several materials:" },
    { type: "list", style: "bullets", items: ["Mink", "Silk", "Synthetic", "Human hair", "Horsehair"] },
    { type: "flip", prompt: "Myth or fact?", front: "Extensions are glued onto the client's eyelid.", back: "They are applied to the natural lash, **1–2 mm from its base**, and never touch the eyelid." },

    { type: "heading", text: "How long do they last?" },
    { type: "text", text: "A full new set takes **one to three hours** to apply." },
    { type: "text", text: "The number of lashes you can place depends on the client's existing natural lashes." },
    { type: "text", text: "We lose natural lashes every day, so extensions usually last **2–6 weeks**." },
    { type: "callout", tone: "key", title: "Remember", text: "Keep a set full with a **refill every 2–3 weeks**, or a **new set every four weeks**." },
    { type: "text", text: "Applied correctly, there should be **no damage** to the natural lashes." },
    { type: "checkpoint", question: "How often should a client come in for a refill?", options: ["Every week", "Every 2–3 weeks", "Every 3 months"], answer: 1, explain: "Natural lashes shed all the time, so a refill every 2–3 weeks keeps the set full." },
    { type: "checkpoint", question: "How far from the base of the natural lash is an extension applied?", options: ["Right at the eyelid", "1–2 mm from the base", "At the very tip"], answer: 1, explain: "Extensions sit 1–2 mm from the base of the natural lash and never touch the eyelid." },
  ]
);

const L2 = lesson(
  "Eye anatomy and the lash growth cycle",
  "Why lashes shed, and why that is completely normal.",
  [
    { type: "heading", text: "The eye" },
    { type: "text", text: "The eyes are the organs of sight. Lashes grow in **one layer** along the edge of the eyelids." },
    { type: "figure", url: M + "anatomy.webp", caption: "Parts of the human eye" },
    { type: "text", text: "The eye is made up of the **cornea, iris and lens**." },
    { type: "text", text: "An average person has roughly **100 to 200 lashes per eye**." },

    { type: "heading", text: "Three growth phases" },
    { type: "text", text: "Natural lashes go through **three stages of growth**. Some natural lash loss is all part of the normal cycle." },
    {
      type: "steps",
      items: [
        { title: "Anagen · growth", text: "Lasts 30–45 days. Lashes grow actively and will not fall out unless pulled or torn out." },
        { title: "Catagen · transition", text: "Lasts about 2–3 weeks. Growth stops and the follicle begins to shrink." },
        { title: "Telogen · resting", text: "Can last over 100 days. No growth, then the lash falls or is pushed out by new growth." },
      ],
    },
    { type: "callout", tone: "note", title: "In the growth stage", text: "At any time, about **40% of upper lashes** and **15% of lower lashes** are in the anagen stage. New lashes can be too fragile to lash." },
    { type: "callout", tone: "key", title: "Resting stage", text: "A lash pulled out in the telogen stage shows a small **white ball at the root**. It has shed from the follicle." },
    { type: "text", text: "It can take **4–8 weeks** to completely replace an eyelash." },
    { type: "text", text: "This natural cycle is why a fill is appropriate **every 2–3 weeks**." },
    { type: "checkpoint", question: "Which stage is also called the resting stage?", options: ["Anagen", "Catagen", "Telogen"], answer: 2, explain: "Telogen is the resting stage. The lash stays attached but does not grow, then sheds." },

    { type: "heading", text: "What it means for your clients" },
    { type: "text", text: "It is normal to lose **1–4 lashes per day**." },
    { type: "text", text: "Each lash is in a different stage, so some extensions stay on for weeks and others shed sooner." },
    { type: "callout", tone: "tip", title: "Pro tip", text: "Proper cleansing removes excess oils from makeup and skin. **Facial oils break down the bond** and can cause early shedding." },
    { type: "checkpoint", question: "What do facial oils do to lash extensions?", options: ["Make them last longer", "Break down the bond and cause early shedding", "Nothing at all"], answer: 1, explain: "Oils break down the bond and the integrity of the extension, which can cause early shedding." },
  ]
);

const L3 = lesson(
  "Classic, hybrid and volume lashes",
  "The three main styles, and what makes each one different.",
  [
    { type: "heading", text: "Three styles" },
    { type: "text", text: "The three main styles differ in **how many extensions go on each natural lash**." },

    { type: "heading", text: "Classic" },
    { type: "figure", url: M + "classic-photo.webp", caption: "A classic set" },
    { type: "text", text: "Classic lashes are a **1:1 ratio**: one extension applied to one natural lash." },
    { type: "figure", url: M + "classic-ratio.webp", caption: "Classic: 1:1 ratio" },
    { type: "text", text: "Classic adds **length**, not volume." },

    { type: "heading", text: "Hybrid" },
    { type: "figure", url: M + "hybrid-photo.webp", caption: "A hybrid set" },
    { type: "text", text: "Hybrid lashes are **classic lashes and volume fans mixed together**." },
    { type: "figure", url: M + "hybrid-ratio.webp", caption: "Hybrid: classic lashes mixed with fans" },
    { type: "text", text: "Hybrid adds **length and a little volume**." },

    { type: "heading", text: "Volume" },
    { type: "figure", url: M + "volume-photo.webp", caption: "A volume set" },
    { type: "text", text: "Volume lashes are **fans of 2–6 thin extensions** that create a full, fluffy look." },
    { type: "figure", url: M + "volume-ratio.webp", caption: "Volume: fans on each natural lash" },
    { type: "text", text: "Volume adds **length and full volume**." },
    { type: "checkpoint", question: "Which style applies one extension to one natural lash?", options: ["Classic", "Hybrid", "Volume"], answer: 0, explain: "Classic is a 1:1 ratio: one extension on one natural lash." },
    { type: "checkpoint", question: "Which style mixes classic lashes with volume fans?", options: ["Classic", "Hybrid", "Volume"], answer: 1, explain: "Hybrid sets combine classic lashes and volume fans." },
  ]
);

const L4 = lesson(
  "Lash product knowledge",
  "The tools and supplies on every lash artist's tray, and what each one is for.",
  [
    { type: "heading", text: "Your hands" },
    { type: "callout", tone: "key", title: "Two pairs, every service", text: "You need **two pairs of tweezers**: isolation tweezers in one hand and lashing tweezers in the other." },
    { type: "text", text: "Lashing tweezers **pick up and apply** the extensions." },
    { type: "flip", prompt: "Tap to see the answer", frontLabel: "Question", backLabel: "Answer", front: "Why invest in good quality lashes?", back: "Clients wear them **all day, every day** and will notice cheap ones. Good lashes hold their curl and still look natural." },

    { type: "heading", text: "Prepare and protect" },
    { type: "flip", prompt: "Tap to see the answer", frontLabel: "Question", backLabel: "Answer", front: "Why use eyelash extension tape?", back: "It holds down stubborn bottom lashes. Without it, lower lashes crisscross with the upper ones and a client's eye could get **glued shut**." },
    { type: "text", text: "**Primer** goes on every lash, for every client, at every service." },
    { type: "text", text: "It strips debris and oils from the lashes, which makes a huge difference to **retention**." },
    { type: "callout", tone: "key", title: "Why it matters", text: "We can't control what clients do after they leave, but using primer is one thing we always can." },
    { type: "text", text: "Three small tools do big jobs:" },
    { type: "list", style: "bullets", items: ["**Lash brushes** keep everything separated", "**Micro brushes** apply primer and help remove lashes", "**Eye pads** keep your client comfortable and the bottom lashes tucked"] },
    { type: "callout", tone: "tip", title: "Comfort first", text: "Your client's comfort is the **most important** part of the appointment." },

    { type: "heading", text: "Bond and finish" },
    { type: "text", text: "**Adhesive** holds everything together. It is probably the most important part of each service." },
    { type: "text", text: "Research your options and always have an adhesive you can trust ready for every service." },
    { type: "flip", prompt: "Tap to see the answer", frontLabel: "Question", backLabel: "Answer", front: "Where do I put my adhesive?", back: "On a **crystal (jade) stone**. It keeps adhesive fresh for longer and regulates its temperature." },
    { type: "text", text: "A **nano mister** speeds up curing, cutting the recommended drying time from **24–48 hours down to 4–10 hours**." },
    { type: "text", text: "**Glue remover** is a gel-like product used to remove individual extensions." },
    { type: "checkpoint", question: "Why do lash artists tape the lower lashes?", options: ["To make them look longer", "To stop them crisscrossing with the upper lashes", "To hold the eye pads on"], answer: 1, explain: "Without tape, lower lashes can crisscross with the upper ones, which could glue a client's eye shut." },
    { type: "checkpoint", question: "Which product speeds up adhesive curing?", options: ["Primer", "Nano mister", "Lash brush"], answer: 1, explain: "A nano mister cuts the recommended drying time from 24–48 hours down to 4–10 hours." },
  ]
);

const L5 = lesson(
  "Sanitation and safety",
  "Why hygiene comes first, and the four levels of clean.",
  [
    { type: "heading", text: "Why hygiene matters" },
    { type: "text", text: "Your **tweezers, cleansing brushes, wands and hands** can spread eye infection between clients if hygiene is overlooked." },
    { type: "callout", tone: "mistake", title: "What is at stake", text: "Poor hygiene can cause **eye infections** and **permanent loss of natural lashes**, and it can cost you clients too." },
    { type: "text", text: "Keeping your lash room clean and properly sanitized should be one of your **top priorities**." },

    { type: "heading", text: "Four levels of clean" },
    { type: "text", text: "First, learn the difference between **cleaning, sanitizing, disinfecting and sterilizing**." },
    {
      type: "steps",
      items: [
        { title: "Cleaning", text: "Warm water and soap. Removes surface particles." },
        { title: "Sanitizing", text: "Alcohol-based products. Eliminate or reduce bacteria." },
        { title: "Disinfecting", text: "Products with germicides. Reduce bacteria to a safe level." },
        { title: "Sterilizing", text: "High heat. The most effective way to kill all living organisms on hard surfaces." },
      ],
    },
    { type: "checkpoint", question: "Which method uses high heat?", options: ["Cleaning", "Disinfecting", "Sterilizing"], answer: 2, explain: "Sterilizing uses high heat and is the most effective at killing all living organisms on hard surfaces." },

    { type: "heading", text: "Clean hands" },
    { type: "text", text: "Wash your hands thoroughly **between clients** with warm water and soap for **at least 30 seconds**." },
    { type: "text", text: "Keep a bottle of **hand sanitizer** at your station during the service." },
    { type: "callout", tone: "tip", title: "Pro tip", text: "Use at least a **dime-sized amount** on one palm and rub both palms together for **30 seconds**." },

    { type: "heading", text: "Your workstation" },
    { type: "text", text: "First, throw away everything non-reusable: **eye pads, micro-brushes and lash wands**." },
    { type: "text", text: "After a day of work, wipe down everything you touched with a **disinfectant wipe**." },
    { type: "callout", tone: "key", title: "Tweezer tips", text: "Sanitize the tips of your tweezers with **alcohol or peroxide after every session**." },
    { type: "checkpoint", question: "How long should you wash your hands between clients?", options: ["10 seconds", "At least 30 seconds", "Only if they look dirty"], answer: 1, explain: "Wash with warm water and soap for at least 30 seconds between clients." },
  ]
);

const L6 = lesson(
  "Disinfecting and sterilizing",
  "How to disinfect and sterilize your tools, and the routine between every client.",
  [
    { type: "heading", text: "Disinfecting your supplies" },
    { type: "text", text: "Before disinfecting, clean any **visible debris** off your instruments. Debris left on a surface can lead to cross-contamination." },
    {
      type: "steps",
      items: [
        { title: "Clean off visible debris", text: "Do this first, before any disinfectant." },
        { title: "Prepare the disinfectant", text: "Use an approved, hospital-grade disinfectant, made up to the manufacturer's instructions." },
        { title: "Submerge fully", text: "All tools must be fully submerged for the specified time." },
        { title: "Lift out and dry", text: "Remove tools with clean tongs to avoid re-contamination, then dry with a clean towel or let them air dry." },
      ],
    },

    { type: "heading", text: "Sterilizing with heat" },
    { type: "text", text: "For extra-clean tools, sterilize them: soak in **boiling water for 20 minutes**." },
    { type: "callout", tone: "mistake", title: "Heat-resistant items only", text: "Use this only for items like **tweezers or jade stone**. Never on plastic products." },
    { type: "text", text: "Lift tools out carefully with pinchers, let them air dry, and keep them in a **container**." },

    { type: "heading", text: "Between every client" },
    { type: "text", text: "Follow these seven steps after every service." },
    {
      type: "list",
      style: "checklist",
      items: [
        "Throw out non-reusable tools straight away",
        "Clean reusable tools with warm water and soap",
        "Rinse in clean water to remove residue",
        "Use fresh disinfectant on the cleaned tools",
        "Rinse again in clean water",
        "Let them air dry",
        "Store in a closed container or under a clean cloth",
      ],
    },
    { type: "callout", tone: "tip", title: "Build in time", text: "Leave **10 to 15 minutes** between lash services for cleaning and disinfecting." },
    { type: "checkpoint", question: "What should you do before disinfecting your tools?", options: ["Dry them in the sun", "Clean off any visible debris", "Sterilize plastic tools"], answer: 1, explain: "Debris left on a surface can lead to cross-contamination, so clean it off first." },
    { type: "checkpoint", question: "Which items must NOT be sterilized in boiling water?", options: ["Tweezers", "Jade stone", "Plastic products"], answer: 2, explain: "Sterilizing with heat is only for heat-resistant items such as tweezers or jade stone. Never use it on plastic." },
  ]
);

const L7 = lesson(
  "Allergies and eye conditions",
  "How to spot a reaction, prevent it, and what to do if one happens.",
  [
    { type: "heading", text: "Spotting a reaction" },
    { type: "text", text: "A reaction can affect **one or both eyes**. If it affects both, it may be worse in one." },
    { type: "text", text: "Typical symptoms include:" },
    { type: "list", style: "bullets", items: ["Redness", "Itchiness", "Swelling of the eyelid or the eye", "Tearing and irritation"] },
    { type: "text", text: "In most cases, the person is allergic to the **glue (adhesive)**." },
    { type: "text", text: "Often the glue leaks onto the eyelid or into the eye. The glue's **vapors** can also cause irritation." },
    { type: "text", text: "The most common complication reported is **allergic blepharitis**. It can appear soon after application, or take **several hours or days**." },
    { type: "checkpoint", question: "In most cases, what is the person allergic to?", options: ["The lashes themselves", "The glue or adhesive", "The eye pads"], answer: 1, explain: "Most reactions are to the adhesive, often when it leaks onto the eyelid or into the eye, or through its vapors." },

    { type: "heading", text: "Preventing reactions" },
    {
      type: "compare",
      title: "Prevention",
      doLabel: "Do",
      dontLabel: "Avoid",
      do: ["Use formaldehyde-free products", "Keep the client's eyes closed during application", "Work in a clean area with sanitized equipment"],
      dont: ["Letting glue drip into the eyes", "Unsanitary equipment or an unclean area", "Washing the face for a few hours after application"],
    },
    { type: "text", text: "Some people are more prone to react. The Board of Barbering and Cosmetology recommends these people avoid extensions:" },
    { type: "list", style: "bullets", items: ["People with **alopecia**", "People with **trichotillomania**, the urge to pull out eyelashes", "People receiving **radiation or chemotherapy**"] },

    { type: "heading", text: "If a reaction happens" },
    { type: "text", text: "Reactions can last from **a few hours to a few days**, depending on severity and treatment." },
    { type: "text", text: "Mild reactions may be treated at home with:" },
    { type: "list", style: "bullets", items: ["Eye drops", "Cold compresses", "Antihistamines", "Hydrocortisone cream or ointment"] },
    { type: "callout", tone: "mistake", title: "Don't rub", text: "Resist the temptation to rub itchy eyes." },
    { type: "callout", tone: "key", title: "See a doctor", text: "If symptoms are **severe**, or last more than a few days, the person should see a doctor." },
    { type: "text", text: "If a client has a reaction, the extensions should be **removed**. They should avoid extensions in future and use **mascara** instead." },
    { type: "checkpoint", question: "What should a client do if symptoms are severe?", options: ["Rub the eyes", "Wait it out at home", "See a doctor"], answer: 2, explain: "Severe symptoms need a doctor, who can assess the reaction and provide specific treatment." },
  ]
);

const faq = (front, back) => ({ type: "flip", prompt: "Tap to see how to answer", frontLabel: "Client asks", backLabel: "You answer", front, back });

const L8 = lesson(
  "Client FAQs",
  "Seven questions every client asks, and how to answer them.",
  [
    { type: "heading", text: "Comfort and looks" },
    faq("Do eyelash extensions hurt?", "Not when applied correctly. The artist **isolates one lash** and attaches one extension (classic) or one fan (volume)."),
    faq("Do eyelash extensions look fake?", "Only if that's the look you want. They can be applied to look **any way you desire**, from natural to dramatic."),

    { type: "heading", text: "Lasting and cost" },
    faq("How long do eyelash extensions last?", "Adhesive bonds last **2–6 weeks**, but only as long as the natural lash. A fill is recommended **every 2–3 weeks**."),
    { type: "text", text: "It is normal to lose **1–4 natural lashes per day**." },
    faq("How much do eyelash extensions cost?", "It depends on the artist and the area. In Kenya, the price is between **2k and 20k**."),

    { type: "heading", text: "Lash health" },
    faq("Do they damage my natural lashes?", "Not when applied correctly. A certified artist uses **one extension per natural lash**, in the right weight and length."),
    { type: "callout", tone: "mistake", title: "When damage happens", text: "Extensions that are too heavy, or **clusters (pre-made fans)** that use more adhesive, can cause natural lashes to break." },

    { type: "heading", text: "Mascara and makeup" },
    faq("Can I wear mascara with extensions?", "Yes, but choose an **oil-free, extension-safe** mascara so it doesn't weaken the bond or cause early separation."),
    faq("Can I wear eye makeup?", "Yes! Choose **extension-safe** makeup: oil-free, and usually with sealers that prolong the set."),
    { type: "callout", tone: "tip", title: "Pro tip", text: "Using regular makeup? Use a **daily cleanser and lash-safe makeup remover** to clear residue each night." },
    { type: "checkpoint", question: "Which mascara is recommended for clients with extensions?", options: ["Any mascara", "Oil-free and extension-safe", "Waterproof only"], answer: 1, explain: "Oil-free, extension-safe mascara won't interfere with the bond or cause early separation." },
  ]
);

const L9 = lesson(
  "Eye shapes and lash styles",
  "Read the eye, then choose a style that suits it.",
  [
    { type: "heading", text: "Know the eye" },
    { type: "text", text: "Clients are not all the same, and some have a **mixture of eye shapes**." },
    { type: "text", text: "Look at the **shape and positioning** of the eye. This helps you work out the eye shape and the best style." },
    { type: "figure", url: M + "eye-shapes.webp", caption: "Common eye shapes" },

    { type: "heading", text: "Cat eye" },
    { type: "figure", url: M + "cat-eye.webp", caption: "Cat eye" },
    { type: "text", text: "Use the longest lashes toward the **outer edge** to create the look of wide-set, “exotic” eyes." },
    { type: "text", text: "Suits **almond, close-set and round** eyes." },
    { type: "figure", url: M + "cat-map.webp", caption: "Cat eye lash map" },

    { type: "heading", text: "Doll eye" },
    { type: "figure", url: M + "doll-eye.webp", caption: "Doll (open) eye" },
    { type: "text", text: "Use longer lengths through the **middle** of the lashes to make the eyes look large and open." },
    { type: "text", text: "Suits **almond and wide-set** eyes." },
    { type: "figure", url: M + "doll-map.webp", caption: "Doll eye lash map" },

    { type: "heading", text: "Wispy set" },
    { type: "text", text: "**Bonus style:** the wispy set, also known as the “Kim K” look, is one of the most popular styles." },
    { type: "text", text: "Place longer “spikes” in different sections of the eye for a wispy finish. Suits **almond and round** eyes." },
    { type: "figure", url: M + "wispy-map.webp", caption: "Spiked lash maps to practice with" },
    { type: "flip", prompt: "Tap to see the answer", frontLabel: "Question", backLabel: "Answer", front: "Which of these styles suit **almond** eyes?", back: "All three: **cat eye, doll eye and the wispy set**." },
    { type: "checkpoint", question: "Which style puts the longest lashes at the outer edge?", options: ["Doll eye", "Cat eye", "Wispy set"], answer: 1, explain: "The cat eye uses the longest lashes toward the outer edge." },
  ]
);

const L10 = lesson(
  "Lash length and curls",
  "How long to go, and when to use C curl or D curl.",
  [
    { type: "heading", text: "Choosing a length" },
    { type: "callout", tone: "key", title: "How long?", text: "Choose an extension **shorter than the natural lash, or up to 3 mm longer**. Never more than **50% longer**." },
    { type: "text", text: "Not sure? Lay your client down and hold an extension against a natural lash to judge its length. Then plan your lengths when mapping." },
    { type: "checkpoint", question: "How much longer than the natural lash can an extension be?", options: ["Never more than 50% longer", "Up to double the length", "Any length"], answer: 0, explain: "Go shorter than the natural lash, or up to 3 mm longer, and never more than 50% longer." },

    { type: "heading", text: "C curl" },
    { type: "text", text: "The two most-used curls are **C and D**." },
    { type: "figure", url: M + "c-curl.webp", caption: "C curl" },
    { type: "text", text: "**C curl** is one of the most popular curls worldwide. It gives an **open-eye effect** on clients with a slight natural curl." },
    { type: "text", text: "On slightly downward-angled lashes, it gives a satisfying **lash lift**." },
    { type: "compare", title: "C curl", doLabel: "Use on", dontLabel: "Don't use on", do: ["A slight natural curl", "Slightly downward-angled lashes"], dont: ["Heavily downward-angled lashes (use D curl instead)"] },

    { type: "heading", text: "D curl" },
    { type: "figure", url: M + "d-curl.webp", caption: "D curl" },
    { type: "text", text: "**D curl**, also called CC curl, is like C curl but **curlier**. It brightens and widens the eye with a noticeable curl." },
    { type: "compare", title: "D curl", doLabel: "Use on", dontLabel: "Don't use on", do: ["Straight natural lashes", "Downward-angled natural lashes"], dont: ["Upward-angled lashes", "Hooded eyelids"] },
    { type: "checkpoint", question: "Which curl is recommended for heavily downward-angled lashes?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "For heavily downward-angled lashes, use D curl instead of C curl." },
    { type: "checkpoint", question: "Which curl should not be used on hooded eyelids?", options: ["C curl", "D curl", "Both"], answer: 1, explain: "D curl should not be used on upward-angled lashes or hooded eyelids." },
  ]
);

const L11 = lesson(
  "Step-by-step application",
  "The 18 steps of a lash set, from the waiver to the aftercare talk.",
  [
    { type: "heading", text: "Getting ready: steps 1–8" },
    {
      type: "steps",
      start: 1,
      of: 8,
      items: [
        { title: "Client signs a waiver" },
        { title: "Find out the look your client wants" },
        { title: "Sanitize your hands" },
        { title: "Apply eye pads", text: "Check the eyes can fully close and the pads are not in the eyes." },
      ],
    },
    {
      type: "steps",
      start: 5,
      of: 8,
      items: [
        { title: "Tape the lower lashes", text: "Only if needed, to keep them secure." },
        { title: "Apply primer", text: "Use micro swabs." },
        { title: "Shake the glue for 60 seconds", text: "Then put a pea-sized portion on your jade stone." },
        { title: "Check your tweezers", text: "They must be completely clean for application." },
      ],
    },
    { type: "callout", tone: "tip", title: "Glue rhythm", text: "Put a **fresh dot of glue** on the stone every **20–30 minutes**." },
    { type: "checkpoint", question: "How often should you put down a fresh dot of glue?", options: ["Every 20–30 minutes", "Once per client", "Once per day"], answer: 0, explain: "A fresh dot every 20–30 minutes keeps the adhesive working well." },

    { type: "heading", text: "Applying the lashes: steps 9–18" },
    {
      type: "steps",
      start: 9,
      of: 18,
      items: [
        { title: "Separate one natural lash", text: "Never apply more than one extension to one natural lash." },
        { title: "Pick up, dip, apply", text: "Dip the extension in glue and place it on the natural lash. Use one very small bead of glue." },
        { title: "Alternate between the eyes", text: "If you are a beginner, switch eyes every 2–3 applications." },
        { title: "Brush as you go", text: "Use a mascara wand to brush the extensions throughout." },
      ],
    },
    {
      type: "steps",
      start: 13,
      of: 18,
      items: [
        { title: "Know a full set", text: "On average 60–125 lashes per eye, covering 95–99% of the natural lashes." },
        { title: "Alternate until complete", text: "Keep going until the set is finished on each eye." },
        { title: "Separate stuck lashes", text: "Use tweezers and wands on lashes stuck together or to the eye pad." },
        { title: "Cure the lashes", text: "Use the nano mister." },
      ],
    },
    {
      type: "steps",
      start: 17,
      of: 18,
      items: [
        { title: "Remove tape and eye pads", text: "Do this while the eyes are still closed." },
        { title: "Open the eyes slowly", text: "Help your client open their eyes gently." },
      ],
    },
    { type: "callout", tone: "key", title: "Before they leave", text: "Always explain **aftercare** to your client." },
    { type: "checkpoint", question: "How many extensions go on one natural lash?", options: ["One", "Two", "As many as fit"], answer: 0, explain: "Never apply more than one eyelash extension to one natural lash." },
  ]
);

const L12 = lesson(
  "Removal and aftercare",
  "How to remove extensions safely, and the aftercare every client needs.",
  [
    { type: "heading", text: "Removing extensions" },
    {
      type: "steps",
      start: 1,
      of: 10,
      items: [
        { title: "Prepare a professional glue remover" },
        { title: "Protect the skin", text: "Place under-eye pads, with tape or cotton pads on top. A must-do against the strong remover." },
        { title: "Set a drop of remover on a surface" },
        { title: "Apply to the extensions", text: "Use a micro swab." },
      ],
    },
    {
      type: "steps",
      start: 5,
      of: 10,
      items: [
        { title: "Wait about 5 minutes" },
        { title: "Remove the extensions", text: "Use a swab or tweezers." },
        { title: "Clean off leftover remover", text: "Use a fresh swab on the natural lashes." },
        { title: "Rinse thoroughly", text: "Soak a cotton pad or swab in water and rinse the natural lashes." },
      ],
    },
    {
      type: "steps",
      start: 9,
      of: 10,
      items: [
        { title: "Dry and brush", text: "Dry the wet lashes with a mini fan, then brush them." },
        { title: "Extensions removed!" },
      ],
    },

    { type: "heading", text: "Important points" },
    { type: "callout", tone: "mistake", title: "Don't rub", text: "Rubbing or fiddling with extensions right after applying remover can cause **itchiness**. Wait **at least 5 minutes**." },
    { type: "callout", tone: "key", title: "Cleanse first", text: "Cleanse the remover off the natural lashes **before** applying any liquid. Leftover remover can cause a **blooming effect**." },
    { type: "callout", tone: "mistake", title: "Rinse well", text: "Remover that is not rinsed off can **irritate the eyes** or affect the retention of the next set. Use a **lash bath**." },
    { type: "checkpoint", question: "How long should you wait after applying glue remover?", options: ["30 seconds", "At least 5 minutes", "An hour"], answer: 1, explain: "Wait at least 5 minutes before removing the extensions. Rubbing or fiddling too early can cause itchiness." },

    { type: "heading", text: "Aftercare for your clients" },
    { type: "quote", text: "Lashes are a luxury, and special care is needed to keep them full and gorgeous." },
    { type: "compare", title: "Daily habits", doLabel: "Do", dontLabel: "Don't", do: ["Cleanse gently every night with a lash bath", "Brush lashes daily"], dont: ["Pick or pull on your lashes", "Wear false lashes over extensions"] },
    { type: "callout", tone: "tip", title: "Why it works", text: "A **lash bath** removes makeup build-up, dirt and oils without risking retention. Daily brushing helps lashes **shed properly** and stay straight." },
    { type: "callout", tone: "mistake", title: "Avoid anything oily", text: "Oil-based makeup, mascara, eye creams, serums and lotions **degrade the glue**." },
    { type: "callout", tone: "tip", title: "Sleep smart", text: "Don't sleep on your face: the side you sleep on loses more lashes. A **silk pillowcase** is gentler on lashes and skin." },
    { type: "checkpoint", question: "Why should clients avoid anything oily near their lashes?", options: ["It dries the lashes out", "Oil degrades the glue", "It makes lashes too heavy"], answer: 1, explain: "Oil-based products break down the glue and reduce how long the extensions stay on." },
  ]
);

const FINAL = {
  title: "Final assessment",
  kind: "assessment",
  summary: "Ten questions to check what you've learned. Score 70% to pass.",
  is_preview: true,
  read_minutes: 0,
  blocks: [
    {
      type: "quiz",
      passScore: 70,
      questions: [
        { q: "Where on the natural lash is an extension attached?", options: ["Directly on the eyelid", "1–2 mm from the base, never touching the eyelid", "At the tip of the lash"], answer: 1, explain: "Extensions are applied 1–2 mm from the base of the natural lash and never touch the eyelid." },
        { q: "Which growth phase is also called the resting stage?", options: ["Anagen", "Catagen", "Telogen"], answer: 2, explain: "Telogen is the resting stage, which can last over 100 days." },
        { q: "What ratio describes classic lashes?", options: ["1:1", "3:1", "10:1"], answer: 0, explain: "Classic lashes are one extension applied to one natural lash." },
        { q: "Why is tape used on the lower lashes?", options: ["To make them longer", "To stop them crisscrossing with the upper lashes", "To hold the glue"], answer: 1, explain: "Without tape, lower lashes can crisscross with the upper ones and a client's eye could get glued shut." },
        { q: "Which decontamination method uses high heat?", options: ["Cleaning", "Sanitizing", "Sterilizing"], answer: 2, explain: "Sterilizing uses high heat and is the most effective at killing all living organisms on hard surfaces." },
        { q: "For how long should you wash your hands between clients?", options: ["At least 30 seconds", "10 seconds", "Only once a day"], answer: 0, explain: "Wash thoroughly with warm water and soap for at least 30 seconds." },
        { q: "In most allergic reactions to lash extensions, what is the person allergic to?", options: ["The eye pads", "The lash material", "The glue or adhesive"], answer: 2, explain: "In most cases the reaction is to the adhesive that attaches the lashes." },
        { q: "How much longer than the natural lash can an extension be?", options: ["Never more than 50% longer", "Up to twice as long", "Any length"], answer: 0, explain: "Go shorter than the natural lash, or up to 3 mm longer. Never more than 50% longer." },
        { q: "Which curl should NOT be used on hooded eyelids?", options: ["C curl", "D curl", "Neither"], answer: 1, explain: "D curl should not be used on upward-angled lashes or hooded eyelids." },
        { q: "How long should you wait after applying glue remover before removing extensions?", options: ["At least 5 minutes", "30 seconds", "An hour"], answer: 0, explain: "Wait at least 5 minutes. Rubbing or fiddling too early can cause itchiness." },
      ],
    },
  ],
};

export const CLASSIC_SET_ESSENTIALS = {
  slug: "classic-set-essentials",
  title: "Classic Set Essentials",
  subtitle: "The foundation every lash tech starts with",
  description:
    "From lash history and eye anatomy to safe application, removal and aftercare: everything a beginner needs before their first client.",
  level: "beginner",
  is_free: true,
  price: 0,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  modules: [
    { title: "Foundations", lessons: [L1, L2, L3] },
    { title: "Tools and safety", lessons: [L4, L5, L6, L7] },
    { title: "Clients and styling", lessons: [L8, L9, L10] },
    { title: "The service", lessons: [L11, L12, FINAL] },
  ],
};
