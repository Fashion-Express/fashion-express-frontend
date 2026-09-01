"use server";

import { getCustomer, getPaymentBatch, type PaymentBatch } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/errors";
import { can, requireSession } from "@/lib/auth/session";

/**
 * BR-19's combined receipt for one payment event, read when its row is opened.
 *
 * `GET /customer-payments/:batchRef` is keyed on a globally unique reference
 * and is NOT customer-scoped — it answers for any batch the reference names.
 * So the batch is matched against the customer whose page asked for it, using
 * that customer's number read here rather than one passed in from the browser.
 * Without it, a hand-made POST with someone else's reference would render
 * their name, total and sale numbers under this customer's header.
 *
 * A mismatch answers the same "no such reference" as a reference that does not
 * exist: which batches belong to which customer is not something to leak
 * either.
 */
export async function loadPaymentBatch(
  customerId: string,
  batchRef: string,
): Promise<{ batch: PaymentBatch } | { error: string }> {
  const me = await requireSession();
  if (!can(me, "view_customer")) {
    return { error: "You do not have permission to view this receipt." };
  }

  try {
    const [customer, batch] = await Promise.all([
      getCustomer(customerId),
      getPaymentBatch(batchRef),
    ]);

    if (batch.customer_number !== customer.customer_id) {
      return { error: "No such payment reference." };
    }

    return { batch };
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not load this payment reference.",
    };
  }
}
