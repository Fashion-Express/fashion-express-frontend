"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { formatMoney, isZero } from "@/lib/format/money";
import { deletePurchaseAction } from "../../../actions";

/**
 * Deleting a purchase is irreversible, and it is not only the purchase that
 * goes: its payments cascade, and their ledger debits with them (BR-40). Where
 * money has already been paid, that is a real amount leaving the books, so the
 * dialog says how much rather than asking a bare "are you sure".
 */
export function DeletePurchase({
  purchaseId,
  productName,
  price,
  paid,
  variant = "ghost",
}: {
  purchaseId: string;
  productName: string;
  price: string;
  paid: string;
  variant?: "ghost" | "danger";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    deletePurchaseAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  const wasPaid = !isZero(paid);

  return (
    <>
      <Button
        variant={variant}
        size={variant === "ghost" ? "sm" : "md"}
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this purchase?"
        width="md"
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{productName}</strong> at{" "}
          <strong className="text-ink">{formatMoney(price)}</strong> will be removed
          permanently. This cannot be undone.
        </p>

        {wasPaid && (
          <Alert tone="danger">
            {formatMoney(paid)} has already been paid against this purchase. Every
            receipt recorded against it is deleted too, and the matching ledger debits
            are reversed — the money leaves the books with the purchase.
          </Alert>
        )}

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="purchaseId" value={purchaseId} />
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete purchase
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
