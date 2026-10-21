# Pesapal payments for Lashtribe

Extract this zip over the repo root. Then do the 4 steps below, in order. `npm run build` passes, and the server
logic has 14 passing tests (`deno test --allow-env supabase/functions/_shared/`) against a fake Pesapal. It has NOT
yet talked to the real Pesapal: the first real payment (step 4) is the end-to-end proof.

## How a payment flows
1. Checkout places the order (still `pending`) and asks `pesapal-create-payment` for a payment page.
   The amount comes from the order in the database, never from the browser.
2. The customer pays on Pesapal's page (card or M-Pesa) and comes back to `/ecommerce/payment-return/`.
3. Pesapal also calls `pesapal-ipn` by itself. The function asks Pesapal what happened and only marks the order
   paid if Pesapal says COMPLETED **and** the reference, currency and amount match. That unlocks any course in the
   order, exactly like marking it paid in Admin → Orders.
4. If online payment is off for an order, or Pesapal can't be reached, the order just stays `pending` and you confirm
   payment manually as today. Nothing breaks.

## Step 1: database
Run `supabase/migrations/0017_pesapal_payments.sql` in the Supabase SQL editor (new `payments` table, admin-read only).

## Step 2: deploy the functions
From the repo root, with the Supabase CLI linked to the project:

    supabase functions deploy pesapal-create-payment
    supabase functions deploy pesapal-status
    supabase functions deploy pesapal-ipn --no-verify-jwt

`--no-verify-jwt` is required on `pesapal-ipn` only: Pesapal can't send a Supabase login, so that function trusts
nothing in the request and asks Pesapal directly instead.

## Step 3: secrets (Supabase dashboard → Edge Functions → Secrets, or `supabase secrets set`)
Enter your keys yourself in the dashboard or CLI. Don't paste them into chat. If they have been shared anywhere,
regenerate them in Pesapal.

| Secret | Value |
|---|---|
| `PESAPAL_ENV` | `live` (production) or `sandbox` |
| `PESAPAL_CONSUMER_KEY` | your Pesapal consumer key |
| `PESAPAL_CONSUMER_SECRET` | your Pesapal consumer secret |
| `SITE_URL` | the public site address, e.g. `https://www.lashtribeafrica.com` (no trailing slash) |
| `PESAPAL_TEST_EMAILS` | **recommended while on your own keys**: comma-separated emails allowed to pay online, e.g. `you@gmail.com`. Everyone else keeps the manual flow, so no customer's money lands in your personal account by accident. Delete this secret to open payments to everyone. |

(Supabase supplies `SUPABASE_URL` and the service key to functions itself.) The Pesapal notification URL
(`https://<project>.supabase.co/functions/v1/pesapal-ipn`) is registered with Pesapal automatically on the first payment.

## Step 4: test end to end (real money, so keep it small)
1. Place an order as one of the `PESAPAL_TEST_EMAILS` customers for a small amount. A course or product priced around
   Ksh 100 is ideal.
2. You should be sent to Pesapal's page. Pay with M-Pesa or a card.
3. You land on the return page, which should turn to "Payment received". In Admin → Orders the order is `paid`, the
   reference is the M-Pesa/card receipt, and a course in the order is unlocked.
4. Also try cancelling on Pesapal's page (you should get "Payment not completed" and a "Try paying again" button).
5. In Supabase → Table editor → `payments` you can see every attempt, the status Pesapal returned and any note.
   Function logs are under Edge Functions → Logs.

## Switching to the business keys
Change only `PESAPAL_CONSUMER_KEY` and `PESAPAL_CONSUMER_SECRET` (and `PESAPAL_ENV` if it differs), delete
`PESAPAL_TEST_EMAILS`, and run one more small test payment. No redeploy and no code change: the notification URL is
looked up or registered again under the new account automatically. Money settles to whichever Pesapal account the keys
belong to, so until the swap only you should be paying online.

## Things to know
- **Shipping fee:** checkout currently charges the order total as saved (goods, less offers, plus any shipping fee
  already set). The shipping fee is "TBD" at checkout today, so online payment will not include it unless it is set
  before payment. Decide whether shipping is collected separately or added to the total at checkout.
- **First-request path:** Pesapal's current docs use `https://pay.pesapal.com/v3/api`. If your first test fails with a
  404 from Pesapal (visible in the function logs), set `PESAPAL_BASE_URL` to `https://pay.pesapal.com/pesapalv3/api`.
- **Mismatch / reversed:** underpaid payments, money for an already cancelled order, and reversals are NOT applied to
  the order automatically. They are recorded in `payments` with a note, and the customer sees a "we're looking into
  it" message. Resolve them by hand.
- Every attempt uses a fresh reference (`LT-1234-xxxxxxxx`), so a customer can retry after cancelling.
