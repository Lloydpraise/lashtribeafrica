// Shipping batches (public side): the next shipment date for the hero, and which
// batch a new order would join. The database is the source of truth: place_order()
// assigns the batch with the same rule used here (see supabase/migrations/0013).
//
// Rule: an order joins the first OPEN batch whose ship date is MORE than
// `cutoffDays` (default 7) days away. All dates are Nairobi dates (UTC+3, no DST).

import { supabase } from "../services/service.js";

const DAY = 86400000;
const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Today's date in Nairobi as YYYY-MM-DD. */
export const nairobiToday = (now = new Date()) =>
  new Date(now.getTime() + NAIROBI_OFFSET_MS).toISOString().slice(0, 10);

const dayNumber = (iso) => Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`) / DAY;

/** Whole days from today (Nairobi) to a YYYY-MM-DD date. Negative once passed. */
export const daysUntil = (iso, now = new Date()) => Math.round(dayNumber(iso) - dayNumber(nairobiToday(now)));

/** "Sat, 31 Oct" */
export function formatBatchDate(iso, withYear = false) {
  if (!iso) return "";
  return new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export function daysLabel(days) {
  if (days <= 0) return "ships today";
  if (days === 1) return "ships tomorrow";
  return `ships in ${days} days`;
}

/** Batches from ~6 weeks ago onwards (enough to show the previous shipment for progress). */
export async function fetchBatches() {
  const from = new Date(Date.now() - 45 * DAY).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("batches")
    .select("id, ship_date, status")
    .gte("ship_date", from)
    .order("ship_date", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchBatchCutoffDays() {
  const { data } = await supabase.from("site_settings").select("batch_cutoff_days").eq("id", true).maybeSingle();
  const n = Number(data?.batch_cutoff_days);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

/**
 * next      – the nearest shipment that hasn't happened yet (what the hero shows)
 * assigned  – the batch a new order placed now would join (what checkout shows)
 * progress  – 0-100, how far we are from the previous shipment to the next one
 */
export function batchState(batches, cutoffDays = 7, now = new Date()) {
  const list = (batches || []).filter((b) => b && b.ship_date);
  const today = nairobiToday(now);
  const upcoming = list.filter((b) => b.status !== "shipped" && String(b.ship_date).slice(0, 10) >= today);
  const next = upcoming[0] || null;
  const previous = [...list].reverse().find((b) => String(b.ship_date).slice(0, 10) < today) || null;
  const assigned =
    upcoming.find((b) => b.status === "open" && daysUntil(b.ship_date, now) > cutoffDays) || null;

  let percent = 0;
  let daysLeft = null;
  if (next) {
    daysLeft = Math.max(0, daysUntil(next.ship_date, now));
    const end = dayNumber(next.ship_date);
    const start = previous ? dayNumber(previous.ship_date) : end - 14;
    const span = Math.max(1, end - start);
    percent = Math.min(100, Math.max(0, Math.round(((dayNumber(today) - start) / span) * 100)));
  }
  return { next, previous, assigned, daysLeft, percent };
}
