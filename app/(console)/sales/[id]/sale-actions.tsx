"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import {
  DateInput,
  Field,
  Input,
  NumericInput,
  Select,
  Textarea,
} from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format/money";
import {
  addSaleItemAction,
  convertQuotationAction,
  deleteSaleAction,
  deleteSalePaymentAction,
  finalizeSaleAction,
  recordSalePaymentAction,
  removeSaleItemAction,
  updateSalePaymentAction,
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

/**
 * FR-02.7 — correcting a receipt: amount, date, method and notes.
 *
 * The method list is the `customer`-scoped one, so a supplier-only method such
 * as LC is never offered here (BR-62). The API re-checks it regardless.
 */
export function EditSalePayment({
  paymentId,
  receiptNumber,
  amount,
  paymentDate,
  methodId,
  methods,
  notes,
}: {
  paymentId: string;
  receiptNumber: string;
  amount: string;
  paymentDate: string;
  methodId: string;
  methods: Array<{ id: string; label: string }>;
  notes: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateSalePaymentAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${receiptNumber}`}
        width="md"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="paymentId" value={paymentId} />

          {state.formError && <Alert tone="danger">{state.formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="amount" label="Amount" required error={state.fieldErrors?.amount}>
              {(props) => (
                <NumericInput
                  {...props}
                  step="0.01"
                  min="0"
                  defaultValue={amount}
                  autoFocus
                />
              )}
            </Field>

            <Field
              name="paymentDate"
              label="Payment date"
              required
              error={state.fieldErrors?.paymentDate}
            >
              {(props) => <DateInput {...props} defaultValue={paymentDate} />}
            </Field>
          </div>

          <Field
            name="paymentMethodId"
            label="Method"
            required
            error={state.fieldErrors?.paymentMethodId}
          >
            {(props) => (
              <Select {...props} defaultValue={methodId}>
                {methods.length === 0 && <option value="">No methods configured</option>}
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="notes" label="Details (optional)" error={state.fieldErrors?.notes}>
            {(props) => (
              <Textarea {...props} rows={2} defaultValue={notes ?? ""} />
            )}
          </Field>

          <p className="text-[11.5px] leading-relaxed text-faint">
            Total payments may not exceed the sale value, so raising this amount past
            the balance is refused. If this receipt came from a customer lump sum, its
            combined receipt is re-totalled to match.
          </p>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Deleting a receipt reverses its ledger entry, and cannot be undone. */
export function DeleteSalePayment({
  paymentId,
  receiptNumber,
  amount,
  fromBatch,
}: {
  paymentId: string;
  receiptNumber: string;
  amount: string;
  /** Recorded as part of a customer lump sum (BR-19). */
  fromBatch: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteSalePaymentAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Delete
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this payment?"
        width="md"
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{receiptNumber}</strong> for{" "}
          <strong className="text-ink">{formatMoney(amount)}</strong> will be removed and
          its ledger entry reversed. The balance due goes back up by that amount.
        </p>

        {fromBatch && (
          <Alert tone="info">
            This payment was part of a customer lump sum. That reference is re-totalled
            over the invoices it still covers, and is removed entirely if this was the
            last of them.
          </Alert>
        )}

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="paymentId" value={paymentId} />
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete payment
          </SubmitButton>
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

/**
 * FR-02.6 — adding a line to an existing sale.
 *
 * BR-04 — the two kinds are not interchangeable, so the form swaps its middle
 * field rather than showing both: a stocked line names a product, a machine
 * line carries the description that IS the machine.
 *
 * On a FINALISED sale this deducts stock the moment it is saved (BR-13), which
 * is why the dialog says so before the button rather than after the refusal.
 */
export function AddSaleItem({
  saleId,
  products,
  finalized,
}: {
  saleId: string;
  products: Array<{
    id: string;
    label: string;
    unitPrice: string;
    inStock: string;
  }>;
  finalized: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [itemType, setItemType] = useState<"inventory" | "non_inventory">("inventory");
  const [productId, setProductId] = useState("");
  const [state, formAction] = useActionState<ActionState, FormData>(
    addSaleItemAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) {
      setOpen(false);
      setProductId("");
    }
  }

  const chosen = products.find((product) => product.id === productId);

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add item</Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add a line" width="md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={saleId} />

          {state.formError && <Alert tone="danger">{state.formError}</Alert>}

          {finalized && (
            <Alert tone="warning">
              This sale is finalised, so the stock for this line is deducted as soon as
              it is saved. A line that would take stock below zero is refused and
              nothing is written.
            </Alert>
          )}

          <Field name="itemType" label="Line type" required>
            {(props) => (
              <Select
                {...props}
                value={itemType}
                onChange={(event) => {
                  setItemType(event.target.value as "inventory" | "non_inventory");
                  setProductId("");
                }}
              >
                <option value="inventory">Stocked product</option>
                <option value="non_inventory">Machine / one-off</option>
              </Select>
            )}
          </Field>

          {itemType === "inventory" ? (
            <Field
              name="inventoryItemId"
              label="Product"
              required
              error={state.fieldErrors?.inventoryItemId}
              hint={
                chosen
                  ? `${chosen.inStock} in stock · ${formatMoney(chosen.unitPrice)} each`
                  : "Only products held by this sale's shop are offered."
              }
            >
              {(props) => (
                <Select
                  {...props}
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  <option value="">Choose a product…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <Field
              name="description"
              label="Description"
              required
              error={state.fieldErrors?.description}
              hint="A machine line has no product to point at — this is the machine."
            >
              {(props) => <Input {...props} placeholder="Describe what is being sold" />}
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="quantity"
              label="Quantity"
              required
              error={state.fieldErrors?.quantity}
            >
              {(props) => <NumericInput {...props} step="0.001" min="0" placeholder="0" />}
            </Field>

            {itemType === "inventory" && (
              <Field name="boxes" label="Boxes" error={state.fieldErrors?.boxes}>
                {(props) => <NumericInput {...props} step="1" min="0" placeholder="0" />}
              </Field>
            )}

            <Field
              name="unitPrice"
              label={itemType === "inventory" ? "Unit price (optional)" : "Unit price"}
              required={itemType === "non_inventory"}
              error={state.fieldErrors?.unitPrice}
            >
              {(props) => (
                <NumericInput
                  {...props}
                  step="0.01"
                  min="0"
                  placeholder={chosen ? chosen.unitPrice : "0.00"}
                />
              )}
            </Field>
          </div>

          {itemType === "inventory" && (
            <p className="text-[11.5px] leading-relaxed text-faint">
              Leave the price blank to use the product&rsquo;s current selling price. A
              price entered here always wins.
            </p>
          )}

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Adding…">Add line</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
