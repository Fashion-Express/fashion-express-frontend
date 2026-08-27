import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Paginated } from "./types";

export { ATTACHMENT_ACCEPT, ATTACHMENT_EXTENSIONS } from "./attachments";

/**
 * FR-07. Staff claim money they spent on the company's behalf; a manager
 * approves or rejects; approval writes the expense automatically.
 *
 * Three states (RD-08): pending → approved or rejected. The status is set by the
 * workflow and is never typed or chosen (FR-07.1.1) — there is no field for it
 * on any request, and so none on any form here.
 *
 * Scope follows the CALLER's permissions, not the URL: `view_my_bills` sees
 * their own, `review_bills` sees everyone's. There is no parameter to change to
 * see someone else's.
 */
export type BillClaim = {
  id: Id;
  amount: Money;
  description: string;
  bill_date: string;
  status_code: "pending" | "approved" | "rejected";
  status_label: string;
  attachment: string | null;
  approval_date: string | null;
  submitted_by: string;
  approved_by: string | null;
  expense_id: Id | null;
};

/** FR-07.4's three figures, respecting the same scope as the list. */
export type ClaimTotals = {
  pending: Money;
  approved: Money;
  rejected: Money;
  pending_count: string;
};

export type ClaimPage = Paginated<BillClaim> & { totals: ClaimTotals };

export function listBillClaims(
  params: { page?: number; status?: string; search?: string; userId?: Id } = {},
) {
  return apiFetch<ClaimPage>("/bill-claims", {
    query: {
      page: params.page,
      status: params.status,
      search: params.search,
      userId: params.userId,
    },
  });
}

export function getBillClaim(id: Id) {
  return apiFetch<BillClaim>(`/bill-claims/${id}`);
}

/**
 * Submitted as multipart when a document is attached, so the file streams
 * straight through rather than being buffered into JSON.
 *
 * The stored name is GENERATED, never the uploaded one — a caller-supplied
 * filename is a caller-supplied path. Files live outside the executable path
 * (NFR-11) and come back through `GET /bill-claims/:id/attachment`.
 */
export function createBillClaim(form: FormData) {
  return apiFetch<BillClaim>("/bill-claims", { method: "POST", body: form });
}

export function updateBillClaim(id: Id, form: FormData) {
  return apiFetch<BillClaim>(`/bill-claims/${id}`, { method: "PATCH", body: form });
}

/** Only on your own, still-pending claim. A reviewed claim is part of the
 * expense record now and can no longer be edited or withdrawn. */
export function deleteBillClaim(id: Id) {
  return apiFetch<void>(`/bill-claims/${id}`, { method: "DELETE" });
}

/**
 * BR-36 — one action, all of it or none: the claim is marked approved, the
 * reviewer and date are recorded, an EXPENSE is created dated to the BILL date
 * with the employee as payee, and the two are linked.
 *
 * BR-35 — an already-processed claim cannot be processed again, in either
 * direction. The row is locked during review, so two reviewers acting at once
 * cannot both see it as pending; the loser gets a sentence, not a constraint
 * violation.
 */
export function approveBillClaim(id: Id, expenseCategoryId?: Id) {
  return apiFetch<BillClaim>(`/bill-claims/${id}/approve`, {
    method: "POST",
    body: expenseCategoryId ? { expenseCategoryId } : {},
  });
}

/** BR-37 — records the reviewer and date, and creates no expense. */
export function rejectBillClaim(id: Id) {
  return apiFetch<BillClaim>(`/bill-claims/${id}/reject`, { method: "POST" });
}

export function attachmentUrl(id: Id): string {
  return `/api/download/bill-claims/${id}/attachment`;
}
