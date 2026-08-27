"use server";

import { getDeletionImpact, type DeletionImpact } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/errors";
import { can, requireSession } from "@/lib/auth/session";

/**
 * FR-03.6.1 — read on demand when the dialog opens rather than with the page.
 * It is only needed by the small fraction of visits that consider deleting,
 * and it is an extra query against the sales tables.
 */
export async function loadDeletionImpact(
  customerId: string,
): Promise<{ impact: DeletionImpact } | { error: string }> {
  const me = await requireSession();
  if (!can(me, "delete_customer")) {
    return { error: "You do not have permission to delete a customer." };
  }

  try {
    return { impact: await getDeletionImpact(customerId) };
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not check what this would remove.",
    };
  }
}
