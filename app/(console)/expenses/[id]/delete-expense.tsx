"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { deleteExpenseAction } from "../actions";

export function DeleteExpense({
  expenseId,
  description,
  variant = "danger",
}: {
  expenseId: string;
  description: string;
  /** `ghost` for a table row, where a filled danger button shouts. */
  variant?: "danger" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteExpenseAction,
    {},
  );

  return (
    <>
      <Button
        variant={variant}
        size={variant === "ghost" ? "sm" : "md"}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete this expense?">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{description}</strong> will be removed, and so
          will its ledger entry — the balance moves with it. This cannot be undone.
        </p>

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={expenseId} />
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">Delete expense</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
