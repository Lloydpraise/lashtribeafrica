import { createClient } from "npm:@supabase/supabase-js@2";
import { evaluatePayment, getToken, getTransactionStatus, type PesapalConfig } from "./pesapal.ts";

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// deno-lint-ignore no-explicit-any
type Db = any;

export interface PaymentRow {
  id: string;
  order_id: string;
  merchant_reference: string;
  order_tracking_id: string | null;
  amount: number | string;
  currency: string;
  status: string;
}

/**
 * Asks Pesapal what happened to a payment attempt and records it. Safe to call any number of times, from the
 * notification (IPN) and from the customer's return page: a payment that is already paid is left alone, and
 * marking an order paid again changes nothing. Nothing is trusted from the request itself, only from Pesapal's
 * own answer to GetTransactionStatus.
 */
export async function settlePayment(db: Db, cfg: PesapalConfig, payment: PaymentRow): Promise<string> {
  if (payment.status === "paid") return "paid";
  if (!payment.order_tracking_id) return payment.status;

  const token = await getToken(cfg);
  const status = await getTransactionStatus(cfg, token, payment.order_tracking_id);
  const verdict = evaluatePayment(status, {
    reference: payment.merchant_reference,
    amount: Number(payment.amount),
    currency: payment.currency,
  });

  let finalStatus: string = verdict.outcome;
  let note: string | null = "reason" in verdict ? verdict.reason : null;

  if (verdict.outcome === "paid") {
    const { data: order, error: orderErr } = await db.from("orders").select("status").eq("id", payment.order_id).single();
    if (orderErr) throw orderErr;
    if (order.status === "cancelled" || order.status === "refunded") {
      // Money arrived for an order that was already closed: don't reopen it, flag it for a person.
      finalStatus = "mismatch";
      note = `Payment received for an order marked ${order.status}. Reopen the order or refund it in Pesapal.`;
    } else {
      // Mark the order paid first: if this fails the payment stays pending and the next notification retries it.
      const { error } = await db.rpc("admin_set_order_status", {
        p_order: payment.order_id,
        p_status: "paid",
        p_method: "pesapal",
        p_ref: (status.confirmation_code as string) || payment.order_tracking_id,
      });
      if (error) throw error;
    }
  }

  const patch: Record<string, unknown> = {
    status: finalStatus,
    payment_method: status.payment_method ?? null,
    confirmation_code: status.confirmation_code ?? null,
    raw_status: status,
    note,
  };
  if (finalStatus === "paid") patch.paid_at = new Date().toISOString();
  const { error: updateErr } = await db.from("payments").update(patch).eq("id", payment.id);
  if (updateErr) throw updateErr;
  return finalStatus;
}
