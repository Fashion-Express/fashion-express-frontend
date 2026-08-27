"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { Field, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format/money";
import { approveClaimAction, rejectClaimAction } from "../actions";

/**
 * BR-36 — approving is ONE action and all of it happens or none of it does: the
 * claim is marked approved, the reviewer and date are recorded, an expense is
 * created dated to the BILL date with the employee as payee, and the two are
 * linked. The dialog says so, because "Approve" alone does not suggest that a
 * financial record is about to be written.
 */
export function ReviewClaim({
  claimId,
  employee,
  description,
  amount,
  categories,
}: {
  claimId: string;
  employee: string;
  description: string;
  amount: string;
  categories: Array<{ id: string; label: string }>;
}) {
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [approveState, approveAction] = useActionState<ActionState, FormData>(
    approveClaimAction,
    {},
  );
  const [rejectState, rejectAction] = useActionState<ActionState, FormData>(
    rejectClaimAction,
    {},
  );

  const state = mode === "reject" ? rejectState : approveState;

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setMode(null);
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button size="sm" onClick={() => setMode("approve")}>Approve</Button>
        <Button variant="danger" size="sm" onClick={() => setMode("reject")}>Reject</Button>
      </div>

      <Modal
        open={mode === "approve"}
        onClose={() => setMode(null)}
        title="Approve this claim?"
        width="md"
      >
        <form action={approveAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={claimId} />

          {approveState.formError && <Alert tone="danger">{approveState.formError}</Alert>}

          <div className="flex items-center justify-between rounded-control bg-subtle px-3.5 py-3">
            <span className="text-[12px] text-muted">{employee} — {description}</span>
            <span className="font-mono text-[13px] font-semibold text-ink">
              {formatMoney(amount)}
            </span>
          </div>

          <Alert tone="info">
            Approving posts this to expenses automatically — dated to the bill date, with{" "}
            {employee} as the payee — and links the two so either can be traced from the
            other.
          </Alert>

          <Field
            name="expenseCategoryId"
            label="Expense category"
            hint="Optional — defaults to the reimbursement category."
          >
            {(props) => (
              <Select {...props} defaultValue="">
                <option value="">Use the default</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
            <SubmitButton pendingLabel="Approving…">Approve and post</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={mode === "reject"}
        onClose={() => setMode(null)}
        title="Reject this claim?"
      >
        {rejectState.formError && <Alert tone="danger">{rejectState.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{description}</strong> from {employee} will be
          marked rejected. No expense is created. A claim is processed once — this cannot
          be changed afterwards.
        </p>

        <form action={rejectAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={claimId} />
          <Button variant="outline" onClick={() => setMode(null)}>Cancel</Button>
          <SubmitButton variant="danger" pendingLabel="Rejecting…">Reject claim</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
