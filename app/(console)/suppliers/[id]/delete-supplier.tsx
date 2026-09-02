"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { deleteSupplierAction } from "../actions";

/**
 * Deleting a supplier CASCADES to its purchases and their payments — that
 * history belongs to the supplier. The purchase count is already on the record,
 * so the cost of the deletion can be stated without another call.
 */
export function DeleteSupplier({
  supplierId,
  name,
  purchaseCount,
  variant = "danger",
}: {
  supplierId: string;
  name: string;
  purchaseCount: string;
  /** `ghost` for a table row, where a filled danger button shouts. */
  variant?: "danger" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteSupplierAction,
    {},
  );

  const count = Number(purchaseCount);

  return (
    <>
      <Button
        variant={variant}
        size={variant === "ghost" ? "sm" : "md"}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete this supplier?">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{name}</strong> will be removed permanently.
          {count > 0 ? (
            <>
              {" "}
              This also deletes {count} {count === 1 ? "purchase" : "purchases"} and every
              payment recorded against them.
            </>
          ) : (
            " No purchases are recorded against them."
          )}{" "}
          This cannot be undone.
        </p>

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={supplierId} />
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">Delete supplier</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
