"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { deleteInventoryAction } from "../../actions";

/**
 * BR-27 — a product that has ever appeared on a sale cannot be deleted, because
 * doing so would destroy the sale's record of what was actually shipped. The
 * API decides that and says how many lines are in the way; the message is shown
 * as it stands rather than guessed at here.
 */
export function DeleteItem({ itemId, name }: { itemId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteInventoryAction,
    {},
  );

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete this product?">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{name}</strong> and its whole movement history
          will be removed. A product that has appeared on any sale cannot be deleted.
        </p>

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={itemId} />
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">Delete product</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
