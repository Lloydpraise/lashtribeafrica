// Minimal Pesapal API 3.0 client for Supabase Edge Functions (Deno).
// Docs: https://developer.pesapal.com/how-to-integrate/e-commerce/api-30-json/
//
// Which Pesapal account is used is decided ONLY by the function secrets (PESAPAL_ENV, PESAPAL_CONSUMER_KEY,
// PESAPAL_CONSUMER_SECRET). Swapping from your own keys to the business keys is a secrets change, not a code change.

export type PesapalEnv = "live" | "sandbox";

export interface PesapalConfig {
  env: PesapalEnv;
  baseUrl: string;
  key: string;
  secret: string;
}

// Pesapal documents these two roots. PESAPAL_BASE_URL can override either one without a code change.
const BASES: Record<PesapalEnv, string> = {
  live: "https://pay.pesapal.com/v3/api",
  sandbox: "https://cybqa.pesapal.com/pesapalv3/api",
};

export function loadConfig(get: (name: string) => string | undefined = (name) => Deno.env.get(name)): PesapalConfig {
  const env = (get("PESAPAL_ENV") || "").trim().toLowerCase();
  if (env !== "live" && env !== "sandbox") throw new Error('PESAPAL_ENV must be set to "live" or "sandbox"');
  const key = get("PESAPAL_CONSUMER_KEY")?.trim();
  const secret = get("PESAPAL_CONSUMER_SECRET")?.trim();
  if (!key || !secret) throw new Error("PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET must be set");
  const baseUrl = (get("PESAPAL_BASE_URL")?.trim() || BASES[env]).replace(/\/+$/, "");
  return { env, baseUrl, key, secret };
}

export class PesapalError extends Error {}

async function call(cfg: PesapalConfig, method: "GET" | "POST", path: string, token?: string, body?: unknown) {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) throw new PesapalError(`Pesapal ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  // Pesapal reports some failures with HTTP 200 and an error object in the body.
  if (json && typeof json.error === "object" && json.error && (json.error.message || json.error.code)) {
    throw new PesapalError(`Pesapal ${path} said: ${json.error.code || ""} ${json.error.message || ""}`.trim());
  }
  return json;
}

// Access tokens live for about 5 minutes. A warm function instance reuses one until shortly before it expires.
const tokenCache = new Map<string, { token: string; exp: number }>();

export async function getToken(cfg: PesapalConfig): Promise<string> {
  const cacheKey = `${cfg.baseUrl}|${cfg.key}`;
  const hit = tokenCache.get(cacheKey);
  if (hit && hit.exp > Date.now() + 30_000) return hit.token;
  const json = await call(cfg, "POST", "/Auth/RequestToken", undefined, {
    consumer_key: cfg.key,
    consumer_secret: cfg.secret,
  });
  if (!json?.token) throw new PesapalError("Pesapal did not return a token. Check the consumer key and secret, and PESAPAL_ENV.");
  const parsed = Date.parse(json.expiryDate || "");
  tokenCache.set(cacheKey, { token: json.token, exp: Number.isFinite(parsed) ? parsed : Date.now() + 4 * 60_000 });
  return json.token;
}

/** Finds this URL among the account's registered IPNs, or registers it. IPN ids belong to one Pesapal account,
 *  so looking it up each time keeps working after the keys are swapped. */
export async function ensureIpnId(cfg: PesapalConfig, token: string, ipnUrl: string): Promise<string> {
  const list = await call(cfg, "GET", "/URLSetup/GetIpnList", token);
  const entries: any[] = Array.isArray(list) ? list : Array.isArray(list?.ipn_list) ? list.ipn_list : [];
  const found = entries.find((e) => String(e?.url || "").toLowerCase() === ipnUrl.toLowerCase() &&
    (e?.ipn_status === 1 || String(e?.ipn_status_description || "").toLowerCase() === "active"));
  if (found?.ipn_id) return found.ipn_id;
  const created = await call(cfg, "POST", "/URLSetup/RegisterIPN", token, { url: ipnUrl, ipn_notification_type: "GET" });
  if (!created?.ipn_id) throw new PesapalError("Pesapal did not return an IPN id when registering the notification URL.");
  return created.ipn_id;
}

export interface SubmitOrderInput {
  id: string; // our unique reference, max 50 chars
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  cancellation_url?: string;
  notification_id: string;
  billing_address: {
    email_address?: string;
    phone_number?: string;
    country_code?: string;
    first_name?: string;
    last_name?: string;
  };
}

export async function submitOrder(cfg: PesapalConfig, token: string, input: SubmitOrderInput) {
  const json = await call(cfg, "POST", "/Transactions/SubmitOrderRequest", token, input);
  if (!json?.redirect_url || !json?.order_tracking_id) throw new PesapalError("Pesapal did not return a payment page link.");
  return json as { order_tracking_id: string; merchant_reference: string; redirect_url: string };
}

export interface PesapalStatus {
  payment_status_description?: string;
  status_code?: number;
  payment_method?: string;
  confirmation_code?: string;
  amount?: number;
  currency?: string;
  merchant_reference?: string;
  [k: string]: unknown;
}

export async function getTransactionStatus(cfg: PesapalConfig, token: string, orderTrackingId: string): Promise<PesapalStatus> {
  return await call(cfg, "GET", `/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, token);
}

export type Verdict =
  | { outcome: "paid" }
  | { outcome: "pending" }
  | { outcome: "failed" }
  | { outcome: "reversed"; reason: string }
  | { outcome: "mismatch"; reason: string };

/** Decides what a GetTransactionStatus answer means for the payment we expect. A payment only counts as
 *  paid when Pesapal says COMPLETED AND the reference, currency and amount match what we asked it to charge. */
export function evaluatePayment(
  status: PesapalStatus,
  expected: { reference: string; amount: number; currency: string },
): Verdict {
  const text = String(status?.payment_status_description || "").toUpperCase();
  const code = Number(status?.status_code);
  if (text === "COMPLETED" || code === 1) {
    if (String(status.merchant_reference || "") !== expected.reference) {
      return { outcome: "mismatch", reason: `Reference mismatch: Pesapal says ${status.merchant_reference}, expected ${expected.reference}.` };
    }
    if (String(status.currency || "").toUpperCase() !== expected.currency.toUpperCase()) {
      return { outcome: "mismatch", reason: `Currency mismatch: Pesapal says ${status.currency}, expected ${expected.currency}.` };
    }
    if (!(Number(status.amount) >= expected.amount - 0.01)) {
      return { outcome: "mismatch", reason: `Amount mismatch: Pesapal says ${status.amount}, expected ${expected.amount}.` };
    }
    return { outcome: "paid" };
  }
  if (text === "FAILED" || code === 2) return { outcome: "failed" };
  if (text === "REVERSED" || code === 3) return { outcome: "reversed", reason: "Pesapal reversed this payment. Check the order and the Pesapal dashboard." };
  return { outcome: "pending" }; // INVALID / empty: the customer hasn't finished paying yet
}
