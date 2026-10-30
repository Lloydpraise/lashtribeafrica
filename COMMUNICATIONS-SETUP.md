# Communications: setup (about 30 minutes, once)

Emails are sent through **Brevo (free: 300 a day)**. Nothing polls: the database pings the send function the moment
an email is due; one hourly check (`comms_tick`) only calls it when something delayed is waiting.

Everything ships **switched off**. Until you turn it on (step 7) nothing is queued or sent, and orders, sign-ups and
the rest of the site behave exactly as before.

## 1. Run the migration
Supabase > SQL Editor > paste `supabase/migrations/0043_communications.sql` > Run. Safe to re-run.
If it prints a notice that `pg_net` or `pg_cron` is unavailable: Database > Extensions > enable **pg_net** and
**pg_cron**, then run the file again.

## 2. Brevo
1. **Senders, Domains & Dedicated IPs > Domains > Add a domain** > `lashtribeafrica.com`. Brevo shows 3 DNS records
   (a `brevo-code` TXT, two DKIM CNAMEs) and you should add a **DMARC** TXT as well (`_dmarc` = `v=DMARC1; p=none;
   rua=mailto:hello@lashtribeafrica.com`).
2. Namecheap > Domain List > Manage > **Advanced DNS** > add those records. Brevo's "Authenticate" button turns green
   within minutes to an hour. Without this, Gmail sends us to spam.
3. **Senders > Add a sender** `hello@lashtribeafrica.com` (any address on the domain, and make sure it can receive mail).
4. **SMTP & API > API Keys > Generate** (this sends the order/cart/offer emails). Keep the key private.
5. **SMTP & API > SMTP** shows a login and lets you create an **SMTP key** (this sends sign-up/password emails, step 5).

## 3. Deploy the two functions (terminal, in the project folder, Supabase CLI logged in)
```
supabase secrets set BREVO_API_KEY=<your Brevo API key> COMMS_SECRET=<a long random string>
supabase functions deploy send-emails --no-verify-jwt
supabase functions deploy email-unsubscribe --no-verify-jwt
```
`COMMS_SECRET` must equal the **Shared secret** you generate in Admin > Communications > Settings (it shows the exact
command with your secret filled in after you press Generate and Save).

## 4. Admin > Communications > Settings
Fill in the sender, the **send function address** (`https://<project>.supabase.co/functions/v1/send-emails`), press
**Generate new** for the secret, put your own email under **Test mode**, Save. Do not tick "Email sending" yet.

## 5. Sign-up codes and password emails (Supabase Auth)
Authentication > **SMTP Settings**: enable custom SMTP: host `smtp-relay.brevo.com`, port `587`, user = your Brevo SMTP
login, password = the SMTP key, sender `hello@lashtribeafrica.com`, name `Lashtribe Africa`.
Authentication > **Providers > Email**: turn **Confirm email ON** (this also closes the open security item).
Authentication > **Email Templates**: paste the files in `supabase/email-templates/` (subjects below). The sign-up
template shows the 6-digit code `{{ .Token }}`; OTP length 6, expiry 3600.

| Template | File | Subject |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | Your Lashtribe confirmation code: {{ .Token }} |
| Reset password | `reset-password.html` | Reset your Lashtribe password |
| Magic link | `magic-link.html` | Your Lashtribe sign-in link |
| Change email | `change-email.html` | Confirm your new email address |

Authentication > URL Configuration: Site URL `https://lashtribeafrica.com`.

## 6. Deploy the site
New: `/unsubscribe` page, sign-up code box, saved cart sync, admin Communications tab. Build and deploy as usual.

## 7. Turn it on safely
1. Settings: tick **Email sending**, keep **Test mode** filled with your own address. Save.
2. **Automatic emails**: open any email, type your address, **Send test** (uses example data).
3. Create a test profile with your address: you get the **6-digit code**, then the **welcome** email.
4. Place a test order with your address: **order received**; mark it paid in Orders: **payment confirmed**.
5. When happy: empty the Test mode box and Save. Real customers now get their emails.

## Demo script (for the launch showcase)
| Show | How |
| --- | --- |
| Email confirmation code | Create profile > code email > type code > signed in |
| Welcome on first login | arrives right after the code is confirmed |
| Order + payment emails | place an order, mark it paid in admin |
| Abandoned cart | signed in + opted in, add items, leave. In Automatic emails set "Abandoned cart, reminder 1" wait to 2 minutes, then Overview > **Run checks now** after 2 minutes |
| Shipping in 2 days | give a batch a ship date 2 days away with a paid order, then **Run checks now** |
| Shipped / Ready to collect | set the batch status to Shipped, then **Arrived, ready to collect** |
| Offer email | Offers > **Email this offer** > Send now |

(Remember to set the cart reminder wait back to 180 minutes afterwards.)

## The rules built in
* **Service** emails (orders, payments, shipping, courses, certificates, account) go to everyone, because they are about
  something the person did.
* **Marketing** (cart reminders, offers, "learn more", campaigns) goes only to customers with the opt-in ticked. The box
  is **unticked by default** at checkout, sign-up and in the profile, and each marketing email has an unsubscribe link
  plus the one-click `List-Unsubscribe` header. Unsubscribing also stops anything already queued.
* **Spacing:** at most one marketing email per person every 72 hours (editable), none between 20:00 and 08:00 Nairobi
  time, and a campaign that would have to wait more than 3 days for someone is dropped for that person.
* **Once only:** every event has a unique key, so changing an order's status twice never double-sends.
* **Daily limit:** 280 a day (Brevo free is 300); order and account emails go first, the rest wait for tomorrow.
* Cart reminders only reach **signed-in** shoppers who opted in. Guests are never emailed about a cart.
* Update the privacy policy to name Brevo (email delivery) and HeySasa (WhatsApp) as processors.

## Not built yet (next)
New-stock digest and back-in-stock alerts, supplier MOQ pool progress emails, a newsletter composer beyond Campaigns,
and WhatsApp (after HeySasa is done).
