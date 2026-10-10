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
export async function signUpProfile({ name, email, phone, password }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim(), phone: (phone || "").trim() } },
  });
  if (error) {
    if (/already registered/i.test(error.message)) {
      throw new Error("That email already has a profile. Please sign in instead.");
    }
    throw new Error(error.message);
  }
  if (!data.session) {
    throw new Error("Your profile was created but needs email confirmation. Turn off 'Confirm email' in Supabase → Authentication → Providers → Email.");
  }
  return data.session;
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
    .select("id, order_no, kind, status, subtotal, discount, shipping_fee, total, placed_at, paid_at, order_items(id, item_type, product_id, course_id, bundle_id, name, unit_price, quantity, line_total)")
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
