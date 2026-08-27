"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { DateInput, Field, Input, NumericInput, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format/money";
import {
  convertQuotationAction,
  deleteSaleAction,
  finalizeSaleAction,
  recordSalePaymentAction,
  removeSaleItemAction,
} from "../actions";

/**
 * Finalising is IRREVERSIBLE: it deducts stock, records a movement against
 * every product naming the sale and the user, and starts the sale counting
 * toward revenue and dues. BR-06 checks every line before deducting any, so a
 * refusal leaves nothing changed — the API's message names exactly what is
 * short, and it is shown verbatim.
 */
export function FinalizeSale({ saleId, total }: { saleId: string; total: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(finalizeSaleAction, {});

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Finalize sale</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Finalize this sale?" width="md">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          This deducts stock for every inventory line, records a movement against each
          product, and starts this sale counting toward revenue and dues.{" "}
          <strong className="text-ink">It cannot be undone.</strong>
        </p>

        <div className="flex items-center justify-between rounded-control bg-subtle px-3.5 py-3">
          <span className="text-[12px] text-muted">Sale total</span>
          <span className="font-mono text-[13px] font-semibold text-ink">
            {formatMoney(total)}
          </span>
        </div>

        <p className="text-[11.5px] leading-relaxed text-faint">
          If any line is short of stock the whole finalisation is refused and nothing
          changes — not even the lines that could have been filled.
        </p>

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={saleId} />
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton pendingLabel="Finalizing…">Finalize</SubmitButton>
        </form>
      </Modal>
    </>
  );
}

/** FR-02.3.1 — a quotation becomes a draft invoice, keeping items and prices. */
export function ConvertQuotation({ saleId }: { saleId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    convertQuotationAction,
    {},
  );

  return (
    <form action={formAction} className="contents">
      <input type="hidden" name="id" value={saleId} />
      <SubmitButton pendingLabel="Converting…">Convert to draft invoice</SubmitButton>
      {state.formError && (
        <span className="text-[11.5px] text-danger">{state.formError}</span>
      )}
    </form>
  );
}

export function RecordSalePayment({
  saleId,
  balanceDue,
  methods,
  today,
}: {
  saleId: string;
  balanceDue: string;
  methods: Array<{ id: string; label: string }>;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    recordSalePaymentAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>+ Add payment</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Record payment" width="md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={saleId} />

          {state.formError && <Alert tone="danger">{state.formError}</Alert>}

          <div className="flex items-center justify-between rounded-control bg-subtle px-3.5 py-3">
            <span className="text-[12px] text-muted">Balance due</span>
            <span className="font-mono text-[12px] font-semibold text-danger">
              {formatMoney(balanceDue)}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="amount" label="Amount" required error={state.fieldErrors?.amount}>
              {(props) => (
                <NumericInput {...props} step="0.01" min="0" placeholder="0.00" autoFocus />
              )}
            </Field>

            <Field name="paymentDate" label="Payment date" required error={state.fieldErrors?.paymentDate}>
              {(props) => <DateInput {...props} defaultValue={today} />}
            </Field>
          </div>

          {/* BR-62 — customer-scoped methods only. */}
          <Field
            name="paymentMethodId"
            label="Method"
            required
            error={state.fieldErrors?.paymentMethodId}
          >
            {(props) => (
              <Select {...props} defaultValue={methods[0]?.id ?? ""}>
                {methods.length === 0 && <option value="">No methods configured</option>}
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="notes" label="Details (optional)" error={state.fieldErrors?.notes}>
            {(props) => <Input {...props} placeholder="Payment details" />}
          </Field>

          <p className="text-[11.5px] leading-relaxed text-faint">
            Part-payments are fine. Each gets its own receipt number and posts a credit to
            the ledger; the total may not exceed the sale value.
          </p>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton pendingLabel="Saving…">Save payment</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * BR-12 — removing a line RETURNS its stock to inventory and records a
 * reversing Adjustment naming the sale. Stock is never silently lost.
 * FR-02.6.2 — if this empties the sale it reverts to draft and its payments are
 * deleted, so no orphaned overpayment remains.
 */
export function RemoveSaleItem({
  saleId,
  itemId,
  label,
  finalized,
  lastLine,
}: {
  saleId: string;
  itemId: string;
  label: string;
  finalized: boolean;
  lastLine: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    removeSaleItemAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Remove</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Remove this line?" width="md">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{label}</strong> will be removed from this sale.
        </p>

        {finalized && (
          <Alert tone="warning">
            The stock this line consumed is returned to inventory and a reversing
            adjustment is recorded against the product.
          </Alert>
        )}

        {finalized && lastLine && (
          <Alert tone="danger">
            This is the last line. Removing it reverts the sale to a draft and deletes its
            payments, so no orphaned overpayment remains.
          </Alert>
        )}

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={saleId} />
          <input type="hidden" name="itemId" value={itemId} />
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton variant="danger" pendingLabel="Removing…">Remove line</SubmitButton>
        </form>
      </Modal>
    </>
  );
}

/** BR-14 — only DRAFT sales may be deleted. */
export function DeleteSale({ saleId, saleNumber }: { saleId: string; saleNumber: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(deleteSaleAction, {});

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Delete</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete this draft?">
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          Draft <strong className="text-ink">{saleNumber}</strong> will be removed
          permanently. Only drafts can be deleted — a finalized sale is part of the
          record.
        </p>

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="id" value={saleId} />
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">Delete draft</SubmitButton>
        </form>
      </Modal>
    </>
  );
}
