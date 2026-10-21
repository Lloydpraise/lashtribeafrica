// Run with: deno test --allow-env supabase/functions/_shared/pesapal.test.ts
import {
  ensureIpnId, evaluatePayment, getToken, getTransactionStatus, loadConfig, submitOrder, PesapalError,
} from "./pesapal.ts";

function assert(cond: unknown, msg = "assertion failed") { if (!cond) throw new Error(msg); }
function eq(a: unknown, b: unknown, msg = "") {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

type Req = { method: string; url: string; headers: Record<string, string>; body: any };

/** Replaces fetch with a tiny fake Pesapal. `routes` maps "METHOD /path" to a response. */
function fakePesapal(routes: Record<string, (req: Req) => unknown>) {
  const calls: Req[] = [];
  const real = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const req: Req = {
      method: init?.method || "GET",
      url,
      headers: Object.fromEntries(Object.entries((init?.headers as Record<string, string>) || {})),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(req);
    const path = url.replace(/^https:\/\/[^/]+(\/pesapalv3)?(\/v3)?\/api/, "").split("?")[0];
    const handler = routes[`${req.method} ${path}`];
    if (!handler) return Promise.resolve(new Response("not found", { status: 404 }));
    const out = handler(req);
    return Promise.resolve(out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 }));
  }) as typeof fetch;
  return { calls, restore: () => (globalThis.fetch = real) };
}

const env = (vars: Record<string, string>) => (k: string) => vars[k];
const cfgLive = loadConfig(env({ PESAPAL_ENV: "live", PESAPAL_CONSUMER_KEY: "k1", PESAPAL_CONSUMER_SECRET: "s1" }));

Deno.test("config: env must be explicit, keys required, base url per env and overridable", () => {
  let threw = 0;
  try { loadConfig(env({ PESAPAL_CONSUMER_KEY: "k", PESAPAL_CONSUMER_SECRET: "s" })); } catch { threw++; }
  try { loadConfig(env({ PESAPAL_ENV: "prod", PESAPAL_CONSUMER_KEY: "k", PESAPAL_CONSUMER_SECRET: "s" })); } catch { threw++; }
  try { loadConfig(env({ PESAPAL_ENV: "live" })); } catch { threw++; }
  eq(threw, 3, "bad configs rejected");
  eq(cfgLive.baseUrl, "https://pay.pesapal.com/v3/api");
  eq(loadConfig(env({ PESAPAL_ENV: "sandbox", PESAPAL_CONSUMER_KEY: "k", PESAPAL_CONSUMER_SECRET: "s" })).baseUrl, "https://cybqa.pesapal.com/pesapalv3/api");
  eq(loadConfig(env({ PESAPAL_ENV: "live", PESAPAL_CONSUMER_KEY: "k", PESAPAL_CONSUMER_SECRET: "s", PESAPAL_BASE_URL: "https://x.test/api/" })).baseUrl, "https://x.test/api");
});

Deno.test("token: posts the keys, caches until near expiry", async () => {
  const exp = new Date(Date.now() + 5 * 60_000).toISOString();
  const fake = fakePesapal({ "POST /Auth/RequestToken": () => ({ token: "T1", expiryDate: exp, status: "200" }) });
  try {
    const cfg = { ...cfgLive, key: "token-test-key" };
    eq(await getToken(cfg), "T1");
    eq(await getToken(cfg), "T1");
    eq(fake.calls.length, 1, "second call served from cache");
    eq(fake.calls[0].body, { consumer_key: "token-test-key", consumer_secret: "s1" });
    eq(fake.calls[0].url, "https://pay.pesapal.com/v3/api/Auth/RequestToken");
  } finally { fake.restore(); }
});

Deno.test("token: a rejection surfaces as an error", async () => {
  const fake = fakePesapal({ "POST /Auth/RequestToken": () => ({ token: null, error: { code: "invalid_consumer_key_or_secret_provided", message: "bad keys" } }) });
  try {
    let err: unknown;
    try { await getToken({ ...cfgLive, key: "bad-key" }); } catch (e) { err = e; }
    assert(err instanceof PesapalError, "PesapalError expected");
  } finally { fake.restore(); }
});

Deno.test("ipn: reuses an active registration, otherwise registers the URL", async () => {
  const url = "https://proj.supabase.co/functions/v1/pesapal-ipn";
  let fake = fakePesapal({
    "GET /URLSetup/GetIpnList": () => [
      { url: "https://other.test/ipn", ipn_id: "OTHER", ipn_status: 1 },
      { url, ipn_id: "MINE", ipn_status: 1 },
    ],
  });
  try {
    eq(await ensureIpnId(cfgLive, "T", url), "MINE");
    eq(fake.calls.length, 1, "no registration call when one exists");
    eq(fake.calls[0].headers.Authorization, "Bearer T");
  } finally { fake.restore(); }

  fake = fakePesapal({
    "GET /URLSetup/GetIpnList": () => [],
    "POST /URLSetup/RegisterIPN": (r) => ({ url: r.body.url, ipn_id: "NEW", ipn_status: 1 }),
  });
  try {
    eq(await ensureIpnId(cfgLive, "T", url), "NEW");
    eq(fake.calls[1].body, { url, ipn_notification_type: "GET" });
  } finally { fake.restore(); }
});

Deno.test("submit order: sends the documented body and returns the payment page link", async () => {
  const fake = fakePesapal({
    "POST /Transactions/SubmitOrderRequest": () => ({ order_tracking_id: "TRK1", merchant_reference: "LT-1-abc", redirect_url: "https://pay.pesapal.com/iframe/x", status: "200" }),
  });
  try {
    const out = await submitOrder(cfgLive, "T", {
      id: "LT-1-abc", currency: "KES", amount: 150, description: "Lashtribe order LT-1",
      callback_url: "https://site/ecommerce/payment-return/", notification_id: "MINE",
      billing_address: { email_address: "a@b.co", country_code: "KE" },
    });
    eq(out.redirect_url, "https://pay.pesapal.com/iframe/x");
    eq(fake.calls[0].body.notification_id, "MINE");
    eq(fake.calls[0].body.amount, 150);
  } finally { fake.restore(); }
});

Deno.test("status: asks by tracking id", async () => {
  const fake = fakePesapal({ "GET /Transactions/GetTransactionStatus": () => ({ payment_status_description: "Completed", status_code: 1 }) });
  try {
    await getTransactionStatus(cfgLive, "T", "TRK 1");
    eq(fake.calls[0].url, "https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=TRK%201");
  } finally { fake.restore(); }
});

const expected = { reference: "LT-1-abc", amount: 150, currency: "KES" };
const completed = { payment_status_description: "Completed", status_code: 1, merchant_reference: "LT-1-abc", currency: "KES", amount: 150 };

Deno.test("verdict: only a matching COMPLETED payment is paid", () => {
  eq(evaluatePayment(completed, expected).outcome, "paid");
  eq(evaluatePayment({ ...completed, amount: 150.004 }, expected).outcome, "paid", "rounding tolerance");
  eq(evaluatePayment({ ...completed, amount: 200 }, expected).outcome, "paid", "overpayment still pays the order");
  eq(evaluatePayment({ ...completed, amount: 10 }, expected).outcome, "mismatch", "underpayment");
  eq(evaluatePayment({ ...completed, currency: "USD" }, expected).outcome, "mismatch", "wrong currency");
  eq(evaluatePayment({ ...completed, merchant_reference: "LT-2-zzz" }, expected).outcome, "mismatch", "wrong reference");
  eq(evaluatePayment({ ...completed, amount: undefined }, expected).outcome, "mismatch", "missing amount");
});

Deno.test("verdict: failed, reversed and not-yet-paid", () => {
  eq(evaluatePayment({ payment_status_description: "Failed", status_code: 2 }, expected).outcome, "failed");
  eq(evaluatePayment({ payment_status_description: "Reversed", status_code: 3 }, expected).outcome, "reversed");
  eq(evaluatePayment({ payment_status_description: "INVALID", status_code: 0 }, expected).outcome, "pending");
  eq(evaluatePayment({}, expected).outcome, "pending");
});
