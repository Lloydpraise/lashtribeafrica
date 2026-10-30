# Reviews: setup (about 5 minutes)

Needs the communications setup from COMMUNICATIONS-SETUP.md first (migration 0043 and the send-emails function).

1. **Run `supabase/migrations/0044_reviews.sql`** in the Supabase SQL editor. Safe to re-run.
2. **Redeploy the send function** so it can build the review link:
   `supabase functions deploy send-emails --no-verify-jwt`
3. **Deploy the site** (new `/review` page, review cards on product and course pages, Admin > Reviews).

## See it before any customer does
Admin > **Reviews** has three buttons:
* **Open the review page (preview)**: the exact page a customer gets from the email. Slide the stars, tick products,
  type, post. Nothing is saved.
* **See a sample review on a product page**: opens a product page with a dashed, labelled sample card. It only shows
  with `?preview-reviews` on the address, so customers never see it (a made-up review shown to the public would be
  misleading). Add `?preview-reviews` to any product or course address to see it there too.
* **Send test email**: mails the review request to your own address (email sending must be switched on). Its button
  opens the preview page.

## What happens by itself
* Order marked **Fulfilled** (products, or mixed) -> review email 24 hours later.
* Course-only order marked **Paid** -> review email 72 hours later.
* Held outside 08:00-20:00 Nairobi time, skipped if they unsubscribed, never sent twice, skipped if the order was
  cancelled or refunded.
* The link is single use. One order = one review, shown on every product and course in that order (the customer can
  untick some).
* Only paying customers can review: a link exists only for orders that were fulfilled or paid.
* Admin > Reviews: hide, show or delete any review. The email wording is editable in Communications > Automatic
  emails ("Ask for a review").
* Product and course pages show **No reviews yet** until the first one arrives.
