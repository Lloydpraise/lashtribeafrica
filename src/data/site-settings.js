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
  batchCutoffDays: 7,

  contactEmail: "info@lashtribeafrica.com",
  contactPhone: "",
  contactWhatsapp: "",
  socialInstagram: "https://www.instagram.com/lashesbyshazzacademy",
  socialTiktok: "https://www.tiktok.com/@lashesbyshazzacademy",
  socialFacebook: "https://www.facebook.com/lashesbyshazzacademy",
  socialYoutube: "https://www.youtube.com/@lashesbyshazzacademy",

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
    // empty string in the database means "don't show it" (not "use the default")
    contactEmail: row.contact_email ?? DEFAULTS.contactEmail,
    contactPhone: row.contact_phone ?? "",
    contactWhatsapp: row.contact_whatsapp ?? "",
    socialInstagram: row.social_instagram ?? DEFAULTS.socialInstagram,
    socialTiktok: row.social_tiktok ?? DEFAULTS.socialTiktok,
    socialFacebook: row.social_facebook ?? DEFAULTS.socialFacebook,
    socialYoutube: row.social_youtube ?? DEFAULTS.socialYoutube,

    batchCutoffDays: Number.isFinite(Number(row.batch_cutoff_days)) ? Number(row.batch_cutoff_days) : DEFAULTS.batchCutoffDays,

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

// LEGACY: the hero now reads the next shipping batch from the `batches` table
// (see data/batches.js). This single-date countdown is only kept for old rows.
// Days-left + progress-bar % derived from countdownTarget/countdownWindowDays.
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


/** Digits only, for wa.me and tel: links. Kenyan 07xx / 01xx numbers become 254xxxxxxxxx. */
export function phoneDigits(value) {
  const d = String(value || "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.startsWith("0")) return `254${d.slice(1)}`;
  return d;
}

/** The social links that are actually filled in, in display order. */
export function socialLinks(settings) {
  return [
    { key: "instagram", label: "Instagram", url: settings.socialInstagram },
    { key: "tiktok", label: "TikTok", url: settings.socialTiktok },
    { key: "facebook", label: "Facebook", url: settings.socialFacebook },
    { key: "youtube", label: "YouTube", url: settings.socialYoutube },
  ].filter((l) => l.url && String(l.url).trim());
}
