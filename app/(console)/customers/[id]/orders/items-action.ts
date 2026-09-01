"use server";

import { ApiError } from "@/lib/api/errors";
import { listSaleItems, type SaleItem } from "@/lib/api/sales";
import { can, requireSession } from "@/lib/auth/session";

/**
 * The lines of one order, read when its row is expanded rather than with the
 * page. A customer with a long history would otherwise cost one request per
 * order on every visit, to render detail most visits never open.
 *
 * Re-checks the session and the permission because a Server Action is reachable
 * by direct POST, not only through the row that renders it.
 */
export async function loadSaleItems(
  saleId: string,
): Promise<{ items: SaleItem[] } | { error: string }> {
  const me = await requireSession();
  if (!can(me, "view_sale")) {
    return { error: "You do not have permission to view this order." };
  }

  try {
    return { items: await listSaleItems(saleId) };
  } catch (error) {
    // BR-01 — a sale outside this user's scope answers 404, not 403. Said as
    // "not available" rather than "does not exist": the row naming it is on
    // screen, so claiming it is gone would only confuse.
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not load the items on this order.",
    };
  }
}
