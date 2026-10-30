// Customer Relations: Manage & Relate with Clients, built from the "How to Effectively Manage & Relate with Clients"
// customer relations manual (Lashes by Shazz, 24 pages). The trainer's own wording is kept, lightly edited so each idea
// leads into the next. The manual is written as short bullet lists, so the prose around them walks the student through
// each idea the same way as the other article-mode courses: ask the question, answer it plainly, give an example, then
// check understanding. The modules follow the ideas, not the manual's four chapters: expectations (what prevents a
// complaint) and complaints (what you do once one arrives) are split into their own parts.
//
// Article mode only: 0041 sets courses.reading_view = 'article' (see 0037 for how that switch works).
// Images: public/course-media/customer-relations/. cover.webp, happy-client.webp, video-call.webp,
// client-messages.webp and written-notes.webp come from the manual's photos; logo-footer.webp is the same Lashes by
// Shazz logo the Beginner Lashtech Guide uses. Every lesson ends with the small centred logo.
//
// Generate the Supabase seed with:
// node scripts/course-to-sql.mjs src/data/courses/customer-relations.js
// (0041_course_customer_relations.sql was written from this file; see the header of that file.)

const M = "/course-media/customer-relations/";

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
  "Why Customer Relations Matters",
  "Why the way you treat a client matters as much as the lashes you give them, and how this course is laid out.",
  [
    { type: "heading", text: "Skill brings them in. Relations keep them." },
    { type: "figure", url: M + "cover.webp", caption: "How you make a client feel stays with them" },
    { type: "quote", text: "How you make a client feel will always outlast how their lashes look.", by: "The Lash Whisperer" },
    { type: "text", text: "Customer relations is the foundation of a successful lash business. Think about it this way: a set of lashes lasts a few weeks, but the memory of how you treated someone lasts much longer. A client can forget the curl you chose. They rarely forget whether you listened to them, rushed them, or made them feel safe in your chair." },
    { type: "text", text: "That is why this whole course rests on one simple idea: **great lashing skills attract clients once. Great customer relations keep them for life.**" },

    { type: "heading", text: "What you will learn" },
    { type: "text", text: "This course is designed to train lash professionals to:" },
    { type: "list", style: "checklist", items: [
      "Communicate professionally",
      "Manage clients confidently",
      "Handle complaints and expectations",
      "Build long-term client loyalty",
      "Protect the brand while maintaining empathy",
    ] },
    { type: "text", text: "That last point is the thread that runs through everything. Empathy means caring about how the client feels. Protecting the brand means keeping your standards, your policies and your reputation intact. A professional does both at the same time, and you will see how in every part of this course." },

    { type: "heading", text: "How this course flows" },
    { type: "text", text: "The course is written to be read like a book, from top to bottom. Each part answers the question the part before it raises, so take it in order." },
    { type: "steps", items: [
      { title: "Understanding the lash client", text: "What clients are really buying, what motivates them, what they fear, and the kinds of client you will meet." },
      { title: "Professional communication", text: "How you speak, how you look while you speak, and how you write on WhatsApp, Instagram and calls." },
      { title: "Managing expectations", text: "Why most complaints start before the lashes go on, and the consultation that prevents them." },
      { title: "Complaints & difficult clients", text: "What to do when something goes wrong, and how to stay professional without tolerating disrespect." },
      { title: "Retention & loyalty", text: "Aftercare, follow-ups, rebooking, loyalty and reviews: how one visit becomes a regular client." },
      { title: "Final practical assessment", text: "Bringing it all together in your own written answers and a role-play, a client care checklist to keep, and a final exam." },
    ] },
    { type: "text", text: "Along the way you will find quick questions inside the lessons, real situations to think through, and a short quiz at the end of the bigger parts. They are there to help the ideas stick, not to trip you up." },
    { type: "callout", tone: "key", title: "Remember", text: "Customer relations is a skill, just like isolation or mapping. You get better at it by practising it on purpose, one client at a time." },
  ],
  { is_preview: true }
);

// ---------------------------------------------------------------------------
// Module 2: Understanding the lash client
// ---------------------------------------------------------------------------

const L2 = lesson(
  "What Your Client Is Really Buying",
  "A lash client is not just buying lashes. What they are really paying for, and the four motivations behind most bookings.",
  [
    { type: "heading", text: "Who is a lash client?" },
    { type: "text", text: "It is tempting to answer: someone who wants longer lashes. But **a lash client is not just buying lashes.** If lashes were all they wanted, they could buy a strip set at any beauty shop. When someone books you, they are paying for something bigger. They are buying:" },
    { type: "list", style: "dot", items: [
      "**Confidence:** to feel beautiful and look put together.",
      "**Convenience:** to skip mascara and strip lashes every morning.",
      "**Self-expression:** a look that says something about who they are.",
      "**Assurance that they are in safe hands:** someone is working millimetres from their eyes, and they need to trust that person.",
    ] },
    { type: "text", text: "Notice that only one of these is about how the lashes look. The other three are about how the client *feels*: before, during and after the appointment. That is where customer relations lives." },

    { type: "heading", text: "Why understanding the client matters" },
    { type: "text", text: "When you understand what someone is really buying, you can serve them better. Understanding the client helps you:" },
    { type: "list", style: "checklist", items: [
      "Communicate better",
      "Reduce complaints",
      "Increase retention",
      "Sell ethically",
    ] },
    { type: "text", text: "Selling ethically is worth a moment. It means recommending what genuinely suits the client, not what earns you the most. A client who is told honestly that a classic set suits their fine natural lashes better than a heavy volume set will trust every recommendation you make after that." },
    { type: "checkpoint", question: "Which of these is NOT one of the things a lash client is really buying?", options: ["Confidence", "Assurance that they are in safe hands", "The cheapest lashes in town", "Convenience"], answer: 2, explain: "Clients are buying confidence, convenience, self-expression and the assurance that they are in safe hands. Price matters to some clients, but it is not what the service is about." },

    { type: "heading", text: "What motivates a lash client?" },
    { type: "text", text: "Most lash clients are motivated by one or more of the following. Learn to listen for them in the first few minutes of a conversation, because each one points you to what this client cares about most." },
    { type: "steps", items: [
      { title: "Beauty & confidence", text: "They want to look good without effort." },
      { title: "Convenience", text: "They want to wake up ready." },
      { title: "Status & image", text: "Some clients want premium experiences and exclusivity." },
      { title: "Occasion-based needs", text: "Events, travel, weddings, birthdays." },
    ] },
    { type: "text", text: "Here is how that sounds in real life. A client who says *“I’m always late for work”* is telling you convenience matters, so talk about low-maintenance styles and aftercare that fits a busy morning. A client who says *“My wedding is in two weeks”* has an occasion-based need, so timing matters: when to book the set, and when to book a fill so the lashes look their fullest on the day." },
    { type: "checkpoint", question: "A client says, “I want something special for my sister’s wedding next month.” Which motivation are you hearing?", options: ["Convenience", "Occasion-based needs", "Status & image"], answer: 1, explain: "Events, travel, weddings and birthdays are occasion-based needs. Plan the timing of the set and any fill around the date." },
  ]
);

const L3 = lesson(
  "The Fears Clients Don’t Say Out Loud",
  "The five fears most lash clients carry into the appointment, and how to answer them before they become complaints.",
  [
    { type: "heading", text: "Common client fears" },
    { type: "figure", url: M + "lash-application.webp", caption: "A correct application never touches the skin" },
    { type: "text", text: "Clients may not always say this, but they fear:" },
    { type: "list", style: "dot", items: [
      "Pain during application",
      "Damage to natural lashes",
      "Poor results",
      "Wasting money",
      "Looking “overdone”",
    ] },
    { type: "text", text: "Why would a client keep a fear to themselves? Often because they don’t want to seem rude, or they don’t want to admit they are nervous. A fear that is never spoken is still in the room, though. If nobody answers it, it comes out later as a complaint: *“It was uncomfortable,” “My lashes look thin now,” “It wasn’t worth the money.”*" },
    { type: "callout", tone: "key", title: "Your role", text: "Your role is to address fears before they become complaints." },

    { type: "heading", text: "Answering a fear before it is asked" },
    { type: "text", text: "You don’t have to wait for the client to raise a fear. Bring it up yourself, calmly, during the consultation. That shows you have done this many times and you know what people worry about. Here is what each fear needs to hear:" },
    { type: "steps", items: [
      { title: "Pain", text: "Explain that the extensions are attached to the natural lash, not the skin, so a correct application should not hurt. Tell them to let you know straight away if anything stings." },
      { title: "Damage to natural lashes", text: "Explain that you choose a length and weight their own lashes can carry, one extension per natural lash for classic." },
      { title: "Poor results", text: "Show examples of your work in a similar style, so they can see what you are aiming for together." },
      { title: "Wasting money", text: "Be clear on the price, what it includes, how long the set lasts and when a fill is due. No surprises." },
      { title: "Looking overdone", text: "Agree on the look before you start, and offer a softer, more natural option if they are unsure." },
    ] },
    { type: "flip", prompt: "Tap the card", frontLabel: "The client thinks", front: "“What if these ruin my natural lashes?”", backLabel: "You say first", back: "“I’ll pick a length and weight your own lashes can carry comfortably, so they stay healthy.”" },
    { type: "text", text: "Notice that the answer on the card is reassuring *and* specific. Vague comfort like “don’t worry” does very little. A clear reason the client can understand does a lot." },
  ]
);

const L4 = lesson(
  "Five Kinds of Client, One Standard",
  "The five types of lash client you will meet, and how to adjust your approach to each without lowering your standard.",
  [
    { type: "heading", text: "Types of lash clients" },
    { type: "figure", url: M + "salon-front-desk.webp", caption: "Every client, every type, the same professionalism" },
    { type: "text", text: "Every client is an individual, but you will start to notice patterns. Most clients fall into one of five types. **Each requires a different communication approach, but the same professionalism.**" },
    { type: "text", text: "That sentence is the key to this lesson. You change *how* you talk to someone. You never change *the standard* of care, honesty and hygiene they receive." },

    { type: "heading", text: "1. First-time clients" },
    { type: "text", text: "Everything is new to them: the bed, the eye pads, keeping their eyes closed for a long time. They need more explanation and more reassurance. Walk them through what will happen before it happens, and check on their comfort during the service." },

    { type: "heading", text: "2. Loyal / returning clients" },
    { type: "text", text: "They already trust you, which is a gift, and it is easy to take it for granted. Keep the same care you gave them on day one. Remember their preferences and keep a note of their lash map, so they never have to explain themselves twice." },

    { type: "heading", text: "3. Price-sensitive clients" },
    { type: "text", text: "They care a lot about value. Be clear about what each service costs and what it includes, and explain the difference between options honestly. Never pressure them into a bigger set, and never apologise for your prices either. Value explained well is easier to accept than a discount." },

    { type: "heading", text: "4. High-end / premium clients" },
    { type: "text", text: "They expect an experience as well as a result: punctuality, a calm space, attention to detail and a sense of exclusivity. Small touches matter here, such as confirming appointments in good time and remembering what they liked last time." },

    { type: "heading", text: "5. Difficult or overly demanding clients" },
    { type: "text", text: "Some clients will push on time, price, or your boundaries. You will learn how to handle them properly in the part on difficult clients. For now, remember that they still receive the same professionalism. Staying calm and polite is not weakness; it is what keeps you in control." },

    { type: "compare", title: "What changes and what never changes", doLabel: "Adjust for each client", dontLabel: "Keep the same for everyone", do: [
      "How much you explain",
      "How much reassurance you give",
      "How you talk about price and options",
      "The little extras in the experience",
    ], dont: [
      "Honesty about what is achievable",
      "Hygiene and safety",
      "Politeness and respect",
      "Your policies",
    ] },
    { type: "checkpoint", question: "A premium client asks you to skip your patch-test policy because they are “a VIP”. What does “the same professionalism” mean here?", options: ["Skip it, because premium clients get special rules", "Keep the policy, and explain politely why it protects them", "Refuse to serve them"], answer: 1, explain: "You can adjust the experience for a premium client, but safety and policies stay the same for everyone. Explain the reason kindly." },
  ]
);

const L5 = lesson(
  "Scenario: The Quiet First-Timer",
  "A practical scenario: welcoming, reassuring and building trust with a nervous first-time client in the first five minutes.",
  [
    { type: "heading", text: "Practical scenario" },
    { type: "figure", url: M + "warm-welcome.webp", caption: "The first five minutes set the tone" },
    { type: "text", text: "A first-time client is quiet and hesitant during consultation. They answer questions briefly and seem unsure." },
    { type: "callout", tone: "note", title: "Your task", text: "Write or role-play how you would: **welcome them, reassure them, and build trust within the first 5 minutes.**" },
    { type: "text", text: "Take a moment to think about what you would do before you read on. Then compare your ideas with the example below. There is no single right script, but a strong answer covers all three parts of the task." },

    { type: "heading", text: "Why are they quiet?" },
    { type: "text", text: "Short answers from a first-timer rarely mean they are unfriendly. Usually it is nerves: they don’t know what to expect, and they are carrying some of the fears from the earlier lesson. So your job in the first five minutes is to replace uncertainty with information and warmth." },

    { type: "heading", text: "An example of the first five minutes" },
    { type: "steps", items: [
      { title: "Welcome them (minute 1)", text: "Greet them by name with a smile, offer them a seat and something to drink, and introduce yourself. “Hi Amina, welcome! I’m Wanjiru, I’ll be doing your lashes today.”" },
      { title: "Make it easy to talk (minutes 1–2)", text: "Ask open, gentle questions instead of yes/no ones. “What made you decide to try lashes?” “Is there a look you’ve seen and loved?”" },
      { title: "Reassure them (minutes 2–4)", text: "Explain what will happen: how long it takes, that their eyes stay closed, that it shouldn’t hurt, and that they can stop you at any time. Show a few examples of natural-looking sets." },
      { title: "Build trust (minutes 4–5)", text: "Recommend a style that suits them, explain why, and get their verbal confirmation before you begin. “So we’ll go for a soft, natural classic set. Does that feel right to you?”" },
    ] },
    { type: "text", text: "Look at what the example does. It welcomes, it informs, it lets the client choose, and it checks they agree. A nervous client who feels informed and in control will usually relax by the time the eye pads go on." },
    { type: "callout", tone: "mistake", title: "Common mistake", text: "Filling the silence with talk about yourself, or rushing to get started. A quiet client needs you to slow down and ask, not speed up." },
    { type: "callout", tone: "tip", title: "Practise this", text: "Write your own version of the first five minutes in your own words, then role-play it with a friend. You will use it again in the final practical assessment." },
  ]
);

const Q1 = quiz(
  "Quiz: Understanding the Lash Client",
  "Five questions on what clients buy, what they fear and how to approach each type. Score 70% to pass.",
  [
    { q: "A lash client is buying confidence, convenience, self-expression and…", options: ["The longest lashes possible", "Assurance that they are in safe hands", "A discount on their next visit"], answer: 1, explain: "Clients are also buying the assurance that they are in safe hands." },
    { q: "Which of these is an occasion-based need?", options: ["Wanting to wake up ready every day", "Wanting lashes for a wedding", "Wanting an exclusive premium experience"], answer: 1, explain: "Events, travel, weddings and birthdays are occasion-based needs." },
    { q: "When should you deal with a client’s fears?", options: ["Only if they complain", "Before they become complaints", "After the service is finished"], answer: 1, explain: "Your role is to address fears before they become complaints." },
    { q: "What does “a different approach, but the same professionalism” mean?", options: ["You change how you communicate, never the standard of care", "Premium clients get better hygiene", "Price-sensitive clients get shorter appointments"], answer: 0, explain: "Each type needs a different communication approach, but everyone receives the same honesty, safety and respect." },
    { q: "A first-timer is quiet and gives short answers. What is the best first move?", options: ["Start the service quickly so it’s over sooner", "Welcome them warmly and ask gentle, open questions", "Ask if something is wrong with them"], answer: 1, explain: "Quietness is usually nerves. A warm welcome and open questions help them relax and talk." },
  ]
);

// ---------------------------------------------------------------------------
// Module 3: Professional communication skills
// ---------------------------------------------------------------------------

const L6 = lesson(
  "Polite but Firm",
  "What professional communication really means: friendly without being overfamiliar, and setting boundaries without sounding rude.",
  [
    { type: "heading", text: "What is professional communication?" },
    { type: "figure", url: M + "video-call.webp", caption: "Every conversation represents your brand" },
    { type: "text", text: "Professional communication is not about sounding stiff or formal. It is about balance. Professional communication means:" },
    { type: "list", style: "checklist", items: [
      "Being polite but firm",
      "Being friendly but not overfamiliar",
      "Setting boundaries without sounding rude",
      "Representing the brand at all times",
    ] },
    { type: "text", text: "Each line pairs a warm quality with a strong one. Lean too far to the warm side and clients start to bend your rules, turn up late or expect free extras. Lean too far to the strong side and you come across as cold. The professional sits in the middle." },

    { type: "heading", text: "Friendly, not overfamiliar" },
    { type: "text", text: "Regular clients can start to feel like friends, and that is lovely. But in the salon you are still the professional. Overfamiliar habits include gossiping about other clients, sharing too much about your personal problems, or being so casual that the client forgets your policies apply to them too." },

    { type: "heading", text: "Setting a boundary without sounding rude" },
    { type: "text", text: "A boundary sounds rude when it is said with irritation, or with no reason. It sounds professional when it is calm, clear and kind. Compare these two ways of saying the same thing:" },
    { type: "compare", title: "Same boundary, two ways", doLabel: "Professional", dontLabel: "Rude", do: [
      "“I’m so sorry, we have a 15-minute grace period, so I won’t be able to do a full set today. Can I offer you a fill or another slot this week?”",
    ], dont: [
      "“You’re late, I can’t do you now.”",
    ] },
    { type: "text", text: "Both say no. Only one keeps the client. The professional version acknowledges the client, gives the reason (the policy) and offers a way forward." },
    { type: "callout", tone: "note", title: "Note", text: "Use your own salon’s policy wording and numbers in examples like this one. The 15 minutes here is only an example." },

    { type: "heading", text: "Representing the brand at all times" },
    { type: "text", text: "Every message, every greeting and every post is part of your brand, whether you work in a big salon or from home. Clients don’t separate *you* from *the business*. If you are rude on the phone, the business is rude." },
    { type: "checkpoint", question: "Which of these best describes professional communication?", options: ["Friendly but not overfamiliar, polite but firm", "Strict and formal with every client", "Relaxed and casual, like talking to a friend"], answer: 0, explain: "Professional communication balances warmth with firmness: friendly but not overfamiliar, polite but firm." },
  ]
);

const L7 = lesson(
  "What You Say and How You Look",
  "Verbal and non-verbal communication: speaking calmly, acknowledging concerns, and what your face and body say while you speak.",
  [
    { type: "heading", text: "Verbal communication" },
    { type: "text", text: "Verbal communication is the words you use and the way you say them. Key principles:" },
    { type: "list", style: "checklist", items: [
      "Speak clearly and calmly",
      "Avoid slang with clients",
      "Do not argue",
      "Acknowledge concerns before responding",
    ] },
    { type: "text", text: "The last principle is the one people forget most. When a client raises a concern, the natural reaction is to defend yourself straight away. But a person who feels unheard will not listen to your explanation. So acknowledge first, then respond." },
    { type: "compare", title: "Acknowledge before you respond", doLabel: "Say", dontLabel: "Not", do: ["“I understand your concern.”"], dont: ["“That has never happened before.”"] },
    { type: "text", text: "Why is the second one wrong, even if it is true? Because it tells the client their experience doesn’t count. It sounds like you are calling them a liar. “I understand your concern” opens the conversation; “that has never happened before” closes it." },
    { type: "flip", prompt: "Tap the card", frontLabel: "The client says", front: "“My lashes are already falling out!”", backLabel: "You start with", back: "“I understand your concern. Let’s have a look together and find out what’s happening.”" },

    { type: "heading", text: "Non-verbal communication" },
    { type: "text", text: "Even when you say all the right words, your body can say something else. Clients read:" },
    { type: "list", style: "dot", items: ["Your tone", "Your facial expressions", "Your body language"] },
    { type: "text", text: "Think about a client who mentions a problem and sees you sigh or roll your eyes. Whatever you say next, they have already heard the message: *you are a nuisance.* That is why your non-verbal communication needs as much care as your words." },
    { type: "text", text: "Always:" },
    { type: "list", style: "checklist", items: [
      "Maintain eye contact",
      "Avoid rushing",
      "Stay composed even under pressure",
    ] },
    { type: "text", text: "Avoiding rushing matters even on a busy day. Glancing at the clock, packing up while the client is still talking, or hurrying them out of the chair all tell them they are a job, not a person." },
    { type: "callout", tone: "tip", title: "Pro tip", text: "If you feel yourself getting tense, slow your breathing and lower your voice slightly. A calm voice calms the other person too." },
    { type: "checkpoint", question: "A client tells you their lashes feel uncomfortable. What should you do first?", options: ["Explain that you did everything correctly", "Acknowledge their concern, then look into it", "Tell them it has never happened before"], answer: 1, explain: "Acknowledge concerns before responding. “I understand your concern” opens the conversation." },
  ]
);

const L8 = lesson(
  "Messages, DMs and Calls",
  "Written communication on WhatsApp, Instagram and calls: polite, clear, short and brand-aligned.",
  [
    { type: "heading", text: "Written communication" },
    { type: "figure", url: M + "client-messages.webp", caption: "Your messages are often a client’s first impression" },
    { type: "text", text: "For many clients, the first contact with your business is not a face. It is a message on WhatsApp or Instagram, or a phone call. That first reply is your first impression, so it deserves the same care as a face-to-face greeting." },
    { type: "text", text: "Professional written communication should be:" },
    { type: "steps", items: [
      { title: "Polite", text: "Greet the client, use their name, and say please and thank you." },
      { title: "Clear", text: "One message, one purpose. Give the date, time, price and anything they need to bring or do." },
      { title: "Short", text: "Clients read on their phones. A few lines are easier to read and harder to misunderstand than a long paragraph." },
      { title: "Brand-aligned", text: "Sound like your business every time: the same tone, the same sign-off, the same standard." },
    ] },

    { type: "heading", text: "What to avoid" },
    { type: "list", style: "dot", items: [
      "**Emoji overload.** One friendly emoji can be warm. A row of them looks unprofessional.",
      "**Slang.** It can be misunderstood and doesn’t match a professional brand.",
      "**Voice notes, unless necessary.** Many clients can’t listen to them at work, and there is no written record of what was agreed.",
      "**Emotional responses.** Never reply while you are angry or hurt. Wait, calm down, then write.",
    ] },

    { type: "heading", text: "Before and after" },
    { type: "text", text: "Here is the same booking reply written two ways." },
    { type: "compare", title: "A booking reply", doLabel: "Professional", dontLabel: "Unprofessional", do: [
      "“Hi Achieng, thank you for reaching out! A classic full set is available on Saturday at 10am. Please come without mascara or eye make-up. Shall I book you in?”",
    ], dont: [
      "“heyy babe 😍😍🔥🔥 sat ok?? come early”",
    ] },
    { type: "text", text: "The professional reply is still friendly, but it is polite, clear, short and tells the client exactly what to expect. The other one leaves them guessing about the time, the service and the preparation." },
    { type: "callout", tone: "mistake", title: "Common mistake", text: "Replying to an angry message straight away. If a message upsets you, step away first. A calm reply an hour later is far better than an emotional one in a minute, and it stays on the client’s phone forever." },
    { type: "checkpoint", question: "Which of these should you avoid in written client communication?", options: ["Using the client’s name", "Voice notes, unless necessary", "Giving the date and time clearly"], answer: 1, explain: "Avoid emoji overload, slang, emotional responses, and voice notes unless they are necessary." },
  ]
);

const Q2 = quiz(
  "Quiz: Professional Communication",
  "Five questions on verbal, non-verbal and written communication. Score 70% to pass.",
  [
    { q: "Professional communication means being friendly but…", options: ["Not overfamiliar", "Always strict", "Never personal at all"], answer: 0, explain: "Professional communication means being friendly but not overfamiliar." },
    { q: "Which response is more professional when a client raises a concern?", options: ["“That has never happened before.”", "“I understand your concern.”", "“You must have done something wrong.”"], answer: 1, explain: "Acknowledge concerns before responding: “I understand your concern.”" },
    { q: "Clients read your tone, your facial expressions and…", options: ["Your price list", "Your body language", "Your social media followers"], answer: 1, explain: "Clients read your tone, your facial expressions and your body language." },
    { q: "Professional written communication should be polite, clear, brand-aligned and…", options: ["Short", "Full of emojis", "Sent as a voice note"], answer: 0, explain: "Written communication should be polite, clear, short and brand-aligned." },
    { q: "A client sends you a rude message. What is the professional thing to do?", options: ["Reply immediately while you remember how it felt", "Wait until you are calm, then reply politely", "Send a voice note to explain yourself"], answer: 1, explain: "Avoid emotional responses. Step away, calm down, then reply." },
  ]
);

// ---------------------------------------------------------------------------
// Module 4: Managing expectations
// ---------------------------------------------------------------------------

const L9 = lesson(
  "Where Complaints Really Start",
  "Why most lash complaints begin before the lashes go on, and the four things you should always explain.",
  [
    { type: "heading", text: "Why expectations matter" },
    { type: "figure", url: M + "artist-at-work.webp", caption: "Most complaints start before the first lash goes on" },
    { type: "text", text: "Here is a surprising truth about complaints: most of them are not caused by bad lashing. **Most lash complaints come from:**" },
    { type: "list", style: "dot", items: ["Poor consultation", "Assumptions", "Lack of clear communication"] },
    { type: "text", text: "In other words, the problem started *before* the first extension was placed. A client imagined one thing, the artist delivered another, and nobody checked that they were picturing the same result." },
    { type: "text", text: "Think of an assumption like this: the artist assumes “natural” means a soft classic set; the client assumed “natural” meant full and fluffy, because that is what their friend calls natural. Both were sure they agreed. The lashes were perfect, and the client still left unhappy." },
    { type: "callout", tone: "key", title: "Remember", text: "A client is disappointed when the result is different from what they expected, even if the work is excellent. Managing expectations means making sure what they expect is what you will deliver." },

    { type: "heading", text: "Four things to always explain" },
    { type: "text", text: "To close the gap between what the client imagines and what you deliver, always explain:" },
    { type: "steps", items: [
      { title: "What is achievable", text: "What you can create with this client’s natural lashes, eye shape and the time booked." },
      { title: "What is not", text: "Be honest when a look isn’t possible or safe for their lashes, and offer the closest option that is." },
      { title: "Maintenance expectations", text: "How to look after the lashes, and how often they will need a fill." },
      { title: "Retention factors", text: "What affects how long the lashes last, so the client isn’t surprised when some fall." },
    ] },
    { type: "text", text: "Retention factors deserve a closer look, because they cause the most misunderstandings. Natural lashes shed every day as part of their growth cycle, and each extension falls with the lash it is attached to. How long a set lasts also depends on things like oily skin, sleeping on the face, rubbing the eyes, steam and heat, and oil-based make-up or cleansers. When a client knows this in advance, a few lashes on the pillow is normal, not a disaster." },
    { type: "checkpoint", question: "Where do most lash complaints come from?", options: ["Poor consultation, assumptions and unclear communication", "Bad glue", "Clients who just like complaining"], answer: 0, explain: "Most complaints come from poor consultation, assumptions and a lack of clear communication, which is why the consultation matters so much." },
  ]
);

const L10 = lesson(
  "The Consultation That Prevents Complaints",
  "Consultation best practices, and the three promises you should never make.",
  [
    { type: "heading", text: "Consultation best practices" },
    { type: "figure", url: M + "lash-tray.webp", caption: "Show examples, so you both picture the same result" },
    { type: "text", text: "The consultation is your best tool for preventing complaints. It is where you discover what the client wants, explain what is possible, and agree on the result together. During consultation:" },
    { type: "steps", items: [
      { title: "Ask lifestyle questions", text: "Do they exercise, swim or use a sauna? Do they sleep on their face? Do they wear a lot of make-up? Their answers tell you about retention and the right style." },
      { title: "Explain lash suitability", text: "Look at their natural lashes and tell them honestly what they can carry: length, thickness and type of set." },
      { title: "Show examples", text: "Words like “natural” and “dramatic” mean different things to different people. A picture removes the guesswork." },
      { title: "Get verbal confirmation", text: "Before you start, sum up what you agreed and ask them to confirm it: “So we’re doing a natural classic set, mostly 10–11 mm. Happy with that?”" },
    ] },
    { type: "text", text: "Getting verbal confirmation might feel like a small step, but it protects both of you. The client knows exactly what is coming, and if there is a disagreement later, you can both remember what was agreed. Many artists also note the agreed style and lash map on the client’s record." },

    { type: "heading", text: "Three promises you should never make" },
    { type: "text", text: "When a client is excited or nervous, it is tempting to promise them anything. Don’t. **Never promise:**" },
    { type: "list", style: "dot", items: ["“These will last forever”", "“No shedding at all”", "“Exactly like the photo”"] },
    { type: "text", text: "Each of these sets you up to fail. Extensions fall with the natural lash, so they can’t last forever and some shedding is guaranteed. And a photo was taken on someone else’s lashes, eyes and lighting, so the result on your client will always be a little different." },
    { type: "flip", prompt: "Tap the card", frontLabel: "The client asks", front: "“Can you make them exactly like this photo?”", backLabel: "You say", back: "“I can do something very close, adjusted to suit your lashes and eye shape. Let me show you how.”" },
    { type: "text", text: "That answer is honest, and it still sounds positive. You are not saying no; you are telling the client what you *can* do, and that you will tailor it to them." },
    { type: "checkpoint", question: "Which of these is a promise you should never make?", options: ["“I’ll choose a length your lashes can carry.”", "“No shedding at all.”", "“You’ll need a fill in two to three weeks.”"], answer: 1, explain: "Never promise “no shedding at all”. Natural lashes shed every day, and extensions fall with them." },
  ]
);

// ---------------------------------------------------------------------------
// Module 5: Complaints & difficult clients
// ---------------------------------------------------------------------------

const L11 = lesson(
  "Handling Complaints Professionally",
  "The four things never to do, and four calm steps for handling any complaint: listen, acknowledge, investigate, refer to policy.",
  [
    { type: "heading", text: "Complaints will happen" },
    { type: "text", text: "Even with the best consultation, some clients will be unhappy. That doesn’t make you a bad artist. What matters is how you handle it, because a complaint handled well can actually *increase* a client’s trust in you." },

    { type: "heading", text: "What never to do" },
    { type: "text", text: "When you hear a complaint, never:" },
    { type: "list", style: "dot", items: ["Blame the client", "Get defensive", "Argue publicly", "Respond emotionally"] },
    { type: "text", text: "Arguing publicly includes the comments section of your Instagram, a group chat, or the salon floor in front of other clients. Even if you are right, everyone watching only remembers that you argued." },

    { type: "heading", text: "Four steps to handle a complaint" },
    { type: "steps", items: [
      { title: "Listen fully", text: "Let the client finish without interrupting, even if you disagree. People calm down once they feel heard." },
      { title: "Acknowledge feelings", text: "“I can see you’re really disappointed, and I understand why.” Acknowledging a feeling is not admitting fault." },
      { title: "Investigate calmly", text: "Ask questions and look at the lashes. When did it start? How have they been caring for them? What does the problem actually look like?" },
      { title: "Refer to policy", text: "Use your salon’s written policy on fixes, touch-ups and refunds, so the outcome is fair and the same for every client." },
    ] },
    { type: "callout", tone: "key", title: "Remember", text: "Offer solutions, not arguments." },
    { type: "text", text: "A solution might be a free touch-up within your policy period, a change of style or glue, a reminder of aftercare, or, where the policy allows it, a partial refund. The point is that the client leaves the conversation with a way forward, not with the feeling that they lost an argument." },
    { type: "callout", tone: "tip", title: "Pro tip", text: "If you don’t have written policies yet, write them now: lateness, cancellations, touch-ups and refunds. Share them when the client books, so nobody hears about a policy for the first time in the middle of a complaint." },
    { type: "checkpoint", question: "What is the correct order for handling a complaint?", options: ["Investigate, refer to policy, listen, acknowledge", "Listen fully, acknowledge feelings, investigate calmly, refer to policy", "Refer to policy, then listen if they are still upset"], answer: 1, explain: "Listen fully, acknowledge feelings, investigate calmly, then refer to policy. Offer solutions, not arguments." },
  ]
);

const L12 = lesson(
  "Difficult Clients and Your Boundaries",
  "Late, overly demanding, unfair-refund and disrespectful clients, and why professionalism does not mean tolerating disrespect.",
  [
    { type: "heading", text: "Difficult client types" },
    { type: "text", text: "Every lash artist meets difficult clients. Knowing the common types ahead of time means you can respond with a plan instead of a reaction. Examples:" },
    { type: "list", style: "dot", items: ["Late clients", "Overly demanding clients", "Clients who want refunds unfairly", "Clients who disrespect staff"] },

    { type: "heading", text: "Late clients" },
    { type: "text", text: "Lateness affects every client booked after them. Have a clear lateness policy, share it when they book, and apply it calmly and consistently. Offer what you *can* do in the time left, or a new slot." },

    { type: "heading", text: "Overly demanding clients" },
    { type: "text", text: "They may ask for more than the service includes, more than their natural lashes can safely carry, or for constant changes. Listen, explain what is achievable and safe, and stay kind but firm. You can say no to a request without saying no to the person." },

    { type: "heading", text: "Clients who want refunds unfairly" },
    { type: "text", text: "Sometimes a refund request has nothing to do with the work, for example when a client hasn’t followed aftercare. Use the complaint steps from the last lesson: listen, acknowledge, investigate, refer to policy. You will practise exactly this in the case study next." },

    { type: "heading", text: "Clients who disrespect staff" },
    { type: "text", text: "Insults, shouting, harassment or threats are not “difficult client” behaviour you simply absorb." },
    { type: "callout", tone: "key", title: "Remember", text: "Professionalism does not mean tolerating disrespect." },
    { type: "text", text: "You can stay calm and polite while setting a clear limit: “I want to help you, but I can’t continue while you’re speaking to me like this.” If the behaviour continues, it is professional to end the appointment or decline future bookings. Protecting yourself and your team is part of protecting the brand." },
    { type: "compare", title: "Professional or pushover?", doLabel: "Professional", dontLabel: "Pushover", do: [
      "Calmly applies the lateness policy",
      "Explains what is safe for the client’s lashes",
      "Sets a clear limit when someone is rude",
    ], dont: [
      "Lets every late client run over, and makes the next one wait",
      "Does an unsafe set because the client insisted",
      "Puts up with insults to avoid a bad review",
    ] },
    { type: "checkpoint", question: "A client starts shouting insults at your assistant. What is the professional response?", options: ["Stay silent and carry on to avoid a bad review", "Calmly set a clear limit, and end the service if it continues", "Shout back so they know they can’t do that"], answer: 1, explain: "Professionalism does not mean tolerating disrespect. Stay calm, set a clear limit, and end the service if the behaviour continues." },
  ]
);

const L13 = lesson(
  "Case Study: The Five-Day Refund",
  "A case study: a client says their lashes did not last and demands a refund after five days. How you investigate, respond and protect the brand.",
  [
    { type: "heading", text: "The case" },
    { type: "figure", url: M + "written-notes.webp", caption: "Write your answer before you read the example" },
    { type: "text", text: "A client claims their lashes did not last and demands a refund after 5 days." },
    { type: "callout", tone: "note", title: "Your task", text: "Explain: **how you investigate, how you respond, and how you protect the brand.**" },
    { type: "text", text: "Write down your own answer first. Then read the example below and see what you included, and what you could add." },

    { type: "heading", text: "1. How you investigate" },
    { type: "text", text: "Start by listening and acknowledging, as you learned in the complaint steps. Then gather the facts calmly, without accusing anyone:" },
    { type: "list", style: "checklist", items: [
      "Ask the client to come in, or to send clear, close-up photos of both eyes.",
      "Look at how many extensions are left, and where the gaps are.",
      "Check fallen lashes if they have any: an extension still attached to a natural lash with a small white bulb at the root means the natural lash shed, which is normal.",
      "Ask gently about aftercare: water or steam in the first 24–48 hours, oil-based products, rubbing, sleeping on the face.",
      "Check your own record: what style, glue and lengths you used, and whether anything was different that day.",
    ] },

    { type: "heading", text: "2. How you respond" },
    { type: "text", text: "Base your response on what you found and on your policy, not on how loudly the client is asking. For example:" },
    { type: "steps", items: [
      { title: "If the retention issue is on your side", text: "Own it and fix it: offer a free touch-up or redo within your policy period." },
      { title: "If it is normal shedding or aftercare", text: "Explain it kindly, remind them of the aftercare, and offer the remedy your policy allows, such as a discounted fill." },
      { title: "Either way", text: "Offer solutions, not arguments, and keep the conversation private, calm and polite." },
    ] },
    { type: "text", text: "Here is how the response might sound: *“Thank you for sending the photos, and I understand how disappointing this is. I can see some of the lashes have come away with your natural lashes, which happens as they shed. Our policy covers a free touch-up within 7 days, so I’d love to book you in and get them looking full again.”* (Use your own policy’s numbers.)" },
    { type: "text", text: "Notice that the reply doesn’t accuse the client, doesn’t argue, and doesn’t automatically hand over a refund. It acknowledges, explains and offers a fair solution." },

    { type: "heading", text: "3. How you protect the brand" },
    { type: "list", style: "dot", items: [
      "Follow your written policy, so every client is treated the same way.",
      "Keep the conversation in private messages, never in public comments.",
      "Keep records of the service, the aftercare you gave and the conversation.",
      "Stay calm and polite, even if the client posts a bad review. (More on reviews later.)",
    ] },
    { type: "callout", tone: "tip", title: "Pro tip", text: "Giving every client written aftercare at the end of the appointment is one of the best protections you have. Nobody can say they were never told." },
  ]
);

const Q3 = quiz(
  "Quiz: Expectations, Complaints & Difficult Clients",
  "Six questions on consultations, complaints and boundaries. Score 70% to pass.",
  [
    { q: "During a consultation, why should you get verbal confirmation?", options: ["So the client can’t ever complain", "So you both agree on the result before you start", "Because it is required by law"], answer: 1, explain: "Getting verbal confirmation makes sure the client and the artist are expecting the same result." },
    { q: "Which of these should you never promise a client?", options: ["“These will last forever”", "“I’ll check your comfort during the service”", "“We’ll agree on the style first”"], answer: 0, explain: "Never promise “these will last forever”, “no shedding at all” or “exactly like the photo”." },
    { q: "Which of these should you always explain to a client?", options: ["Your competitors’ prices", "Retention factors and maintenance expectations", "Your personal schedule"], answer: 1, explain: "Always explain what is achievable, what is not, maintenance expectations and retention factors." },
    { q: "When handling a complaint, you should never…", options: ["Listen fully", "Get defensive", "Refer to policy"], answer: 1, explain: "Never blame the client, get defensive, argue publicly or respond emotionally." },
    { q: "What does “offer solutions, not arguments” mean?", options: ["Always give a full refund", "Give the client a fair way forward instead of trying to win the debate", "Agree with everything the client says"], answer: 1, explain: "The aim is a fair way forward, based on what you found and on your policy." },
    { q: "Does professionalism mean you have to tolerate disrespect?", options: ["Yes, the client is always right", "No, you can set a clear limit calmly", "Only from premium clients"], answer: 1, explain: "Professionalism does not mean tolerating disrespect." },
  ]
);

// ---------------------------------------------------------------------------
// Module 6: Client retention & loyalty
// ---------------------------------------------------------------------------

const L14 = lesson(
  "Why Returning Clients Matter",
  "Why retention is the heart of a stable lash business.",
  [
    { type: "heading", text: "Why retention is important" },
    { type: "figure", url: M + "happy-client.webp", caption: "A happy client comes back, and brings friends" },
    { type: "text", text: "Lash extensions are a repeat service. A full set is only the beginning; the client needs a fill every few weeks to keep the look. So the real value of a client is not one appointment, it is all the appointments they could book with you over the years." },
    { type: "text", text: "**Returning clients:**" },
    { type: "steps", items: [
      { title: "Cost less to maintain", text: "You don’t have to spend on adverts or promotions to find them again. They already know where you are." },
      { title: "Refer others", text: "A happy regular client is your best advert. They tell their friends, sisters and colleagues." },
      { title: "Trust your recommendations", text: "When they trust you, they are open to trying a new style, a better aftercare product or an upgrade." },
      { title: "Increase business stability", text: "A full book of regular fills means steady income, even in a slow month." },
    ] },
    { type: "text", text: "Here is a simple way to picture it. Ten new clients who never come back give you ten appointments. Ten clients who come back for a fill every three weeks for a year give you well over a hundred, and many of them bring a friend along the way." },
    { type: "checkpoint", question: "Which of these is a reason returning clients are good for your business?", options: ["They never need aftercare", "They refer others and trust your recommendations", "They always pay more"], answer: 1, explain: "Returning clients cost less to maintain, refer others, trust your recommendations and increase business stability." },
  ]
);

const L15 = lesson(
  "Aftercare and the Follow-Up",
  "Educating clients on aftercare, sending follow-ups, encouraging rebooking, and writing your 24-hour follow-up message.",
  [
    { type: "heading", text: "Aftercare & follow-ups" },
    { type: "figure", url: M + "reading-message.webp", caption: "A kind follow-up shows you care" },
    { type: "text", text: "The appointment ends when the client leaves your chair, but your relationship with them doesn’t. What happens next decides whether they come back. Always:" },
    { type: "list", style: "checklist", items: ["Educate clients on aftercare", "Send follow-up messages", "Encourage rebooking"] },
    { type: "text", text: "Aftercare education protects the lashes, and it protects you. A client who knows how to look after their set gets better retention, and better retention means fewer complaints. Explain it out loud before they leave, and send it in writing too, so they can check it at home." },
    { type: "callout", tone: "key", title: "Remember", text: "Follow-ups show care, not desperation." },
    { type: "text", text: "Some artists worry that a follow-up message looks needy. It doesn’t, as long as it is about the client, not about you. Asking “How are your lashes feeling?” shows that you care about the result. Spamming them with offers is what feels desperate." },

    { type: "heading", text: "Practical task" },
    { type: "figure", url: M + "written-notes.webp", caption: "Write your follow-up message" },
    { type: "callout", tone: "note", title: "Your task", text: "Write a simple follow-up message to send **24 hours after a client appointment.**" },
    { type: "text", text: "Before you look at the example, write your own. Use everything you learned about written communication: polite, clear, short and brand-aligned." },
    { type: "heading", text: "What a good follow-up includes" },
    { type: "steps", items: [
      { title: "A warm greeting", text: "Use their name and thank them for coming in." },
      { title: "A check-in", text: "Ask how their lashes are feeling." },
      { title: "One aftercare reminder", text: "Just the most important one, not the whole list again." },
      { title: "An open door", text: "Invite them to reach out with any questions." },
      { title: "A gentle rebooking prompt", text: "Remind them when their fill is due." },
    ] },
    { type: "text", text: "**Example:** *“Hi Njeri, thank you for visiting us yesterday! 💕 How are your new lashes feeling? Just a reminder to keep them dry and avoid oil-based products for the first 24–48 hours, and brush them gently each morning. If you have any questions, I’m here. Your fill will be due in about 2–3 weeks, so let me know when suits you. Lashes by Shazz.”*" },
    { type: "text", text: "Count the parts: greeting, check-in, one aftercare reminder, open door, rebooking prompt and the brand sign-off. One emoji keeps it warm without overloading it." },
    { type: "checkpoint", question: "What is the main purpose of a 24-hour follow-up message?", options: ["To sell more products", "To show care, check the client is happy and encourage rebooking", "To remind the client how much they paid"], answer: 1, explain: "Follow-ups show care, not desperation: check in, remind them of aftercare and open the door to rebooking." },
  ]
);

const L16 = lesson(
  "Rebooking, Loyalty and Referrals",
  "Loyalty and rebooking strategies that feel rewarding, not forced.",
  [
    { type: "heading", text: "Loyalty & rebooking strategies" },
    { type: "figure", url: M + "checkout-rebooking.webp", caption: "Rebook before the client leaves" },
    { type: "text", text: "Once a client is happy, a few simple systems make it easy for them to keep coming back. Examples:" },
    { type: "steps", items: [
      { title: "Rebooking before checkout", text: "Book the next fill before the client leaves, while they are still admiring their lashes in the mirror. “Your fill will be due in about three weeks. Shall we book it now?”" },
      { title: "Loyalty cards", text: "A stamp or digital card that rewards regular visits, for example a discounted fill after a set number of appointments." },
      { title: "Referral discounts", text: "A small reward for the client, and for the friend they bring, when someone new books on their recommendation." },
      { title: "VIP client lists", text: "Your most loyal clients get first pick of new slots, early access to offers or a small treat on their birthday." },
    ] },
    { type: "callout", tone: "key", title: "Remember", text: "Retention should feel rewarding, not forced." },
    { type: "text", text: "What does “forced” look like? Pressuring a client to rebook when they are unsure, making them feel guilty for trying another salon, or hiding conditions in the small print of a loyalty card. Clients can feel that pressure, and it pushes them away. A good loyalty system feels like a thank-you." },
    { type: "compare", title: "Rewarding or forced?", doLabel: "Rewarding", dontLabel: "Forced", do: [
      "“Would you like me to save your fill slot now?”",
      "A free refresh after your fifth visit",
      "A thank-you discount when your friend books",
    ], dont: [
      "“You have to book now or you’ll lose your spot forever.”",
      "Rewards with hidden conditions",
      "Making the client feel guilty for not rebooking",
    ] },
    { type: "checkpoint", question: "When is the best moment to encourage a client to rebook?", options: ["Before they leave, at checkout", "A month after their fill was due", "Only if they ask"], answer: 0, explain: "Rebooking before checkout is one of the easiest and most effective retention habits." },
  ]
);

const L17 = lesson(
  "Reviews and Your Reputation",
  "How to encourage reviews, and how to respond when feedback is not what you hoped.",
  [
    { type: "heading", text: "Reviews & referrals" },
    { type: "figure", url: M + "happy-review.webp", caption: "A happy client’s review is your best advert" },
    { type: "text", text: "Before booking a new artist, most clients look at reviews and photos online. A good review from a real client does more for your business than any advert you could pay for." },
    { type: "text", text: "**Encourage reviews by:**" },
    { type: "steps", items: [
      { title: "Delivering great service", text: "The best way to get good reviews is to deserve them. Everything in this course leads here." },
      { title: "Asking politely", text: "Many happy clients simply don’t think of leaving a review. A gentle “If you loved your lashes, a review would mean a lot to us” is enough." },
      { title: "Making it easy", text: "Send a direct link to your Google or Instagram page in your follow-up message, so leaving a review takes seconds." },
    ] },

    { type: "heading", text: "When the feedback isn’t good" },
    { type: "text", text: "Sooner or later, someone will leave a review you don’t like. How you react is public, and future clients will read your reply as closely as the review itself. **Never:**" },
    { type: "list", style: "dot", items: ["Argue with reviews", "Ignore feedback", "Respond emotionally"] },
    { type: "text", text: "Instead, reply briefly and politely, thank them for the feedback, and invite them to continue the conversation privately so you can put things right. For example: *“Thank you for your feedback, and I’m sorry your experience wasn’t what you hoped. I’d love to make this right. Please send us a message so we can arrange a time.”*" },
    { type: "text", text: "Then take the feedback seriously. Even an unfair review sometimes contains a useful point, such as a booking process that is confusing, or aftercare that wasn’t explained clearly enough." },
    { type: "flip", prompt: "Tap the card", frontLabel: "A review says", front: "“My lashes didn’t last at all. Disappointed.”", backLabel: "You reply", back: "“Thank you for telling us, and I’m sorry. Please message us so we can look at them and make it right.”" },
    { type: "checkpoint", question: "A client leaves a negative review you think is unfair. What should you do?", options: ["Reply explaining why they are wrong", "Ignore it completely", "Reply politely and invite them to talk privately"], answer: 2, explain: "Never argue with reviews, ignore feedback or respond emotionally. A calm, polite reply shows future clients how you treat people." },
  ]
);

// ---------------------------------------------------------------------------
// Module 7: Final practical assessment
// ---------------------------------------------------------------------------

const L18 = lesson(
  "Your Final Practical Assessment",
  "What the practical assessment asks of you, and the four criteria your trainer uses to certify you.",
  [
    { type: "heading", text: "Final practical assessment" },
    { type: "text", text: "Customer relations is something you *do*, not only something you know. That is why this course ends with a practical assessment as well as a quiz." },
    { type: "text", text: "**Assessment requirements:**" },
    { type: "steps", items: [
      { title: "Written responses to all scenarios", text: "Your answers to the quiet first-timer scenario, the five-day refund case study and the 24-hour follow-up message." },
      { title: "One video role-play", text: "Showing a consultation, your communication during the service, and closing the service professionally." },
    ] },
    { type: "text", text: "Closing the service professionally means the last few minutes of the appointment: showing the client their lashes, checking they are happy, explaining aftercare, rebooking their fill and saying goodbye warmly. It is the last impression they take home." },
    { type: "callout", tone: "note", title: "Note", text: "Your trainer will tell you how to submit your written responses and your role-play video." },

    { type: "heading", text: "Certification criteria" },
    { type: "text", text: "Your trainer will look for four things in everything you submit:" },
    { type: "list", style: "checklist", items: ["Professional tone", "Clear communication", "Confidence", "Brand alignment"] },
    { type: "text", text: "Use this list to check your own work before you submit it. Read your written answers out loud: do they sound polite, clear and confident? Would they fit the way your brand speaks to clients? Watch your role-play back: do you keep eye contact, avoid rushing and stay composed?" },
    { type: "callout", tone: "tip", title: "Pro tip", text: "Record your role-play more than once. Most people relax and sound far more natural by the second or third take." },
    { type: "checkpoint", question: "Which of these is one of the certification criteria?", options: ["Brand alignment", "The number of clients you have", "How fast you finish the role-play"], answer: 0, explain: "The certification criteria are professional tone, clear communication, confidence and brand alignment." },
  ]
);

const L19 = lesson(
  "Conclusion and Next Steps",
  "Everything you have learned, in one place, before the checklist and final exam.",
  [
    { type: "heading", text: "Customer relations is not optional" },
    { type: "text", text: "**Customer relations is not optional. It is a skill that separates average lash artists from successful business owners.** Two artists can give equally beautiful sets; the one who listens, explains, follows up and handles problems with grace is the one whose book stays full." },
    { type: "text", text: "Mastering customer relations means:" },
    { type: "list", style: "checklist", items: ["Fewer complaints", "Higher income", "Stronger brand reputation", "Long-term success"] },

    { type: "heading", text: "Look how far you’ve come" },
    { type: "list", style: "checklist", items: [
      "I understand what my clients are really buying, and what they fear",
      "I adjust my approach to each type of client, with the same professionalism",
      "I speak, look and write like a professional",
      "I run a consultation that prevents complaints",
      "I handle complaints and difficult clients calmly, with policies behind me",
      "I keep clients coming back with aftercare, follow-ups, loyalty and reviews",
    ] },
    { type: "text", text: "Start using one idea from this course with your very next client. Perhaps a better welcome, a clearer consultation, or a 24-hour follow-up message. Small habits, repeated with every client, are what build a brand people trust." },
    { type: "quote", text: "How you make a client feel will always outlast how their lashes look.", by: "The Lash Whisperer" },
    { type: "callout", tone: "key", title: "Next", text: "Work through the Client Care Checklist in the next lesson, then take the final exam to complete the course and earn your certificate." },
  ]
);

const L20 = lesson(
  "Your Client Care Checklist",
  "A practical checklist to keep for every appointment: before, during and after the service, and when something goes wrong.",
  [
    { type: "heading", text: "Put it into practice" },
    { type: "text", text: "Knowing these ideas is the first step. Using them with every client, every time, is what builds a brand. This checklist pulls the whole course into one page you can come back to. Read through it now, then use it for your next few appointments until it becomes habit." },

    { type: "heading", text: "Before the appointment" },
    { type: "list", style: "checklist", items: [
      "I reply to booking messages politely, clearly and briefly, with the date, time, price and how to prepare",
      "My policies (lateness, cancellations, touch-ups, refunds) are written down and shared when the client books",
      "I confirm the appointment in good time",
      "My station is clean and ready, so the client isn’t kept waiting",
    ] },

    { type: "heading", text: "The consultation" },
    { type: "list", style: "checklist", items: [
      "I greet the client by name, with a smile and eye contact",
      "I ask open, lifestyle questions and listen to the answers",
      "I answer the common fears before they are asked: pain, damage, results, money, looking overdone",
      "I explain what is achievable, what is not, maintenance and retention factors",
      "I show examples, and never promise “forever”, “no shedding” or “exactly like the photo”",
      "I get verbal confirmation of the agreed look, and note it on the client’s record",
    ] },

    { type: "heading", text: "During the service" },
    { type: "list", style: "checklist", items: [
      "I check on the client’s comfort, especially a first-timer",
      "I speak calmly and clearly, without slang, and I don’t rush",
      "I stay friendly but not overfamiliar, with the same standard for every type of client",
    ] },

    { type: "heading", text: "Closing the service" },
    { type: "list", style: "checklist", items: [
      "I show the client their lashes and check they are happy",
      "I explain aftercare out loud and give it to them in writing",
      "I offer to book their fill before they leave",
      "I mention loyalty or referral rewards, without pressure",
      "I say goodbye warmly",
    ] },

    { type: "heading", text: "After the appointment" },
    { type: "list", style: "checklist", items: [
      "I send a short follow-up message about 24 hours later",
      "I make it easy to leave a review, and ask politely",
      "I reply to every review calmly and politely, good or bad",
    ] },

    { type: "heading", text: "When something goes wrong" },
    { type: "list", style: "checklist", items: [
      "I listen fully and acknowledge the client’s feelings",
      "I investigate calmly: photos, aftercare, my own records",
      "I refer to my policy and offer a solution, not an argument",
      "I keep the conversation private and never respond emotionally",
      "I set a calm, clear limit if anyone is disrespectful",
    ] },
    { type: "callout", tone: "tip", title: "Pro tip", text: "Screenshot or print this lesson and keep it at your station. Tick through it for your next ten clients, and notice which habits you already have and which need practice." },
    { type: "callout", tone: "key", title: "Final step", text: "When you are ready, take the final exam to complete the course and earn your certificate, then submit your practical assessment to your trainer." },
  ]
);

// The final exam (course_exams, migration 0028): it opens once every lesson is done, is marked automatically, and a
// pass is needed for the certificate. Question ids are fixed so re-running 0041 keeps saved attempts readable.
const FINAL_QS = [
    { q: "Great lashing skills attract clients once. What keeps them for life?", options: ["Low prices", "Great customer relations", "Longer lashes"], answer: 1, explain: "Great lashing skills attract clients once. Great customer relations keep them for life." },
    { q: "Which of these is a common client fear?", options: ["Looking “overdone”", "Getting a loyalty card", "Receiving a follow-up message"], answer: 0, explain: "Clients fear pain, damage to natural lashes, poor results, wasting money and looking “overdone”." },
    { q: "Setting a boundary professionally means…", options: ["Saying no calmly, giving the reason and offering a way forward", "Never saying no to a client", "Telling the client off"], answer: 0, explain: "Boundaries sound professional when they are calm, clear and kind, with the reason and a way forward." },
    { q: "Which should you avoid in written messages to clients?", options: ["Using their name", "Emoji overload and slang", "Clear dates and times"], answer: 1, explain: "Avoid emoji overload, slang, unnecessary voice notes and emotional responses." },
    { q: "Most lash complaints come from…", options: ["Poor consultation, assumptions and unclear communication", "Clients with short lashes", "Bad weather"], answer: 0, explain: "Most complaints come from poor consultation, assumptions and a lack of clear communication." },
    { q: "Why should you never promise “exactly like the photo”?", options: ["Because photos are always edited", "Because the result depends on the client’s own lashes and eye shape", "Because clients never bring photos"], answer: 1, explain: "A photo was taken on someone else’s lashes and eyes, so your result will always be tailored and a little different." },
    { q: "What is the first step in handling a complaint?", options: ["Refer to policy", "Listen fully", "Offer a refund"], answer: 1, explain: "Listen fully, acknowledge feelings, investigate calmly, then refer to policy." },
    { q: "A client demands a refund five days after their set. What should you do first?", options: ["Refund immediately to avoid a bad review", "Refuse and block them", "Listen, acknowledge, and investigate calmly"], answer: 2, explain: "Investigate calmly (photos, aftercare, your records) and then respond according to your policy." },
    { q: "Follow-up messages show…", options: ["Desperation", "Care", "That you need more clients"], answer: 1, explain: "Follow-ups show care, not desperation." },
    { q: "What should you never do with a review?", options: ["Thank the client", "Argue with it", "Make leaving one easy"], answer: 1, explain: "Never argue with reviews, ignore feedback or respond emotionally." },
];

export const CUSTOMER_RELATIONS = {
  slug: "customer-relations",
  title: "Customer Relations: Manage & Relate with Clients",
  subtitle: "Lash business skills · From the Lashes by Shazz customer relations manual",
  description:
    "Learn to communicate professionally, manage expectations, handle complaints and difficult clients, and turn first-time clients into loyal regulars.",
  about:
    "Customer relations is the foundation of a successful lash business. Great lashing skills attract clients once. Great customer relations keep them for life.\n\n" +
    "You will learn what lash clients are really buying, what motivates them and what they fear, and how to approach first-time, loyal, price-sensitive, premium and difficult clients. You will practise professional verbal, non-verbal and written communication, run a consultation that prevents complaints, handle complaints and difficult clients calmly, and keep clients coming back with aftercare, follow-ups, loyalty strategies and reviews.\n\n" +
    "The course is written to be read like a book, with real scenarios, quick questions inside each lesson and a quiz after each part, and it ends with a client care checklist, a practical assessment and a final exam. Adapted from the Lashes by Shazz customer relations manual.",
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
  sort_order: 30,
  learn_points: [
    "Understand what lash clients really buy, want and fear",
    "Communicate professionally in person, in writing and on calls",
    "Prevent complaints with a clear consultation, and handle the rest calmly",
    "Build loyalty with aftercare, follow-ups, rebooking and reviews",
  ],
  modules: [
    { title: "Start Here", lessons: [L1] },
    { title: "Understanding the Lash Client", lessons: [L2, L3, L4, L5, Q1] },
    { title: "Professional Communication", lessons: [L6, L7, L8, Q2] },
    { title: "Managing Expectations", lessons: [L9, L10] },
    { title: "Complaints & Difficult Clients", lessons: [L11, L12, L13, Q3] },
    { title: "Client Retention & Loyalty", lessons: [L14, L15, L16, L17] },
    { title: "Final Practical Assessment", lessons: [L18, L19, L20] },
  ],
  exam: {
    enabled: true,
    title: "Final exam",
    intro: "Ten questions across the whole course. Score 70% or more to pass and earn your certificate.",
    pass_score: 70,
    auto_mark: true,
    questions: FINAL_QS.map((x, i) => ({ id: `cr-final-${i + 1}`, type: "choice", q: x.q, options: x.options, answer: x.answer, points: 1 })),
  },
};
