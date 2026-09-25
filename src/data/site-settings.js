// Site settings — hero, announcement ticker, order countdown, and the
// privacy/shipping/terms policy pages, all editable from the admin
// Site Settings panel. Falls back to the copy that used to be hardcoded
// in the components, so nothing changes on the storefront until someone
// edits it in the admin panel.

import { supabase } from "../services/service.js";

const DEFAULTS = {
  heroEyebrow: "Wholesale For Lashtechs",
  heroPhrases: ["Direct Sourcing", "No Gatekeeping", "Unbeatable Prices"],
  heroPhotoTag: "Studio Lash Bed — Nairobi",
  heroBgImage: null,
  heroCtaPrimaryLabel: "Order Now",
  heroCtaPrimaryLink: "#shop",
  heroCtaSecondaryLabel: "How It Works",
  heroCtaSecondaryLink: "#how-it-works",

  countdownLabel: "Order Now",
  countdownTarget: null,
  countdownWindowDays: 7,
  countdownOpenedText: "Window opened Mon",
  countdownNextText: "Next batch ships soon",

  tickerEnabled: true,
  tickerMessages: [
    "WHOLESALE · DIRECT FROM SOURCE",
    "ORDER NOW — NEW BATCH SHIPS SOON",
    "MOQ 5 ON MOST PRODUCTS",
    "UNBEATABLE PRICES · UNMATCHED QUALITY",
  ],

  policyPrivacy: "",
  policyShipping: "",
  policyTerms: "",
};

function mapRow(row) {
  if (!row) return { ...DEFAULTS };
  return {
    heroEyebrow: row.hero_eyebrow || DEFAULTS.heroEyebrow,
    heroPhrases:
      Array.isArray(row.hero_phrases) && row.hero_phrases.length > 0
        ? row.hero_phrases
        : DEFAULTS.heroPhrases,
    heroPhotoTag: row.hero_photo_tag || DEFAULTS.heroPhotoTag,
    heroBgImage: row.hero_bg_image || null,
    heroCtaPrimaryLabel: row.hero_cta_primary_label || DEFAULTS.heroCtaPrimaryLabel,
    heroCtaPrimaryLink: row.hero_cta_primary_link || DEFAULTS.heroCtaPrimaryLink,
    heroCtaSecondaryLabel: row.hero_cta_secondary_label || DEFAULTS.heroCtaSecondaryLabel,
    heroCtaSecondaryLink: row.hero_cta_secondary_link || DEFAULTS.heroCtaSecondaryLink,

    countdownLabel: row.countdown_label || DEFAULTS.countdownLabel,
    countdownTarget: row.countdown_target || null,
    countdownWindowDays: row.countdown_window_days || DEFAULTS.countdownWindowDays,
    countdownOpenedText: row.countdown_opened_text || DEFAULTS.countdownOpenedText,
    countdownNextText: row.countdown_next_text || DEFAULTS.countdownNextText,

    tickerEnabled: row.ticker_enabled !== false,
    tickerMessages:
      Array.isArray(row.ticker_messages) && row.ticker_messages.length > 0
        ? row.ticker_messages
        : DEFAULTS.tickerMessages,

    policyPrivacy: row.policy_privacy || "",
    policyShipping: row.policy_shipping || "",
    policyTerms: row.policy_terms || "",
  };
}

export async function getSiteSettings() {
  try {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (error) throw error;
    return mapRow(data);
  } catch (err) {
    console.warn(
      "[site-settings] Couldn't load site_settings — using built-in defaults. " +
        (err?.message || err)
    );
    return { ...DEFAULTS };
  }
}

// Days-left + progress-bar % for the hero's order-cadence bar, derived
// from countdownTarget/countdownWindowDays. Returns sensible fallbacks
// (matches the old hardcoded "5 days left" / 40%) when no target is set.
export function getCountdownState(settings) {
  const windowDays = Math.max(1, Number(settings.countdownWindowDays) || 7);

  if (!settings.countdownTarget) {
    return { daysLeft: 5, percent: 40, label: "5 days left" };
  }

  const now = Date.now();
  const target = new Date(settings.countdownTarget).getTime();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.max(0, Math.ceil((target - now) / msPerDay));
  const elapsedDays = Math.min(windowDays, Math.max(0, windowDays - daysLeft));
  const percent = Math.round((elapsedDays / windowDays) * 100);
  const label = daysLeft <= 0 ? "Closing today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`;

  return { daysLeft, percent, label };
}
