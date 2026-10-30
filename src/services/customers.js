// Customer-side data layer: profile (login), orders, course progress, certificates.
// Needs migration 0011. Everything here runs with the visitor's own session, so
// row-level security only ever returns their own rows.

import { supabase } from "./service.js";

export const HAS_DB = Boolean(import.meta.env.PUBLIC_SUPABASE_URL && import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

export function formatKsh(value) {
  return `Ksh ${Number(value || 0).toLocaleString()}`;
}

// ---------- auth / profile ----------
let authBridgeStarted = false;

/** Lets plain scripts (checkout, academy) react to sign-in / sign-out without importing React. */
export function startAuthBridge() {
  if (authBridgeStarted || !HAS_DB || typeof window === "undefined") return;
  authBridgeStarted = true;
  startCartSync();
  supabase.auth.onAuthStateChange((event, session) => {
    window.dispatchEvent(new CustomEvent("lashtribe:auth-changed", { detail: { event, session } }));
  });
}

export async function getSession() {
  if (!HAS_DB) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}

export async function signInProfile(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
  return data.session;
}

/** Creates the login. The database trigger links it to any earlier guest orders (same email or phone). */
export async function signUpProfile({ name, email, phone, password, marketing = false }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim(), phone: (phone || "").trim(), marketing_pref: Boolean(marketing) } },
  });
  if (error) {
    if (/already registered/i.test(error.message)) {
      throw new Error("That email already has a profile. Please sign in instead.");
    }
    throw new Error(error.message);
  }
  if (!data.session) {
    // "Confirm email" is on: Supabase has emailed a 6-digit code. The caller shows a box to type it in.
    rememberPendingVerify(email.trim());
    const wait = new Error("We emailed you a 6-digit code. Enter it to finish creating your profile.");
    wait.needsCode = true;
    wait.email = email.trim();
    throw wait;
  }
  if (marketing) await setMyMarketing(true);
  return data.session;
}

// ---------- email confirmation code (OTP) ----------
const VERIFY_KEY = "lashtribe_verify_email";
export function rememberPendingVerify(email) {
  try { sessionStorage.setItem(VERIFY_KEY, email); } catch { /* storage blocked */ }
}
export function pendingVerifyEmail() {
  try { return sessionStorage.getItem(VERIFY_KEY) || ""; } catch { return ""; }
}
export function clearPendingVerify() {
  try { sessionStorage.removeItem(VERIFY_KEY); } catch { /* storage blocked */ }
}

/** Confirms the 6-digit code from the sign-up email and signs the person in. */
export async function verifySignupCode(email, token) {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: String(token).trim(), type: "signup" });
  if (error) {
    throw new Error(/expired|invalid/i.test(error.message) ? "That code isn't right or has expired. Check it, or ask for a new one." : error.message);
  }
  clearPendingVerify();
  // the "email me offers" tick from the sign-up form is applied now that the profile exists
  if (data.session?.user?.user_metadata?.marketing_pref) await setMyMarketing(true).catch(() => {});
  return data.session;
}

export async function resendSignupCode(email) {
  const { error } = await supabase.auth.resend({ type: "signup", email: email.trim() });
  if (error) throw new Error(error.message);
}

/** The customer's own "email me about offers" choice. Never set for them, only by them. */
export async function setMyMarketing(optIn) {
  const { error } = await supabase.rpc("set_my_marketing", { p_opt_in: Boolean(optIn) });
  if (error) throw new Error(error.message);
}

// ---------- saved cart, for abandoned-cart reminders (signed-in shoppers only) ----------
let cartSyncStarted = false;
let cartTimer;
async function pushCart(userAction) {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;
    const cart = window.LashtribeCart?.getCart?.() || {};
    // signing in on a new device with an empty cart must not wipe the cart saved from another one
    if (!userAction && !Object.keys(cart).length) return;
    await supabase.rpc("save_cart", { p_cart: cart });
  } catch { /* reminders are a nicety: never get in the shopper's way */ }
}
export function startCartSync() {
  if (cartSyncStarted || !HAS_DB || typeof window === "undefined") return;
  cartSyncStarted = true;
  window.addEventListener("lashtribe:cart-updated", () => {
    clearTimeout(cartTimer);
    cartTimer = setTimeout(() => pushCart(true), 2500);
  });
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") setTimeout(() => pushCart(false), 1500);
  });
  setTimeout(() => pushCart(false), 3000);
}

export async function signOutProfile() {
  await supabase.auth.signOut();
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/profile`,
  });
  if (error) throw new Error(error.message);
}

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function fetchMyCustomer() {
  const { data, error } = await supabase.from("customers").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMyProfile({ name, phone, area, marketing }) {
  const { data, error } = await supabase.rpc("update_my_profile", {
    p_name: name,
    p_phone: phone,
    p_area: area,
    p_marketing: marketing,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ---------- first-visit welcome ----------
const WELCOME_KEY = "lashtribe_welcomed_v1";
const readWelcomed = () => {
  try { return JSON.parse(localStorage.getItem(WELCOME_KEY) || "{}"); } catch { return {}; }
};

export const firstNameOf = (fullName) => String(fullName || "").trim().split(/\s+/)[0] || "";

/** True once this profile has seen the welcome screen (remembered on the account, so it follows
 *  them across devices, and in this browser as a backup). */
export function hasBeenWelcomed(session) {
  if (session?.user?.user_metadata?.academy_welcomed === true) return true;
  return Boolean(session?.user?.id && readWelcomed()[session.user.id]);
}

export async function markWelcomed(userId) {
  if (userId) {
    const all = readWelcomed();
    all[userId] = Date.now();
    try { localStorage.setItem(WELCOME_KEY, JSON.stringify(all)); } catch { /* storage blocked */ }
  }
  try {
    // merges into the account's metadata; name and phone are kept
    await supabase.auth.updateUser({ data: { academy_welcomed: true } });
  } catch (err) {
    console.warn("Couldn't save the welcome flag", err?.message || err);
  }
}

// ---------- orders ----------
/**
 * items: [{ type: 'product'|'course'|'bundle', id, qty }]
 * Prices come from the database, not from here.
 * PAYMENT HOOK: after this resolves the order is 'pending'. M-Pesa / Pesapal should start
 * here (listen for the "lashtribe:order-placed" event or call your payment function with
 * result.order_id) and mark the order paid with the admin_set_order_status() function.
 */
/** @param {{ customer: any, items: any, notes?: string | null, paymentMethod?: string | null }} args */
export async function placeOrder({ customer, items, notes, paymentMethod }) {
  const { data, error } = await supabase.rpc("place_order", {
    p_customer: customer,
    p_items: items,
    p_notes: notes || null,
    p_payment_method: paymentMethod || null,
  });
  if (error) throw new Error(error.message);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lashtribe:order-placed", { detail: data }));
  }
  return data;
}

export async function fetchMyOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_no, kind, status, subtotal, discount, shipping_fee, total, placed_at, paid_at, order_items(id, item_type, product_id, course_id, bundle_id, name, unit_price, quantity, line_total, selected_options, price_tier)")
    .order("placed_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------- courses + certificates ----------
export async function fetchMyCourses() {
  const { data, error } = await supabase
    .from("customer_course_progress")
    .select("*")
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchMyCertificates() {
  const { data, error } = await supabase
    .from("course_certificates")
    .select("*")
    .order("issued_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Issues the certificate if every lesson is complete; returns the existing one otherwise. */
export async function issueCertificate(courseId) {
  const { data, error } = await supabase.rpc("issue_certificate", { p_course: courseId });
  if (error) throw new Error(error.message);
  return data;
}

export async function verifyCertificate(code) {
  const { data, error } = await supabase.rpc("verify_certificate", { p_code: code });
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}
