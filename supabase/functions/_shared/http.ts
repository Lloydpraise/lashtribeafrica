export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Reads parameters from the query string and, for POST, from a JSON or form body. */
export async function readParams(req: Request): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  new URL(req.url).searchParams.forEach((v, k) => (out[k] = v));
  if (req.method === "POST") {
    const type = req.headers.get("content-type") || "";
    try {
      if (type.includes("application/json")) {
        const body = await req.json();
        for (const [k, v] of Object.entries(body || {})) if (v != null) out[k] = String(v);
      } else if (type.includes("application/x-www-form-urlencoded")) {
        new URLSearchParams(await req.text()).forEach((v, k) => (out[k] = v));
      }
    } catch { /* unreadable body: the query string is all we have */ }
  }
  return out;
}
