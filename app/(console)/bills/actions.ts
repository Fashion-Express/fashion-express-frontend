"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  approveBillClaim,
  createBillClaim,
  deleteBillClaim,
  rejectBillClaim,
} from "@/lib/api/bill-claims";
import { ATTACHMENT_EXTENSIONS, hasAllowedExtension } from "@/lib/api/attachments";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";
import { isPositive, parseMoneyInput } from "@/lib/format/money";

const schema = z.object({
  description: z.string().min(1, "Describe what this expense was for."),
  billDate: z.string().min(1, "Choose the date on the bill."),
});

/**
 * FR-07.1.1 — the status is set by the WORKFLOW and is never typed or chosen.
 * There is no field for it on any request, and so none on this form.
 */
export async function submitClaimAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "submit_bill")) {
    return { formError: "You do not have permission to submit a bill claim." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount || !isPositive(amount)) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }

  const parsed = schema.safeParse({
    description: required(formData, "description"),
    billDate: required(formData, "billDate"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const attachment = formData.get("attachment");
  const hasFile = attachment instanceof File && attachment.size > 0;

  if (hasFile) {
    // BR-34 — a fixed extension whitelist, checked here so the user is told
    // before the upload rather than after it has crossed the wire. The server
    // checks again regardless; this is courtesy, not enforcement.
    if (!hasAllowedExtension(attachment.name)) {
      return {
        fieldErrors: {
          attachment: `That file type is not accepted. Allowed: ${ATTACHMENT_EXTENSIONS.join(", ")}`,
        },
      };
    }
  }

  // Rebuilt rather than forwarded, so only the fields the API expects are sent
  // — a stray field would be a 400 under the whitelist validation pipe.
  const payload = new FormData();
  payload.set("amount", amount);
  payload.set("description", parsed.data.description);
  payload.set("billDate", parsed.data.billDate);
  if (hasFile) payload.set("attachment", attachment);

  try {
    await createBillClaim(payload);
  } catch (error) {
    return toActionState(error);
  }

  redirect("/bills");
}

/** Only on your own, still-pending claim — a reviewed claim is part of the
 * expense record now. */
export async function withdrawClaimAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "submit_bill")) {
    return { formError: "You do not have permission to withdraw this claim." };
  }

  try {
    await deleteBillClaim(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/**
 * BR-36 — one action, all of it or none: the claim is marked approved, the
 * reviewer and date recorded, an EXPENSE created dated to the BILL date with
 * the employee as payee, and the two linked.
 *
 * BR-35 — an already-processed claim cannot be processed again, in either
 * direction. Two reviewers acting at once cannot both see it as pending; the
 * loser gets a readable sentence rather than a constraint violation.
 */
export async function approveClaimAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "review_bills")) {
    return { formError: "You do not have permission to review bill claims." };
  }

  try {
    await approveBillClaim(
      required(formData, "id"),
      // Optional: defaults to the reimbursement category.
      text(formData, "expenseCategoryId"),
    );
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/** BR-37 — records the reviewer and the date, and creates no expense. */
export async function rejectClaimAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "review_bills")) {
    return { formError: "You do not have permission to review bill claims." };
  }

  try {
    await rejectBillClaim(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
