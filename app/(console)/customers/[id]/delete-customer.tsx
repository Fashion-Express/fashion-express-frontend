"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { DeletionImpact } from "@/lib/api/customers";
import { formatMoney } from "@/lib/format/money";
import { deleteCustomerAction } from "../actions";
import { loadDeletionImpact } from "./impact-action";

/**
 * FR-03.6.1 — the impact is fetched BEFORE the delete is offered, not after it
 * is clicked. Deleting a customer cascades to their sales, line items,
 * payments, batches and allocations (BR-21): no orphaned financial record may
 * survive its customer. The user has to see what that costs.
 *
 * The mockup has a plain Delete button here; this is the step it is missing.
 */
export function DeleteCustomer({
  customerId,
  name,
  variant = "danger",
}: {
  customerId: string;
  name: string;
  /** `ghost` for a table row, where a filled danger button shouts. */
  variant?: "danger" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteCustomerAction,
    {},
  );

  function open_() {
    setOpen(true);
    setImpact(null);
    setLoadError(null);

    startLoading(async () => {
      const result = await loadDeletionImpact(customerId);
      if ("error" in result) setLoadError(result.error);
      else setImpact(result.impact);
    });
  }

  const destroys =
    impact && (impact.sales > 0 || impact.salePayments > 0 || impact.paymentBatches > 0);

  return (
    <>
      <Button
        variant={variant}
        size={variant === "ghost" ? "sm" : "md"}
        onClick={open_}
      >
        Delete
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete this customer?" width="md">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        {loading && <p className="text-[12.5px] text-muted">Checking what this would remove…</p>}

        {loadError && <Alert tone="danger">{loadError}</Alert>}

        {impact && (
          <div className="flex flex-col gap-4">
            <p className="text-[12.5px] leading-relaxed text-muted">
              <strong className="text-ink">{name}</strong> ({impact.customer.customer_id})
              will be removed permanently, and so will everything below. This cannot be
              undone.
            </p>

            {destroys ? (
              <div className="overflow-hidden rounded-control border border-danger/25">
                <dl className="divide-y divide-line text-[12.5px]">
                  <Row label="Sales" value={String(impact.sales)} />
                  <Row label="Sale payments" value={String(impact.salePayments)} />
                  <Row label="Payment batches" value={String(impact.paymentBatches)} />
                  <Row label="Total invoiced" value={formatMoney(impact.totalInvoiced)} />
                  <Row label="Total received" value={formatMoney(impact.totalReceived)} />
                </dl>
              </div>
            ) : (
              <Alert tone="info">
                This customer has no sales or payments recorded, so nothing else is lost.
              </Alert>
            )}

            <p className="text-[11.5px] leading-relaxed text-faint">
              Totals cover finalized sales only — drafts and quotations are excluded from
              every figure in the system.
            </p>

            <form action={formAction} className="flex justify-end gap-2.5">
              <input type="hidden" name="id" value={customerId} />
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton variant="danger" pendingLabel="Deleting…">
                Delete permanently
              </SubmitButton>
            </form>
          </div>
        )}
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-danger-bg/40 px-3.5 py-2.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-mono font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}
