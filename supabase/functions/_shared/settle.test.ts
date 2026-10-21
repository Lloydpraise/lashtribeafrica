// Run with: deno test --allow-env --allow-net=pay.pesapal.com supabase/functions/_shared/settle.test.ts
// (network is faked; no request leaves the machine)
import { settlePayment } from "./settle.ts";
import { loadConfig } from "./pesapal.ts";

function eq(a: unknown, b: unknown, msg = "") {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

const cfg = loadConfig((k) => ({ PESAPAL_ENV: "live", PESAPAL_CONSUMER_KEY: "settle-key", PESAPAL_CONSUMER_SECRET: "s" } as Record<string, string>)[k]);

function fakeDb(orderStatus: string, rpcError: unknown = null) {
  const log = { rpc: [] as any[], updates: [] as any[] };
  const db = {
    log,
    from(table: string) {
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { status: orderStatus }, error: null }) }) }),
        update: (patch: unknown) => ({ eq: async (_c: string, id: string) => { log.updates.push({ table, id, patch }); return { error: null }; } }),
      };
    },
    rpc: async (name: string, args: unknown) => { log.rpc.push({ name, args }); return { error: rpcError }; },
  };
  return db;
}

function fakePesapalStatus(status: Record<string, unknown>) {
  const real = globalThis.fetch;
  globalThis.fetch = ((input: string | URL | Request) => {
    const url = String(input);
    const body = url.includes("RequestToken")
      ? { token: "T", expiryDate: new Date(Date.now() + 300_000).toISOString() }
      : status;
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as typeof fetch;
  return () => (globalThis.fetch = real);
}

const payment = { id: "pay1", order_id: "ord1", merchant_reference: "LT-9-abc", order_tracking_id: "TRK9", amount: "150.00", currency: "KES", status: "pending" };
const completed = { payment_status_description: "Completed", status_code: 1, merchant_reference: "LT-9-abc", currency: "KES", amount: 150, confirmation_code: "RCPT123", payment_method: "MpesaKE" };

Deno.test("a verified payment marks the order paid once, with the receipt as the reference", async () => {
  const restore = fakePesapalStatus(completed);
  try {
    const db = fakeDb("pending");
    eq(await settlePayment(db, cfg, payment), "paid");
    eq(db.log.rpc, [{ name: "admin_set_order_status", args: { p_order: "ord1", p_status: "paid", p_method: "pesapal", p_ref: "RCPT123" } }]);
    eq(db.log.updates[0].patch.status, "paid");
    eq(db.log.updates[0].patch.payment_method, "MpesaKE");
  } finally { restore(); }
});

Deno.test("an already-paid payment is left alone (no Pesapal call, no second update)", async () => {
  const db = fakeDb("paid");
  eq(await settlePayment(db, cfg, { ...payment, status: "paid" }), "paid");
  eq(db.log.rpc.length + db.log.updates.length, 0);
});

Deno.test("an underpaid payment is NOT marked paid", async () => {
  const restore = fakePesapalStatus({ ...completed, amount: 1 });
  try {
    const db = fakeDb("pending");
    eq(await settlePayment(db, cfg, payment), "mismatch");
    eq(db.log.rpc.length, 0, "order untouched");
  } finally { restore(); }
});

Deno.test("money for a cancelled order is flagged, not silently reopened", async () => {
  const restore = fakePesapalStatus(completed);
  try {
    const db = fakeDb("cancelled");
    eq(await settlePayment(db, cfg, payment), "mismatch");
    eq(db.log.rpc.length, 0);
  } finally { restore(); }
});

Deno.test("still waiting and failed payments are recorded without touching the order", async () => {
  for (const [status, expected] of [[{ payment_status_description: "INVALID", status_code: 0 }, "pending"], [{ payment_status_description: "Failed", status_code: 2 }, "failed"]] as const) {
    const restore = fakePesapalStatus(status);
    try {
      const db = fakeDb("pending");
      eq(await settlePayment(db, cfg, payment), expected);
      eq(db.log.rpc.length, 0);
    } finally { restore(); }
  }
});

Deno.test("if marking the order paid fails, the payment stays pending so the next notification retries", async () => {
  const restore = fakePesapalStatus(completed);
  try {
    const db = fakeDb("pending", { message: "db down" });
    let threw = false;
    try { await settlePayment(db, cfg, payment); } catch { threw = true; }
    eq(threw, true);
    eq(db.log.updates.length, 0, "payment row not marked paid");
  } finally { restore(); }
});
