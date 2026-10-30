// One-click unsubscribe for the List-Unsubscribe header (RFC 8058): mail apps POST here when someone presses
// "Unsubscribe" next to the sender name. The visible link inside each email goes to the site's /unsubscribe page.
// Deploy with --no-verify-jwt:  supabase functions deploy email-unsubscribe --no-verify-jwt
import { json } from "../_shared/http.ts";
import { adminClient } from "../_shared/settle.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({});
  const token = new URL(req.url).searchParams.get("t") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "bad link" }, 400);
  if (req.method !== "POST") {
    // someone opened the link in a browser: send them to the friendly page on the site
    const db = adminClient();
    const { data } = await db.from("comms_settings").select("site_url").eq("id", true).maybeSingle();
    const site = String(data?.site_url || "").replace(/\/$/, "");
    return new Response(null, { status: 302, headers: { Location: `${site}/unsubscribe?t=${token}` } });
  }
  const { error } = await adminClient().rpc("email_unsubscribe", { p_token: token });
  if (error) return json({ error: "could not unsubscribe" }, 500);
  return json({ ok: true });
});
