# Lazy loading pass: shop, courses, academy

Extract this zip over the repo root (paths match the repo). No SQL to run. `npm run build` passes.
Not yet exercised in a browser against the live database (the build sandbox has no Supabase access), so please
click through the checks at the bottom after deploying.

## Images
- Above-the-fold images load first: hero photo, product page main photo, course page cover, the first 4 products on /shop
  and the first 2 covers on /academy/courses are `eager` + `fetchpriority="high"`.
- Everything else is `loading="lazy" decoding="async"`: product gallery thumbnails, "goes together with" and
  "you may also like" thumbnails, product rails, kit cards, related courses, cart drawer lines, learn-page figures and
  shop items, profile course covers (were CSS backgrounds, which always download at once; now real lazy images).
- Story-mode lessons fetch pictures for the next 3 screens while the student reads, so figures don't pop in late.

## Courses
- Home-page Academy card: the course query and cover image are only requested when the visitor scrolls within about a
  screen of it (previously fetched on every home page load).
- Learn app: the Story, video player, quiz and Notes/Transcript/Shop panels are separate chunks, downloaded only when a
  lesson needs them (hls.js and the certificate PDF code were already on demand).
- While a lesson is open, the next lesson's content is fetched when the browser is idle, so "Next" is instant. Paywalled
  lessons are never prefetched, and nothing is prefetched when the device has Data Saver on.
- Build: every course's outline is now fetched in parallel instead of one course at a time.
- Course list: levels below the first use `content-visibility: auto`.

## Shop (built for hundreds of products)
- The hidden "Search results" copy of every product card is now inside a `<template>` and only cloned in when the page
  is opened with `?search=`, so the browser no longer builds a second full set of cards.
- Category sections from the third one down use `content-visibility: auto`, so layout and paint for far-off sections wait
  until they near the screen.

## Check after deploying
1. /shop: scroll the page; photos below the first rail should load as you scroll. Try `/shop?search=lash`.
2. /academy/courses: covers show; open a course, then a reading lesson in Story mode and move through a figure.
3. Open a video lesson and a quiz lesson (first load shows a short skeleton while the chunk downloads).
4. Profile page: course covers show in "My courses".
