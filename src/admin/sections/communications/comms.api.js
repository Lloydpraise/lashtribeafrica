import { supabase } from "../../../services/service.js";

const must = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const count = async (query) => {
  const { count: n, error } = await query;
  if (error) throw new Error(error.message);
  return n || 0;
};

/** Start of today in Nairobi, as an ISO string (the daily email limit resets then). */
export function nairobiDayStart() {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
  return new Date(`${ymd}T00:00:00+03:00`).toISOString();
}

/** True once email is fully connected (domain moved, function deployed, switch on). Until then the admin shows a simple "awaiting domain transfer" note. */
export const emailsLive = (s) => Boolean(s?.enabled && s?.function_url && s?.webhook_secret && s?.sender_email);

export async function getSettings() {
  return must(await supabase.from("comms_settings").select("*").eq("id", true).maybeSingle());
}

export async function saveSettings(patch) {
  return must(await supabase.from("comms_settings").update(patch).eq("id", true).select().single());
}

export async function listTemplates() {
  return must(await supabase.from("email_templates").select("*").order("kind").order("priority").order("name")) || [];
}

export async function saveTemplate(key, patch) {
  return must(await supabase.from("email_templates").update(patch).eq("key", key).select().single());
}

export async function listOutbox({ status = "", q = "", limit = 150 } = {}) {
  let query = supabase
    .from("email_outbox")
    .select("id, template_key, kind, to_email, to_name, status, reason, attempts, send_after, sent_at, created_at, campaign_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) query = query.eq("status", status);
  if (q.trim()) query = query.ilike("to_email", `%${q.trim().replace(/[\\%_]/g, "\\$&")}%`);
  return must(await query) || [];
}

export async function requeue(id, action) {
  const { error } = await supabase.rpc("admin_comms_requeue", { p_id: id, p_action: action });
  if (error) throw new Error(error.message);
}

export async function sendTest(template, to) {
  const { error } = await supabase.rpc("admin_send_test_email", { p_template: template, p_to: to });
  if (error) throw new Error(error.message);
}

export async function getStats() {
  const dayStart = nairobiDayStart();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const head = { count: "exact", head: true };
  const [sentToday, queued, failed, skipped, optedIn, optedOut, sentWeek] = await Promise.all([
    count(supabase.from("email_outbox").select("id", head).eq("status", "sent").gte("sent_at", dayStart)),
    count(supabase.from("email_outbox").select("id", head).eq("status", "queued")),
    count(supabase.from("email_outbox").select("id", head).eq("status", "failed").gte("created_at", weekAgo)),
    count(supabase.from("email_outbox").select("id", head).eq("status", "skipped").gte("created_at", weekAgo)),
    count(supabase.from("customers").select("id", head).eq("marketing_opt_in", true).eq("email_opt_out", false).not("email", "is", null)),
    count(supabase.from("customers").select("id", head).eq("email_opt_out", true)),
    count(supabase.from("email_outbox").select("id", head).eq("status", "sent").gte("sent_at", weekAgo)),
  ]);
  return { sentToday, queued, failed, skipped, optedIn, optedOut, sentWeek };
}

export async function audienceCount() {
  return count(
    supabase.from("customers").select("id", { count: "exact", head: true })
      .eq("marketing_opt_in", true).eq("email_opt_out", false).not("email", "is", null),
  );
}

export async function listCampaigns() {
  return must(await supabase.from("email_campaigns").select("*").order("created_at", { ascending: false })) || [];
}

export async function saveCampaign(campaign) {
  const row = {
    name: campaign.name, subject: campaign.subject, preheader: campaign.preheader || "", body: campaign.body,
    cta_label: campaign.cta_label || null, cta_url: campaign.cta_url || null,
    blocks: campaign.blocks || [], offer_id: campaign.offer_id || null,
  };
  if (campaign.id) return must(await supabase.from("email_campaigns").update(row).eq("id", campaign.id).select().single());
  return must(await supabase.from("email_campaigns").insert(row).select().single());
}

export async function deleteCampaign(id) {
  const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function sendCampaign(id, startAt) {
  const { data, error } = await supabase.rpc("admin_send_campaign", { p_campaign: id, p_start: startAt || null });
  if (error) throw new Error(error.message);
  return data;
}

/** The "Email this offer" button on the Offers screen hands the offer over to a new campaign draft. */
export function draftFromOffer(offer) {
  const title = offer.badge_text || offer.label;
  return {
    name: `Offer: ${offer.label}`,
    offer_id: offer.id,
    subject: `${title}: now on at Lashtribe`,
    preheader: offer.banner_text || "A new offer is live.",
    body: `Hi {{first_name}},\n\nOur offer **${title}** is live now.${offer.banner_text ? `\n\n${offer.banner_text}` : ""}\n\nOrders are shipped in batches on the 15th and the last day of each month, so order early to make the next shipment.`,
    cta_label: "Shop the offer",
    cta_url: "{{site_url}}/ecommerce",
    blocks: ["offer"],
  };
}

/** Runs the hourly checks right now (cart reminders, ships-in-2-days) and sends what is due. */
export async function runChecks() {
  const { error } = await supabase.rpc("admin_comms_tick");
  if (error) throw new Error(error.message);
}
