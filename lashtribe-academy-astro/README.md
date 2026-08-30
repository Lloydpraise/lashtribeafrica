# Lashtribe Academy — Astro Site

A straight port of the original single-page HTML scaffold
(`lashtribe-academy-scaffold_1_.html`) into an Astro project, in the same
spirit as the `lashtribe-astro` (shop) port: same CSS, same markup, same
JavaScript — just split into components so it's easier to maintain.

This scaffold is a mock "logged-in app" experience: sign in / create
account → dashboard (with a populated and an empty first-time state) →
course player with a step-by-step curriculum, all toggled by JS
show/hide rather than real page routing. That behavior is preserved
exactly.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Structure

```
src/
  layouts/
    Layout.astro              <head>, Google Fonts, imports global.css
  styles/
    global.css                 All original CSS unchanged
  components/
    OverlayToast.astro         Shared #overlay + toast notification
    AuthView.astro             Sign In / Create Account card (#viewAuth)
    AppShell.astro              Wraps header + dashboard + player (#appShell)
    AppHeader.astro             Logged-in header: cart badge, account menu
    DashboardView.astro         #viewDashboard — wraps both dashboard states
    DashboardPopulated.astro    Returning-user state: stats, "continue
                                 learning" hero, next module, course grids
    DashboardEmpty.astro        First-time-user state: welcome hero +
                                 "Start Here" course grid
    NextModuleCard.astro        Locked "up next" module preview card
    CourseCard.astro            Reusable free/"Included" course card
    AdvancedCourseCard.astro    Reusable paid course card (with Buy button)
    Player.astro                Course player: video box, scrub bar,
                                 transcript, certificate reward, curriculum
                                 sidebar (#viewPlayer)
    ProductStrip.astro          "Products Used In This Course" strip
    CourseCheckoutModal.astro   Course purchase modal (#checkoutModal)
  pages/
    index.astro                 Assembles everything + loads the script
public/
  scripts/
    main.js                     All original vanilla JS — auth tab
                                 switching, mock sign-in, view switching,
                                 curriculum/progress logic, confetti,
                                 course purchase flow, shared cart badge
                                 (synced with the shop via localStorage) —
                                 logic untouched, just lifted out of the
                                 inline <script> tag
```

## Notes on the port

- **CSS and JS logic are unchanged.** `global.css` and `public/scripts/main.js`
  are the original `<style>`/`<script>` blocks verbatim. Every element ID
  and class the script depends on (`#viewAuth`, `#appShell`,
  `#dashboardPopulated`, `#dashboardEmpty`, `#viewPlayer`, `#currList`,
  `.course-buy`, `.auth-tab`, `[data-open-player]`, `[data-switch]`, etc.)
  was checked against the built output — every reference resolves.
- **Two advanced-course grids share the same two courses** (Lash Business
  Bootcamp, Russian Volume Pro) but with distinct `data-course-id`s
  (`bootcamp`/`russian` in the populated dashboard, `bootcamp2`/`russian2`
  in the empty one) — that's from the original markup, kept as-is so a
  purchase in one state doesn't visually affect the other's card.
- **Course/product data** was pulled into small arrays inside
  `DashboardPopulated.astro`, `DashboardEmpty.astro`, and
  `ProductStrip.astro`, then passed into the reusable `CourseCard` /
  `AdvancedCourseCard` components. This mirrors the shop port's approach
  and is the natural place to wire in real course/catalog data later.
- The **curriculum list itself is still rendered by JS** (`renderCurriculum()`
  in `main.js`, from the `steps` array defined there), matching the
  original — the `<ol id="currList">` is just an empty mount point in the
  markup.
- **This is still a front-end mock**: sign-in accepts anything, "purchasing"
  a course just flips its button to "owned" client-side, and progress/points
  aren't persisted anywhere real. When you're ready to connect real auth,
  a course catalog, or payments, the natural seams are the course data
  arrays above and the `enterApp()` / `payCourseBtn` handlers in `main.js`.
- Like the shop, `<script src="/scripts/main.js" is:inline>` is used
  instead of an Astro-processed script so it runs exactly like the
  original synchronous inline script.
