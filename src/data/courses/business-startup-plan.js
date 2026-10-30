// Solo Lash Business Startup Plan: built from the Lashes by Shazz Academy "Solo Business Startup Plan" (3-page PDF).
// The PDF is a one-line-per-heading template: 8 sections, each with three or four prompts. Every prompt and its
// wording is kept (in bold, or as the opening line of its section), and each one is then explained and turned into
// something the student can actually write down for a solo lash business.
//
// ADDED CONTENT: the template is thin, so most of the explanation here is new. It is practical guidance, not new
// facts or figures. Where the PDF speaks about a general esthetician (facials, waxing) or US terms (LLC, state and
// federal permits), the lessons translate it to a lash business in Kenya and tell the student to confirm local rules
// with their county. The worked numbers in "The numbers" module are clearly labelled example figures for practice,
// not market prices. The full list of additions is in BUSINESS-STARTUP-PLAN-NOTES.md in the checkout root.
//
// Written for ARTICLE mode (long-form reading): the migration sets courses.reading_view = 'article'.
//
// Images: public/course-media/business-startup-plan/. cover.webp and plan-page.webp come from the PDF itself and
// logo-footer.webp is the Lashes by Shazz logo used by the other Shazz courses. The other 12 are free Pexels photos
// (Pexels licence: free to use and modify, no attribution required); photographers are listed in
// public/course-media/business-startup-plan/CREDITS.md.
//
// The final exam is not a lesson: it goes into course_exams (migration 0028) from the EXAM export below.
// Generate lesson rows with: node scripts/course-to-sql.mjs src/data/courses/business-startup-plan.js
// (0042_course_business_startup_plan.sql was written from this file, with the same ids.)

const M = "/course-media/business-startup-plan/";

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

// Questions are written with the right answer first; mix() moves it to a different position in each question
// (by its place in the list) so the correct option is not always the top one.
const mix = (qs) => qs.map((x, i) => {
  const n = x.options.length;
  const k = i % n;
  const options = x.options.map((_, o) => x.options[(o - k + n) % n]);
  return { ...x, options, answer: (x.answer + k) % n };
});

const quiz = (title, summary, questions, passScore = 70) => ({
  title,
  kind: "assessment",
  summary,
  is_preview: false,
  read_minutes: 0,
  blocks: [{ type: "quiz", passScore, questions: mix(questions) }],
});

// ---------------------------------------------------------------------------
// Module 1: Start here
// ---------------------------------------------------------------------------

const L1 = lesson(
  "Why Every Lash Artist Needs a Plan",
  "What a business startup plan is, why a solo lash artist needs one, and the eight parts you will write.",
  [
    { type: "heading", text: "From lash artist to business owner" },
    { type: "figure", url: M + "cover.webp", caption: "Solo Business Startup Plan · Lashes by Shazz Academy" },
    { type: "text", text: "You have learned to lash. The next question is the one that decides whether lashing pays your rent: **how do you turn the skill into a business?** That is what this course is about." },
    { type: "text", text: "A business startup plan is simply your business, thought through and written down. It answers the questions every new business owner faces, *before* the money is spent: who am I serving, what will I charge, where will I work, how will clients find me, what will it cost to start, and when will I start making a profit?" },
    { type: "text", text: "You do not need to be an accountant or have a big budget to write one. A solo lash artist’s plan can fit in a notebook. What matters is that you have thought about each part honestly, because a problem you find on paper costs nothing to fix, while the same problem found after you have paid rent and bought stock costs real money." },
    { type: "callout", tone: "key", title: "In one line", text: "A plan is cheaper than a mistake. Write it before you spend." },

    { type: "heading", text: "The eight parts of your plan" },
    { type: "text", text: "The Lashes by Shazz Solo Business Startup Plan has eight sections. Each one answers a different question, and each one builds on the one before it:" },
    { type: "figure", url: M + "plan-page.webp", caption: "The Business Startup Plan template" },
    { type: "steps", items: [
      { title: "Executive Summary", text: "Who you are: your business name, location, mission, goals and services, in brief." },
      { title: "Business Description", text: "How your business is set up, who it is for, and what makes it different." },
      { title: "Market Analysis", text: "The industry you are entering, your competitors and your customers." },
      { title: "Services Offered", text: "Your service list, how you price it, and your opening offers." },
      { title: "Marketing and Sales Strategy", text: "Your brand, how clients will find you, and how you keep them." },
      { title: "Operational Plan", text: "Your hours, your bookings, your suppliers and your space." },
      { title: "Financial Plan", text: "What it costs to start, what you expect to earn, and when you break even." },
      { title: "Legal and Regulatory Issues", text: "Licences, insurance and health and safety." },
    ] },

    { type: "heading", text: "How to use this course" },
    { type: "text", text: "Keep a notebook (or a notes app) open next to this course. Each lesson explains one part of the plan, gives you an example, and ends with the questions you should answer for *your* business. By the last lesson you will have a full first draft of your plan, and a checklist to make sure nothing is missing." },
    { type: "text", text: "There is a short quiz at the end of the bigger parts and a final exam at the end of the course. Pass the exam to earn your certificate." },
    { type: "callout", tone: "tip", title: "Write as you read", text: "Do not wait until the end to start writing. A rough answer today is worth more than a perfect answer you never write." },
  ],
  { is_preview: true }
);

// ---------------------------------------------------------------------------
// Module 2: Who you are (Executive Summary + Business Description)
// ---------------------------------------------------------------------------

const L2 = lesson(
  "Your Name, Location & Mission",
  "Executive Summary, part 1: choosing a business name and location, and writing a mission statement.",
  [
    { type: "heading", text: "The Executive Summary" },
    { type: "text", text: "The first section of the plan is the **Executive Summary**. It is a short picture of your whole business: if someone read only this page, they should know what you do, where, for whom, and where you are heading." },
    { type: "callout", tone: "tip", title: "Write it last", text: "Even though it comes first, most people write the summary last, once the rest of the plan is done. Make rough notes now and come back to polish it." },
    { type: "figure", url: M + "planning-desk.webp", caption: "Start with the basics: a name, a place and a purpose" },

    { type: "heading", text: "Business name and location" },
    { type: "text", text: "**Business Name and Location:** Choose a business name and decide on the location." },
    { type: "text", text: "Your name is the first thing a client sees, on Instagram, on WhatsApp and on your door. A good lash business name is:" },
    { type: "list", style: "checklist", items: [
      "**Easy to say and spell**, so a client can tell a friend and the friend can find you.",
      "**Clear about what you do.** A word like *lash*, *lashes* or *beauty* in the name helps people understand you at a glance.",
      "**Available.** Search for it on Instagram, TikTok and Google before you fall in love with it, and check that no one nearby is already using it.",
      "**Room to grow.** A name that only fits one service (or one street) can feel small if you later add brows or move.",
    ] },
    { type: "text", text: "Your location is just as important. Will clients come to a studio, a shared salon, or your home? Or will you travel to them? Think about where your clients live and work, how easy it is to get there, whether the place feels safe and clean, and what you can afford. You will look at the cost of the space in more detail in the Operational Plan." },
    { type: "checkpoint", question: "Before you print anything with your new business name, what should you check first?", options: ["That it sounds expensive", "That no one nearby is already using it, and it is free on social media", "That it is in English"], answer: 1, explain: "Check that the name is available, locally and on the social platforms you will use, before you spend money on signs and cards." },

    { type: "heading", text: "Your mission statement" },
    { type: "text", text: "**Mission Statement:** Define what your business stands for and its core values." },
    { type: "text", text: "A mission statement is one or two sentences about *why* your business exists and *how* you work. It sounds formal, but it is really a promise to your clients and a guide for you: when you face a decision, you can ask, “Does this fit what I stand for?”" },
    { type: "text", text: "A simple way to write one is to answer three questions in a single sentence: **what** do you do, **for whom**, and **how** (the values you will not compromise on)." },
    { type: "quote", text: "Example: “We give busy women in our town beautiful, natural-looking lashes in a clean, calm studio, with safe products and honest advice.”" },
    { type: "text", text: "Notice how the example already tells you about the values: *clean*, *safe*, *honest*. Those are your core values. Pick three or four that you truly mean, such as hygiene, honesty, punctuality, kindness or quality, and let them shape everything from your aftercare advice to how you answer a complaint." },
    { type: "callout", tone: "note", title: "Write yours", text: "Your business name, your location (or two options), and a one-sentence mission with three core values." },
  ]
);

const L3 = lesson(
  "Goals & Your Services in Brief",
  "Executive Summary, part 2: setting short-term and long-term goals, and summing up what you offer.",
  [
    { type: "heading", text: "Business goals" },
    { type: "text", text: "**Business Goals:** Short-term and long-term goals for your business." },
    { type: "text", text: "Goals turn a dream into a direction. Without them it is hard to tell whether the business is doing well or just keeping you busy. Split them into two kinds:" },
    { type: "compare", title: "Two kinds of goals", doLabel: "Short-term (the first months)", dontLabel: "Long-term (one to three years)",
      do: ["Finish my kit and practise on models", "Get my first paying clients", "Build a portfolio of my own work", "Earn enough to cover my monthly costs"],
      dont: ["Have a steady list of regular refill clients", "Move into my own studio", "Add a new service such as volume or brows", "Train or employ another artist"] },
    { type: "figure", url: M + "writing-goals.webp", caption: "Write your goals down, and put a date next to each one" },
    { type: "text", text: "A goal is much more useful when you can tell whether you reached it. “Get more clients” is a wish. “Have 10 clients who come back for refills by the end of my third month” is a goal: it has a number and a date, so you know exactly what you are aiming for and when to check." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Turn this wish into a goal", front: "“I want to grow on Instagram.”", backLabel: "A goal", back: "“Post my own work three times a week and reach 500 local followers by June.”" },

    { type: "heading", text: "Overview of services" },
    { type: "text", text: "**Overview of Services:** Brief description of the services you will offer." },
    { type: "text", text: "In the summary you only need a short list, not prices or details: for example, “classic, hybrid and volume full sets, refills, and lash removal.” You will build the full service list and prices in the Services Offered section." },
    { type: "callout", tone: "tip", title: "Start small", text: "It is fine to launch with only the services you can already do well. A short menu done beautifully beats a long menu done badly." },

    { type: "heading", text: "Putting the summary together" },
    { type: "text", text: "Once your notes are ready, your executive summary can be just a few short paragraphs:" },
    { type: "list", style: "numbered", items: [
      "Your business name and where you work.",
      "Your mission and core values.",
      "Your two or three most important short-term goals, and your big long-term goal.",
      "The services you offer, in one line.",
    ] },
    { type: "checkpoint", question: "Which of these is a clear business goal?", options: ["“Be the best lash artist ever”", "“Get 10 regular refill clients by the end of month three”", "“Work hard”"], answer: 1, explain: "A clear goal has a number and a date, so you can tell whether you reached it." },
  ]
);

const L4 = lesson(
  "How Your Business Is Set Up",
  "Business Description, part 1: choosing a business structure for a solo lash business.",
  [
    { type: "heading", text: "The Business Description" },
    { type: "text", text: "The second section of the plan, the **Business Description**, goes one level deeper than the summary. It explains how the business is set up, who it is for, and why clients should choose you. We start with the set-up." },

    { type: "heading", text: "Business structure" },
    { type: "text", text: "**Business Structure:** Sole proprietorship, LLC, partnership, etc." },
    { type: "text", text: "Your business structure is the legal form your business takes. It decides who owns the business, who is responsible for its debts, and how it is registered and taxed. The common options are:" },
    { type: "steps", items: [
      { title: "Sole proprietorship", text: "You own and run the business on your own, under your own name or a registered business name. It is the simplest and cheapest to set up, but you are personally responsible for the business’s debts." },
      { title: "Partnership", text: "Two or more people own the business together and share the profits, the work and the responsibility. Write down who does what and how profits are shared before you start." },
      { title: "Limited company", text: "The business is its own legal “person”, separate from you. It protects your personal belongings if the business runs into debt, but it costs more to register and needs more paperwork every year. (The PDF’s “LLC” is the American name for this kind of protected business.)" },
    ] },
    { type: "text", text: "For most solo lash artists starting out, a **sole proprietorship** is the natural first step: you are the business, it is quick to register, and you can change to a company later as you grow." },
    { type: "callout", tone: "note", title: "Registering in Kenya", text: "In Kenya, business names, partnerships and companies are registered with the Business Registration Service, through eCitizen. Rules and fees change, so check the current requirements there (or with an accountant) before you register." },
    { type: "checkpoint", question: "You are starting alone and want the simplest set-up. Which structure fits best?", options: ["Sole proprietorship", "Limited company", "Partnership"], answer: 0, explain: "A sole proprietorship is the simplest and cheapest structure for one person. You can change to a company later." },

    { type: "heading", text: "Keep business money separate" },
    { type: "text", text: "Whatever structure you choose, keep the business money apart from your personal money, even as a sole proprietor. A separate account or M-Pesa till for the business lets you see clearly what the business earns and spends, which you will need for the Financial Plan." },
    { type: "callout", tone: "mistake", title: "A common mistake", text: "Paying for lash stock, lunch and transport out of the same wallet. At the end of the month you cannot tell whether the business made money." },
  ]
);

const L5 = lesson(
  "Your Ideal Client & What Makes You Different",
  "Business Description, part 2: defining your target market and your unique selling proposition (USP).",
  [
    { type: "heading", text: "Target market" },
    { type: "text", text: "**Target Market:** Define your primary audience (e.g., age, gender, income level)." },
    { type: "text", text: "Your target market is the group of people you most want to serve. It can feel safer to say “everyone”, but a business that speaks to everyone speaks to no one in particular. When you know exactly who your client is, you know where to find her, what she can pay, what she wants her lashes to look like, and what to say in your posts." },
    { type: "figure", url: M + "lash-artist.webp", caption: "Picture your ideal client in your chair" },
    { type: "text", text: "Describe your ideal client in as much detail as you can:" },
    { type: "list", style: "dot", items: [
      "**Age and gender:** for example, women aged 20 to 35.",
      "**Income level:** what she can comfortably spend on beauty each month, and how often she can afford refills.",
      "**Where she lives or works:** near your studio, in a nearby estate, at the campus down the road.",
      "**Lifestyle:** student, office worker, bride-to-be, busy mum, someone who loves going out.",
      "**What she wants:** a natural everyday look, dramatic volume for events, or low-maintenance lashes for work.",
    ] },
    { type: "flip", prompt: "Tap the card", frontLabel: "Too broad", front: "“My clients are women.”", backLabel: "Clear", back: "“Working women aged 25–40 near the CBD who want natural lashes they can wear to the office.”" },

    { type: "heading", text: "Unique selling proposition (USP)" },
    { type: "text", text: "**Unique Selling Proposition (USP):** What makes your services unique or better than the competition?" },
    { type: "text", text: "Your USP is the main reason a client should choose you over the other lash artists nearby. It must be something the client actually cares about, and something you can truly deliver every time." },
    { type: "text", text: "Ideas for a lash artist’s USP:" },
    { type: "list", style: "checklist", items: [
      "**Hygiene and safety you can see:** sterilised tools, fresh disposables for every client, a spotless station.",
      "**Retention:** lashes that last because of good preparation, isolation and aftercare advice.",
      "**A speciality:** natural classic sets, wispy styles, or quick, neat refills.",
      "**Convenience:** evening and weekend hours, a location near transport, or home visits.",
      "**Experience:** a calm space, on-time appointments, and honest advice about what suits her eyes.",
    ] },
    { type: "text", text: "Try to sum your USP up in a single sentence you could put in your Instagram bio, for example: “Natural, long-lasting classic lashes, done with sterilised tools in a calm studio.”" },
    { type: "checkpoint", question: "Which is the strongest USP for a new lash artist?", options: ["“I am the cheapest in town”", "“Natural, long-lasting lashes done with sterilised tools”", "“I do everything”"], answer: 1, explain: "A strong USP is something clients value and you can deliver every time. Being the cheapest is easy for a competitor to copy and hard to live on." },
  ]
);

const Q1 = quiz(
  "Quiz: Who You Are",
  "Five questions on the executive summary and business description.",
  [
    { q: "What does the executive summary give the reader?", options: ["A short picture of the whole business", "Your full price list", "Your bank statements"], answer: 0, explain: "The executive summary is a brief overview: name and location, mission, goals and services." },
    { q: "What does a mission statement describe?", options: ["What your business stands for and its core values", "How much you will earn", "Your opening hours"], answer: 0, explain: "The mission statement defines what your business stands for and its core values." },
    { q: "Which of these is a long-term goal?", options: ["Finish my lash kit this week", "Move into my own studio within two years", "Post my first photo today"], answer: 1, explain: "Long-term goals look one to three years ahead, like opening your own studio." },
    { q: "Who is personally responsible for the debts of a sole proprietorship?", options: ["The owner", "The government", "No one"], answer: 0, explain: "In a sole proprietorship, you are the business, so you are personally responsible for its debts." },
    { q: "What is a USP?", options: ["What makes your services unique or better than the competition", "A type of lash glue", "A business licence"], answer: 0, explain: "Your Unique Selling Proposition is the main reason a client should choose you." },
  ]
);

// ---------------------------------------------------------------------------
// Module 3: Know your market (Market Analysis)
// ---------------------------------------------------------------------------

const L6 = lesson(
  "The Beauty Industry & Your Customers",
  "Market Analysis, part 1: understanding the industry you are entering and the people who will buy from you.",
  [
    { type: "heading", text: "Why study the market?" },
    { type: "text", text: "The third section of the plan, the **Market Analysis**, is where you check your ideas against the real world. You have described who you want to serve; now you find out how many of those people there are, what they already buy, and who else is serving them." },
    { type: "figure", url: M + "market-research.webp", caption: "Research first, spend second" },

    { type: "heading", text: "Industry overview" },
    { type: "text", text: "**Industry Overview:** Size, trends, and growth potential of the beauty and skincare industry." },
    { type: "text", text: "You do not need a big research report. As a solo artist, you are looking at the beauty industry *around you*. Ask yourself:" },
    { type: "list", style: "dot", items: [
      "**Size:** how many salons and lash artists are there in my area? Are they busy?",
      "**Trends:** which looks are people asking for right now: natural classics, wispy sets, volume, colour? Which services are growing?",
      "**Growth potential:** are new estates, offices or campuses opening nearby? Are more people in my area starting to get lashes done?",
    ] },
    { type: "text", text: "Good places to look: the Instagram and TikTok pages of salons near you, beauty suppliers (who see what artists are buying), and simply asking friends and clients what they would pay for and how often." },
    { type: "callout", tone: "tip", title: "Write down your sources", text: "When you write a fact into your plan, note where it came from. It helps you tell real information from guesses." },

    { type: "heading", text: "Customer demographics" },
    { type: "text", text: "**Customer Demographics:** Detailed analysis of your potential customer base." },
    { type: "text", text: "Demographics are the facts that describe a group of people: age, gender, income, job, where they live. In the Business Description you described your *ideal* client. Here you check that there are enough of those people within reach of your location to keep you busy." },
    { type: "text", text: "A practical way to do this is a small survey. Ask 20 or 30 women who fit your target market a few short questions, in person or on WhatsApp:" },
    { type: "list", style: "numbered", items: [
      "Have you had lash extensions before? Where?",
      "What style do you like?",
      "How much did you pay, and how often do you get a refill?",
      "What would make you switch to a new lash artist?",
      "Which days and times suit you best?",
    ] },
    { type: "text", text: "Their answers tell you about prices, styles, opening hours and what matters most to clients, all of which you will use in the next sections." },
    { type: "checkpoint", question: "What is the purpose of the customer demographics part of your plan?", options: ["To check there are enough of your target clients within reach", "To list your equipment", "To choose your logo colours"], answer: 0, explain: "Demographics check that your potential customer base is big enough, and tell you what those people want and can pay." },
  ]
);

const L7 = lesson(
  "Studying Your Competitors",
  "Market Analysis, part 2: finding local competitors and learning from their strengths and weaknesses.",
  [
    { type: "heading", text: "Competitor analysis" },
    { type: "text", text: "**Competitor Analysis:** Identify local competitors, their strengths and weaknesses." },
    { type: "text", text: "Your competitors are the other places your ideal client could go for lashes: salons, lash studios, and other artists who work from home or travel to clients. Studying them is not about copying them, and it is not about criticising them. It is about finding the gap: something clients want that nobody near you is doing well." },

    { type: "heading", text: "How to study a competitor" },
    { type: "steps", items: [
      { title: "Make a list", text: "Write down 3 to 5 lash businesses your ideal client might use: search Instagram, TikTok and Google Maps for lashes in your area." },
      { title: "Look at their prices and services", text: "What do they offer, and what do they charge for a full set and a refill?" },
      { title: "Read their reviews and comments", text: "What do clients praise? What do they complain about: lateness, retention, hygiene, price?" },
      { title: "Look at their work", text: "Are their photos clear and consistent? Which styles do they post most?" },
      { title: "Note strengths and weaknesses", text: "One or two of each, in plain words." },
    ] },
    { type: "text", text: "Lay it out in a simple table in your notebook, one row per competitor:" },
    { type: "list", style: "dot", items: [
      "**Name and location**",
      "**Services and prices**",
      "**Strengths:** for example, beautiful photos, central location, quick refills.",
      "**Weaknesses:** for example, hard to book, often late, complaints about lashes falling off.",
    ] },
    { type: "compare", title: "What a competitor’s weakness can tell you", doLabel: "If clients complain about", dontLabel: "Your chance to stand out",
      do: ["“She is always late”", "“My lashes fell off in a week”", "“I could never get a weekend slot”"],
      dont: ["Be strictly on time, and say so", "Focus on retention and clear aftercare", "Open on Saturdays or evenings"] },
    { type: "text", text: "Look back at the USP you wrote in the Business Description. Does your competitor research support it? If every artist near you already promises the same thing, sharpen your USP until it is truly yours." },
    { type: "callout", tone: "mistake", title: "Do not", text: "Do not copy a competitor’s photos or post negative comments about them. Win clients with your own work and your own service." },
    { type: "checkpoint", question: "Several clients say a nearby salon is hard to book on weekends. How could you use this?", options: ["Ignore it", "Offer weekend appointments and make booking easy", "Copy their price list"], answer: 1, explain: "A competitor’s weakness is a gap you can fill, if it is something your ideal client cares about." },
  ]
);

// ---------------------------------------------------------------------------
// Module 4: Services & pricing (Services Offered)
// ---------------------------------------------------------------------------

const L8 = lesson(
  "Building Your Service Menu",
  "Services Offered, part 1: turning your skills into a clear service list.",
  [
    { type: "heading", text: "Your service list" },
    { type: "text", text: "**Detailed Service List:** the services you will offer. (The template is written for a general esthetician and gives facials, skin treatments and waxing as examples; for a lash business, your list is your lash services.)" },
    { type: "figure", url: M + "lash-service.webp", caption: "Every service on your menu is a promise of a result" },
    { type: "text", text: "Your service menu tells clients exactly what they can book. For each service, write down:" },
    { type: "list", style: "checklist", items: [
      "**The name** the client will see, for example “Classic Full Set”.",
      "**What it includes**, in one line a client understands.",
      "**How long it takes**, so you can plan your day (you will use this in the Operational Plan).",
      "**The materials it uses**, so you can work out what it costs you (you will use this to set prices).",
    ] },
    { type: "text", text: "A typical lash menu is built from these kinds of services:" },
    { type: "steps", items: [
      { title: "Full sets", text: "Classic, hybrid or volume: a brand-new set on clean natural lashes." },
      { title: "Refills (fills)", text: "Topping up a set every two to three weeks as natural lashes shed." },
      { title: "Removal", text: "Safely removing a set, done by you or by another artist." },
      { title: "Extras", text: "Optional add-ons you are trained in, such as a lash bath or colour lashes." },
    ] },
    { type: "callout", tone: "key", title: "Only offer what you are trained to do", text: "Your menu is a promise. Only list services you have been trained in and can deliver safely, every time." },
    { type: "text", text: "Refills deserve special attention. A full set brings a client in; refills bring her back every few weeks. In a lash business, the regular refill client is the backbone of your income, which is why customer retention gets its own lesson later." },
    { type: "checkpoint", question: "Why are refills so important to a lash business?", options: ["They bring the same client back every few weeks", "They use no materials", "They are always the most expensive service"], answer: 0, explain: "Refills turn a one-time client into a regular one, which gives you steady income." },
  ]
);

const L9 = lesson(
  "Pricing Your Services & Opening Offers",
  "Services Offered, part 2: setting prices from your costs and the market, and planning promotions and loyalty.",
  [
    { type: "heading", text: "Pricing strategy" },
    { type: "text", text: "**Pricing Strategy:** Competitive pricing model based on market research." },
    { type: "text", text: "Pricing is where many new artists go wrong, usually by charging too little. A good price has to do two jobs at once: **cover your costs and pay you**, and **make sense to your clients** next to what others charge. So you look at it from both sides." },
    { type: "steps", items: [
      { title: "1. Your costs", text: "What does one service cost you in materials (lashes, glue, pads, tape, disposables) plus a share of your rent, power and other monthly bills?" },
      { title: "2. Your time", text: "How long does it take, and what do you want to earn for that time?" },
      { title: "3. The market", text: "What do your competitors charge for the same service? (You collected this in your competitor research.)" },
      { title: "4. Your position", text: "Where does your USP and your experience place you: below, level with, or above the average?" },
    ] },
    { type: "text", text: "Your price must be **above** your costs; there is no point being busy if every service loses money. Within that, market research tells you the range clients in your area expect to pay. A new artist often starts in the middle of that range and raises prices as her skill, portfolio and reviews grow." },
    { type: "callout", tone: "mistake", title: "The cheapest-in-town trap", text: "Competing only on price fills your diary but empties your pocket, and it attracts clients who will leave the moment someone is cheaper. Compete on quality and service instead." },
    { type: "flip", prompt: "Tap the card", frontLabel: "Question", front: "Can a price be too low?", backLabel: "Answer", back: "Yes. If it does not cover materials, bills and your time, every booking costs you money." },

    { type: "heading", text: "Special offers" },
    { type: "text", text: "**Special Offers:** Initial promotional offers or loyalty programs." },
    { type: "text", text: "Offers help you get your first clients and keep them coming back. They work best when they have a clear purpose and an end date." },
    { type: "list", style: "dot", items: [
      "**Opening offer:** a discount on a first full set, for a limited time, to fill your diary while you build a portfolio.",
      "**Refill reminder:** a lower price when a client comes back for her refill within the recommended weeks.",
      "**Loyalty card:** for example, a stamp for every refill and a free extra after a set number of visits.",
      "**Referral reward:** a small discount for a client who brings a friend, and for the friend too.",
    ] },
    { type: "text", text: "Before you announce an offer, check the numbers: the discounted price must still cover your materials. An offer that loses money on every client is not a marketing plan, it is a gift." },
    { type: "checkpoint", question: "What is the first thing a price must do?", options: ["Be lower than every competitor", "Cover your costs and pay for your time", "Be a round number"], answer: 1, explain: "A price must cover your costs and pay you. Only then do you compare it with the market." },
  ]
);

const Q2 = quiz(
  "Quiz: Market, Services & Pricing",
  "Five questions on market analysis, your service menu and pricing.",
  [
    { q: "What are you looking for when you study competitors?", options: ["A gap: something clients want that no one nearby does well", "Photos you can copy", "Reasons to criticise them online"], answer: 0, explain: "Competitor analysis looks at local competitors’ strengths and weaknesses to find where you can stand out." },
    { q: "Which of these is a good, simple way to research customer demographics?", options: ["A short survey of women who fit your target market", "Guessing", "Asking your supplier for your prices"], answer: 0, explain: "Asking real potential clients a few short questions tells you about prices, styles and times." },
    { q: "Which service turns a one-time client into a regular one?", options: ["Refills", "Removal", "Lash bath"], answer: 0, explain: "Refills bring the client back every few weeks: the backbone of a lash business’s income." },
    { q: "Your pricing strategy should be based on…", options: ["Your costs, your time and market research", "Whatever your friend charges", "The highest price you have ever seen"], answer: 0, explain: "The plan calls for a competitive pricing model based on market research, and the price must also cover your costs." },
    { q: "What must you check before running a discount offer?", options: ["That the discounted price still covers your materials", "That it lasts forever", "That it is the biggest discount in town"], answer: 0, explain: "An offer should have a purpose and an end date, and still cover your costs." },
  ]
);

// ---------------------------------------------------------------------------
// Module 5: Getting & keeping clients (Marketing and Sales Strategy)
// ---------------------------------------------------------------------------

const L10 = lesson(
  "Building Your Brand",
  "Marketing and Sales Strategy, part 1: logo, business cards and a consistent look.",
  [
    { type: "heading", text: "What a brand really is" },
    { type: "text", text: "**Branding:** Logo, business cards, and thematic visual elements." },
    { type: "text", text: "Your brand is how people recognise you and what they feel about your business. The logo and colours are the visible part, but the experience is part of the brand too: how clean your space is, how you greet clients, how your lashes look a week later. Everything the client sees and feels should tell the same story as your mission statement." },
    { type: "figure", url: M + "business-cards.webp", caption: "Simple, consistent and easy to read" },

    { type: "heading", text: "The visible pieces" },
    { type: "steps", items: [
      { title: "Logo", text: "Simple and readable at a small size, because it will mostly be seen as a tiny circle on Instagram or WhatsApp. Your business name in a clean font is enough to start." },
      { title: "Business cards", text: "Your name, logo, phone or WhatsApp number, Instagram handle and location. Hand one to every client: it is how she will tell a friend about you." },
      { title: "Thematic visual elements", text: "Two or three brand colours and one or two fonts that you use everywhere: your posts, price list, cards, aftercare sheet and the way your station is set up." },
    ] },
    { type: "text", text: "Consistency is what makes a brand recognisable. If your Instagram looks one way, your price list another, and your studio a third, clients cannot form a picture of you. Choose your look once, write it down (colours, fonts, the style of your photos), and stick to it." },
    { type: "callout", tone: "tip", title: "Your work is your best advertising", text: "Clear, well-lit before-and-after photos of your own lash work, taken in the same spot with the same light, do more for your brand than any logo." },
    { type: "checkpoint", question: "What makes a brand easy to recognise?", options: ["Changing your colours every month", "Using the same look everywhere, consistently", "Using as many fonts as possible"], answer: 1, explain: "Consistency (the same colours, fonts and photo style everywhere) is what makes a brand recognisable." },
  ]
);

const L11 = lesson(
  "Finding Clients & Keeping Them",
  "Marketing and Sales Strategy, part 2: marketing channels, referrals and customer retention.",
  [
    { type: "heading", text: "Marketing channels" },
    { type: "text", text: "**Marketing Channels:** Social media, local advertising, partnerships, and referrals." },
    { type: "text", text: "A marketing channel is a route by which new clients find you. You do not need to be on every channel. Choose the two or three where your ideal client already spends her time, and do them well." },
    { type: "figure", url: M + "social-content.webp", caption: "Social media is a lash artist’s shop window" },
    { type: "steps", items: [
      { title: "Social media", text: "Instagram, TikTok and WhatsApp Status are where most clients look for lash artists. Post your own work regularly, show short videos of the process, and make it easy to book (a clear bio, your location and your number)." },
      { title: "Local advertising", text: "Business cards and flyers in places your ideal client visits, a clear sign outside your studio, and your business on Google Maps so people searching nearby can find you." },
      { title: "Partnerships", text: "Work with businesses that serve the same clients but do not compete with you: hair salons, nail technicians, makeup artists, bridal planners and photographers. Recommend each other." },
      { title: "Referrals", text: "Happy clients telling their friends. It is the most trusted channel of all, and you can encourage it with a referral reward." },
    ] },
    { type: "callout", tone: "key", title: "Remember", text: "Every channel should point to one easy way to book: a WhatsApp number or a booking link." },

    { type: "heading", text: "Customer retention" },
    { type: "text", text: "**Customer Retention:** Strategies for building customer loyalty and repeat business." },
    { type: "text", text: "Finding a new client takes time and money. Keeping one is cheaper, and because lashes need refills every few weeks, a loyal client may visit you many times a year. That is why retention is not an extra: in a lash business, it *is* the business." },
    { type: "list", style: "checklist", items: [
      "**Great retention on the lashes themselves:** good preparation and clear aftercare, so her set still looks good at refill time.",
      "**Book the next refill before she leaves** your chair.",
      "**A reminder message** a day or two before her appointment.",
      "**A loyalty card or reward** for regular refills.",
      "**Keep a simple client record:** her lash map, lengths, curl, any reactions and her preferences, so every visit feels personal.",
      "**Ask for feedback**, and fix problems quickly and kindly.",
    ] },
    { type: "checkpoint", question: "What is one of the simplest ways to make sure a client comes back?", options: ["Book her next refill before she leaves", "Wait for her to remember", "Give her a different look every time"], answer: 0, explain: "Booking the next refill before she leaves, then sending a reminder, keeps your regular clients coming back." },
  ]
);

// ---------------------------------------------------------------------------
// Module 6: Running the business (Operational Plan)
// ---------------------------------------------------------------------------

const L12 = lesson(
  "Your Working Day",
  "Operational Plan, part 1: business hours, staffing and appointment scheduling.",
  [
    { type: "heading", text: "The Operational Plan" },
    { type: "text", text: "The sixth section of the plan, the **Operational Plan**, describes how the business actually runs day to day. It is where your plan meets your calendar." },

    { type: "heading", text: "Daily operations" },
    { type: "text", text: "**Daily Operations:** Business hours, number of employees, appointment scheduling." },
    { type: "text", text: "**Business hours.** Set hours that suit your ideal client (remember what your survey told you about the days and times she prefers) and that you can keep up week after week. Many lash clients work during the day, so evenings and weekends are often in demand. Write your hours down, publish them, and keep to them." },
    { type: "text", text: "**Number of employees.** As a solo business, the answer is probably *just you* for now. Write that down, and note when you might need help, for example when your diary is full for several weeks in a row. That is a long-term goal you can link back to your executive summary." },
    { type: "figure", url: M + "studio-space.webp", caption: "A calm, organised space makes the day run smoothly" },

    { type: "heading", text: "Appointment scheduling" },
    { type: "text", text: "Lashing is booked by appointment, so your diary is your stock: an empty hour cannot be sold later. Plan it carefully:" },
    { type: "list", style: "checklist", items: [
      "**Block the right time for each service.** Use the timings from your service menu, so a full set and a refill each get the time they need.",
      "**Leave a gap between clients** to clean and disinfect your station and set up fresh disposables.",
      "**Use one booking system:** a paper diary, a calendar app or a booking link, but only one, so you never double-book.",
      "**Ask for a deposit** to hold a booking, and have a clear policy for late arrivals and cancellations.",
      "**Send reminders** the day before.",
    ] },
    { type: "callout", tone: "tip", title: "Write your policies down", text: "Put your deposit, lateness and cancellation rules in writing (on your price list or in your booking message) so every client knows them before she books." },
    { type: "checkpoint", question: "Why should you leave a gap between appointments?", options: ["To take a nap", "To clean, disinfect and set up for the next client", "So the client waits longer"], answer: 1, explain: "The gap is for cleaning and disinfecting your station and setting up fresh disposables, so you never rush hygiene." },
  ]
);

const L13 = lesson(
  "Suppliers, Equipment & Your Space",
  "Operational Plan, part 2: choosing suppliers, listing your equipment and planning your workspace.",
  [
    { type: "heading", text: "Suppliers and equipment" },
    { type: "text", text: "**Suppliers and Equipment:** Vendors for your products and salon equipment." },
    { type: "text", text: "Your results depend on your products. Good lashes and fresh, reliable glue make the difference between a set that lasts and one that falls off in a week, so choose suppliers carefully." },
    { type: "list", style: "checklist", items: [
      "**Quality and safety:** products that are clearly labelled, with ingredients listed and a use-by date.",
      "**Reliability:** a supplier who has stock when you need it, so you never run out of glue mid-week.",
      "**Price:** compare a few suppliers, but do not trade safety for a lower price.",
      "**A backup supplier** in case your first choice runs out.",
    ] },
    { type: "text", text: "Then list your equipment in two groups: things you buy once, and things you use up and buy again." },
    { type: "compare", title: "Your equipment list", doLabel: "Buy once (equipment)", dontLabel: "Buy again (consumables)",
      do: ["Lash bed or comfortable chair", "Good lamp", "Tweezers", "Steriliser or disinfection tools", "Stool or trolley"],
      dont: ["Lashes and glue", "Primer, remover, cleanser", "Eye pads and tape", "Micro brushes and mascara wands", "Gloves, masks and other disposables"] },
    { type: "text", text: "This split matters for your money. Equipment is mostly a **startup expense**: you pay for it once, at the start. Consumables are an **ongoing cost** that goes up as you see more clients, and it is part of what each service costs you. You will use both lists in the Financial Plan." },

    { type: "heading", text: "Facility management" },
    { type: "text", text: "**Facility Management:** Renting or leasing a space, setup costs." },
    { type: "text", text: "Where will you work? The common options for a solo artist are:" },
    { type: "steps", items: [
      { title: "Home studio", text: "The lowest cost, but the room must be clean, private, well lit and kept only for clients while you work." },
      { title: "Renting a chair or room in a salon", text: "Shared costs and walk-in clients, but you work within the salon’s rules and hours." },
      { title: "Your own studio", text: "Full control of your space and brand, but the highest rent and setup costs." },
      { title: "Mobile service", text: "You go to the client. Low rent, but you carry your kit and must keep hygiene standards in every home." },
    ] },
    { type: "text", text: "Whichever you choose, write down the **setup costs** (deposit, first rent, painting, furniture, lighting, signage) and the **monthly costs** (rent, power, water, internet, cleaning). Read any rental agreement carefully before you sign it." },
    { type: "checkpoint", question: "Lashes, glue and eye pads are…", options: ["Equipment you buy once", "Consumables you use up and buy again", "Facility costs"], answer: 1, explain: "Lashes, glue and pads are consumables: they are used up with every client and form part of each service’s cost." },
  ]
);

const Q3 = quiz(
  "Quiz: Marketing & Operations",
  "Five questions on branding, marketing, retention and running your day.",
  [
    { q: "Which of these belong to your brand’s thematic visual elements?", options: ["Your brand colours and fonts", "Your rent", "Your supplier’s phone number"], answer: 0, explain: "Thematic visual elements are the colours, fonts and style you use consistently everywhere." },
    { q: "Working with a hair salon that sends you clients (and you send them clients) is an example of…", options: ["A partnership", "Local advertising", "A loyalty card"], answer: 0, explain: "Partnerships with businesses that serve the same clients without competing are a marketing channel." },
    { q: "Why is customer retention so important in a lash business?", options: ["Lashes need refills, so a loyal client returns many times a year", "Clients never come back anyway", "It replaces the need for hygiene"], answer: 0, explain: "Refills every few weeks mean one loyal client can visit many times a year." },
    { q: "What helps prevent double bookings?", options: ["Using one booking system only", "Keeping bookings in your head", "Taking bookings on three different apps"], answer: 0, explain: "One booking system, used every time, keeps your diary accurate." },
    { q: "A lash bed and a good lamp are examples of…", options: ["Equipment (a startup expense)", "Consumables", "Marketing channels"], answer: 0, explain: "Equipment is bought once and is mostly a startup expense." },
  ]
);

// ---------------------------------------------------------------------------
// Module 7: The numbers (Financial Plan)
// ---------------------------------------------------------------------------

const L14 = lesson(
  "What It Costs to Start",
  "Financial Plan, part 1: listing your startup expenses and the capital you need.",
  [
    { type: "heading", text: "The Financial Plan" },
    { type: "text", text: "The seventh section, the **Financial Plan**, is where everything you have planned turns into numbers. Many new business owners skip it because it feels hard. It is not, if you take it one step at a time, and it is the part that tells you whether your business will actually pay you." },
    { type: "figure", url: M + "startup-costs.webp", caption: "Every startup cost, written down in one place" },

    { type: "heading", text: "Startup expenses" },
    { type: "text", text: "**Startup Expenses:** Capital needed to start the business, including equipment, initial rental fees, marketing, and licensing." },
    { type: "text", text: "Startup expenses are everything you must pay for *before* your first paying client. Go back through your plan and pull out every cost:" },
    { type: "list", style: "checklist", items: [
      "**Equipment:** your “buy once” list from the Operational Plan.",
      "**Opening stock:** your first supply of consumables.",
      "**Initial rental fees:** deposit and first month’s rent, plus any setup of the space.",
      "**Marketing:** logo, business cards, flyers, a sign, your opening offer.",
      "**Licensing:** registration, permits and certificates (see the Legal section).",
      "**Training and practice:** any course you still need, and practice materials.",
      "**A safety cushion:** money to cover your monthly costs for the first few months, while your client list grows.",
    ] },
    { type: "text", text: "Add it all up. That total is the **capital** you need to start: the money you must have in hand, from savings, family, a loan or a partner. If the total is more than you have, go back to your plan and look for cheaper options, such as renting a chair instead of a studio, or starting with fewer services." },
    { type: "callout", tone: "mistake", title: "Do not forget the cushion", text: "Most new businesses do not fill their diary in the first week. Without money set aside for the first few months of rent and bills, a slow start can close a good business." },
    { type: "checkpoint", question: "Which of these is a startup expense?", options: ["Your first month’s rent and deposit", "The refill a client books next month", "A client’s tip"], answer: 0, explain: "Startup expenses are what you must pay before your first paying client: equipment, rent, marketing and licensing." },
  ]
);

const L15 = lesson(
  "Revenue & Break-even",
  "Financial Plan, part 2: forecasting your first year’s income and working out your break-even point.",
  [
    { type: "heading", text: "Revenue projections" },
    { type: "text", text: "**Revenue Projections:** Forecast for the first year based on market analysis." },
    { type: "text", text: "Revenue is all the money that comes in from clients, before any costs. A projection is your best, honest estimate of what that will be, month by month, for your first year. It is built from three things you have already worked out:" },
    { type: "list", style: "numbered", items: [
      "**Your prices** (from Services Offered).",
      "**How many clients** you expect each month (from your market research and your goals).",
      "**The mix of services:** how many full sets and how many refills.",
    ] },
    { type: "text", text: "Start low and grow. In month one you might see only a few clients; as your portfolio, reviews and refill clients build up, the numbers rise. Be realistic rather than hopeful: it is much better to beat a careful forecast than to miss an optimistic one." },

    { type: "heading", text: "Break-even analysis" },
    { type: "text", text: "**Break-even Analysis:** Calculation of how much you need to earn to cover your initial investment." },
    { type: "text", text: "Break-even is the point where the money coming in equals the money going out. Below it, you are losing money; above it, you are making a profit. There are two questions to answer:" },
    { type: "steps", items: [
      { title: "Monthly break-even", text: "How many services do I need each month to cover my monthly costs (rent, power, phone, transport and so on)?" },
      { title: "Paying back the start", text: "Once I am above monthly break-even, how many months of profit will it take to earn back my startup expenses?" },
    ] },
    { type: "text", text: "The calculation is simpler than it sounds. For each service, take the price and subtract the materials it uses. What is left is what that service **contributes** towards your monthly costs. Divide your monthly costs by that contribution, and you have the number of services you need." },
    { type: "figure", url: M + "break-even.webp", caption: "Break-even is one division on your phone’s calculator" },
    { type: "callout", tone: "note", title: "Practice example (made-up figures)", text: "These numbers are only for practice. Use your own prices and costs. Say a refill costs the client 2,000 and uses 300 in materials: each refill contributes 1,700. If your monthly costs are 17,000, you need 17,000 ÷ 1,700 = 10 refills a month to break even. Every refill after the tenth is profit." },
    { type: "text", text: "Now the startup expenses. In the same made-up example, say you spent 51,000 to start. If, after a few months, you are making 8,500 a month above break-even, it will take 51,000 ÷ 8,500 = 6 months to earn back what you put in." },
    { type: "checkpoint", question: "In the practice example, each refill contributes 1,700 and monthly costs are 17,000. How many refills a month do you need to break even?", options: ["5", "10", "17"], answer: 1, explain: "17,000 ÷ 1,700 = 10 refills. Every refill after the tenth is profit." },
  ]
);

const L16 = lesson(
  "Profit & Loss",
  "Financial Plan, part 3: reading and keeping a simple profit and loss statement.",
  [
    { type: "heading", text: "The profit and loss statement" },
    { type: "text", text: "**Profit and Loss Statement:** Expected revenue minus expected expenses." },
    { type: "text", text: "A profit and loss statement (often called a P&L) is a simple summary, usually for one month, of what came in and what went out. At its heart is one line of maths:" },
    { type: "quote", text: "Revenue − Expenses = Profit (or Loss)" },
    { type: "text", text: "If the answer is positive, the business made a profit that month. If it is negative, it made a loss. In your plan you write an **expected** P&L for your first months; once you are open, you keep a **real** one every month and compare the two." },

    { type: "heading", text: "What goes in it" },
    { type: "steps", items: [
      { title: "Revenue", text: "All the money from services and any products you sell, for the month." },
      { title: "Cost of services", text: "The consumables you used: lashes, glue, pads, tape and disposables." },
      { title: "Operating expenses", text: "Rent, power, water, internet, phone, transport, marketing, permits and any loan repayments." },
      { title: "Profit", text: "What is left after both kinds of costs. This is what pays you and grows the business." },
    ] },
    { type: "callout", tone: "key", title: "Pay yourself on purpose", text: "Decide how much of the profit you will take as your own pay, and how much you will keep in the business for new stock, equipment and slow months." },
    { type: "figure", url: M + "planning-desk.webp", caption: "Ten minutes at the end of each month keeps the numbers honest" },
    { type: "text", text: "To keep a real P&L you need records. Write down every payment you receive and every cost you pay, the same day, in a notebook, a spreadsheet or an app. If you take payment by M-Pesa, your business till statement is a ready-made record of revenue. At the end of each month, add up the columns, and compare the result with the forecast in your plan." },
    { type: "list", style: "dot", items: [
      "**Better than the plan?** Find out why and do more of it.",
      "**Worse than the plan?** Look line by line: fewer clients, higher costs, or prices too low? Then adjust.",
    ] },
    { type: "checkpoint", question: "A month brings in 40,000 and expenses are 28,000. What is the result?", options: ["A profit of 12,000", "A loss of 12,000", "A profit of 68,000"], answer: 0, explain: "Revenue minus expenses: 40,000 − 28,000 = a profit of 12,000." },
  ]
);

// ---------------------------------------------------------------------------
// Module 8: Legal & safety (Legal and Regulatory Issues)
// ---------------------------------------------------------------------------

const L17 = lesson(
  "Licences, Insurance & Health and Safety",
  "Legal and Regulatory Issues: the registrations, cover and hygiene standards a lash business needs.",
  [
    { type: "heading", text: "Doing it properly from day one" },
    { type: "text", text: "The last section of the plan, **Legal and Regulatory Issues**, protects you, your clients and your business. It is tempting to leave it for later, but working without the right papers can mean fines, a closed business, or no protection when something goes wrong." },
    { type: "figure", url: M + "signing-papers.webp", caption: "Read everything before you sign it" },

    { type: "heading", text: "Licensing and permits" },
    { type: "text", text: "**Licensing and Permits:** Necessary local and national registrations." },
    { type: "text", text: "The exact papers depend on where you work, and the rules change, so always confirm with your county government and the official websites before you open. In Kenya, a small beauty business will usually need to look at:" },
    { type: "list", style: "checklist", items: [
      "**Business registration:** registering your business name (or company) with the Business Registration Service, on eCitizen.",
      "**A KRA PIN** for tax.",
      "**A county business permit** for the place where you work.",
      "**Any public health licence or inspection** your county requires for beauty premises.",
    ] },
    { type: "callout", tone: "note", title: "Check locally", text: "This list is a starting point, not legal advice. Ask your county offices exactly which permits a lash or beauty business needs where you work, and add their costs to your startup expenses." },

    { type: "heading", text: "Insurance" },
    { type: "text", text: "**Insurance:** Professional liability, property, and health insurance." },
    { type: "steps", items: [
      { title: "Professional liability", text: "Covers you if a client claims your service harmed her, for example an allergic reaction. For anyone working near the eyes, this is the most important cover." },
      { title: "Property", text: "Covers your equipment and studio against theft, fire or damage." },
      { title: "Health", text: "Covers you. As a solo artist, if you cannot work, the business stops, so your own health cover matters." },
    ] },
    { type: "text", text: "Ask an insurance provider what cover they offer for beauty professionals, what it costs, and what it excludes, and add the premium to your monthly costs." },

    { type: "heading", text: "Health and safety compliance" },
    { type: "text", text: "**Health and Safety Compliance:** Adherence to local health department guidelines for beauty treatments and salon operation." },
    { type: "text", text: "This is where your lash training and your business plan meet. Write your hygiene routine into your plan, so it is a fixed part of how the business runs, not something you do when you have time:" },
    { type: "list", style: "checklist", items: [
      "Clean, disinfect or sterilise tools between every client, as you were trained.",
      "Fresh disposables (pads, tape, brushes) for every client.",
      "Clean hands, a clean station and clean linen.",
      "A client record and consultation for every client, including allergies and eye conditions, and a patch test where appropriate.",
      "Products stored safely, labelled, and thrown away after their use-by date.",
      "A clear plan for what to do if a client has a reaction.",
    ] },
    { type: "checkpoint", question: "For a lash artist, which insurance covers a claim that a service caused an allergic reaction?", options: ["Property insurance", "Professional liability insurance", "Health insurance"], answer: 1, explain: "Professional liability insurance covers claims that your service harmed a client." },
  ]
);

// ---------------------------------------------------------------------------
// Module 9: Your plan, ready
// ---------------------------------------------------------------------------

const L18 = lesson(
  "Your Business Plan Checklist",
  "A practical checklist for every part of your plan, and the first steps to opening your doors.",
  [
    { type: "heading", text: "Bringing it all together" },
    { type: "text", text: "You have now been through all eight parts of the Solo Business Startup Plan. Use this checklist to make sure your plan is complete. Work through it with your notebook open: tick each line only when you have actually written the answer down." },
    { type: "figure", url: M + "checklist.webp", caption: "Tick each line only when it is written down" },

    { type: "heading", text: "1. Executive Summary" },
    { type: "list", style: "checklist", items: [
      "My business name is chosen and checked (locally and on social media).",
      "I have decided where I will work.",
      "My mission statement is one or two sentences, with three or four core values.",
      "I have short-term and long-term goals, each with a number and a date.",
      "I can describe my services in one line.",
    ] },

    { type: "heading", text: "2. Business Description" },
    { type: "list", style: "checklist", items: [
      "I have chosen my business structure.",
      "I have described my ideal client: age, income, location, lifestyle, the look she wants.",
      "My USP fits in one sentence, and I can deliver it every time.",
    ] },

    { type: "heading", text: "3. Market Analysis" },
    { type: "list", style: "checklist", items: [
      "I know how many lash businesses are near me and what is in demand.",
      "I have studied 3 to 5 competitors: their prices, strengths and weaknesses.",
      "I have asked real potential clients what they want and what they pay.",
    ] },

    { type: "heading", text: "4. Services Offered" },
    { type: "list", style: "checklist", items: [
      "My service menu lists each service, what it includes and how long it takes.",
      "I only offer services I am trained to deliver safely.",
      "Each price covers its materials, a share of my monthly costs and my time.",
      "My opening offer has an end date and still covers my costs.",
    ] },

    { type: "heading", text: "5. Marketing and Sales Strategy" },
    { type: "list", style: "checklist", items: [
      "I have a logo, brand colours and fonts, and I use them consistently.",
      "My business cards are ready.",
      "I have chosen two or three marketing channels, all pointing to one easy way to book.",
      "I have a retention plan: next refill booked before the client leaves, reminders, a loyalty reward.",
    ] },

    { type: "heading", text: "6. Operational Plan" },
    { type: "list", style: "checklist", items: [
      "My business hours are set and published.",
      "I use one booking system, with time between clients for cleaning.",
      "My deposit, lateness and cancellation policies are written down.",
      "I have a main supplier and a backup supplier.",
      "My equipment and consumables lists are complete.",
      "My workspace is chosen, and I know its setup and monthly costs.",
    ] },

    { type: "heading", text: "7. Financial Plan" },
    { type: "list", style: "checklist", items: [
      "My startup expenses are listed and added up, including a safety cushion.",
      "I know where the startup capital will come from.",
      "I have a month-by-month revenue forecast for my first year.",
      "I know how many services a month I need to break even.",
      "I have a simple way to record every payment and cost, and I will do a P&L every month.",
      "Business money is kept separate from personal money.",
    ] },

    { type: "heading", text: "8. Legal and Regulatory Issues" },
    { type: "list", style: "checklist", items: [
      "I have confirmed with my county which registrations and permits I need, and added their costs.",
      "I have looked into professional liability, property and health insurance.",
      "My hygiene routine and client consultation are written into my plan.",
    ] },

    { type: "heading", text: "Your first steps" },
    { type: "text", text: "A plan is only useful when you act on it. Once your checklist is complete, these are the next steps, in order:" },
    { type: "steps", items: [
      { title: "Register and get your permits", text: "So you can open legally." },
      { title: "Set up your space and kit", text: "Using your equipment list and your startup budget." },
      { title: "Build your portfolio", text: "Photograph your best work, on models if you need to." },
      { title: "Launch your channels", text: "Profile, posts, business cards and your opening offer." },
      { title: "Open your diary", text: "Take bookings, record every sale and cost, and look after every client." },
      { title: "Review every month", text: "Compare your real numbers with your plan, and update the plan as you learn." },
    ] },
    { type: "callout", tone: "key", title: "Your plan is alive", text: "Your business will change as you grow, so your plan should too. Look at it again every few months, and especially before any big decision." },
    { type: "text", text: "When you are ready, take the final exam to earn your certificate. Congratulations on taking your business as seriously as your craft." },
  ]
);

// ---------------------------------------------------------------------------
// Final exam: goes into course_exams (migration 0028), not into lessons.
// Questions use the course_exams shape: { id, type: 'choice', q, options, answer, points }.
// ---------------------------------------------------------------------------

export const EXAM = {
  title: "Final exam",
  intro: "Ten questions across the whole business plan. Score 70% or more to pass and unlock your certificate.",
  pass_score: 70,
  auto_mark: true,
  questions: mix([
    { id: "q1", type: "choice", q: "What is the main purpose of a business startup plan?", options: ["To think the business through and write it down before spending money", "To impress your friends", "To replace your lash training"], answer: 0, points: 1 },
    { id: "q2", type: "choice", q: "Which section of the plan includes your business name, location, mission, goals and an overview of services?", options: ["Executive Summary", "Financial Plan", "Operational Plan"], answer: 0, points: 1 },
    { id: "q3", type: "choice", q: "Which business structure is usually the simplest for a solo lash artist starting out?", options: ["Sole proprietorship", "Limited company", "Partnership"], answer: 0, points: 1 },
    { id: "q4", type: "choice", q: "Which of these is the clearest target market?", options: ["Everyone", "Working women aged 25–40 near the town centre who want natural lashes", "People with eyes"], answer: 1, points: 1 },
    { id: "q5", type: "choice", q: "What is a competitor analysis looking for?", options: ["Local competitors’ strengths and weaknesses, and the gap you can fill", "Photos to copy", "Their bank details"], answer: 0, points: 1 },
    { id: "q6", type: "choice", q: "A price for a lash service must first…", options: ["Cover its materials, a share of monthly costs and your time", "Be the lowest in town", "Match your favourite influencer’s price"], answer: 0, points: 1 },
    { id: "q7", type: "choice", q: "Which is a customer retention strategy?", options: ["Booking the client’s next refill before she leaves", "Changing your brand colours every month", "Posting a competitor’s photos"], answer: 0, points: 1 },
    { id: "q8", type: "choice", q: "Which of these belongs in your startup expenses?", options: ["Equipment, initial rent, marketing and licensing", "Next year’s profit", "A client’s refill booking"], answer: 0, points: 1 },
    { id: "q9", type: "choice", q: "Each service contributes 1,500 after materials and your monthly costs are 15,000. How many services do you need each month to break even?", options: ["5", "10", "15"], answer: 1, points: 1 },
    { id: "q10", type: "choice", q: "A profit and loss statement shows…", options: ["Revenue minus expenses", "Only your expenses", "Your client list"], answer: 0, points: 1 },
  ]),
};

export const BUSINESS_STARTUP_PLAN = {
  slug: "business-startup-plan",
  title: "Solo Lash Business Startup Plan",
  subtitle: "Turn your lash skills into a business · Lashes by Shazz Academy",
  description:
    "Plan your lash business step by step: your name, mission and goals, your ideal client and what makes you different, your market and competitors, services and pricing, branding and marketing, daily operations, startup costs and break-even, and the licences and insurance you need.",
  about:
    "You have learned to lash; this course helps you turn that skill into a business that pays you.\n\n" +
    "Following the Lashes by Shazz Academy Solo Business Startup Plan, you will write your own business plan section by section: an executive summary with your name, location, mission and goals; a business description with your structure, target market and unique selling proposition; a market analysis of your industry, competitors and customers; your service menu, pricing and opening offers; your brand, marketing channels and customer retention; your daily operations, suppliers and space; your startup costs, revenue forecast, break-even point and profit and loss; and the licences, insurance and health and safety standards you need.\n\n" +
    "Each lesson ends with the questions to answer for your own business, and the course closes with a complete business plan checklist and a short final exam.",
  duration_label: "Self-paced",
  level: "beginner",
  category: "business",
  course_type: "story",
  reading_view: "article",
  hero_url: M + "cover.webp",
  is_free: true,
  price: 0,
  sequential: false,
  certificate_enabled: true,
  bonus_points: 0,
  sort_order: 3,
  learn_points: [
    "Write a clear executive summary, mission and goals for your lash business",
    "Know your ideal client, your competitors and what makes you different",
    "Price your services from your costs and the market",
    "Plan your marketing, retention and day-to-day operations",
    "Work out your startup costs, break-even point and monthly profit",
    "Cover your licences, insurance and health and safety",
  ],
  modules: [
    { title: "Start Here", lessons: [L1] },
    { title: "Who You Are", lessons: [L2, L3, L4, L5, Q1] },
    { title: "Know Your Market", lessons: [L6, L7] },
    { title: "Services & Pricing", lessons: [L8, L9, Q2] },
    { title: "Getting & Keeping Clients", lessons: [L10, L11] },
    { title: "Running the Business", lessons: [L12, L13, Q3] },
    { title: "The Numbers", lessons: [L14, L15, L16] },
    { title: "Legal & Safety", lessons: [L17] },
    { title: "Your Plan, Ready", lessons: [L18] },
  ],
};
