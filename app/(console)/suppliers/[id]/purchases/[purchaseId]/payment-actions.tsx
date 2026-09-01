"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { DateInput, Field, Input, NumericInput, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { PurchasePayment } from "@/lib/api/suppliers";
import { formatMoney } from "@/lib/format/money";
import type { MethodOption } from "../../payment-form";
import {
  deletePurchasePaymentAction,
  updatePurchasePaymentAction,
} from "../../../actions";

/**
 * FR-05.5 — correcting a receipt.
 *
 * The method list is the `supplier`-scoped one (BR-62), so a customer-only
 * method is never offered here. BR-29 is enforced by the API against the values
 * the row ends up with; the form mirrors it live so the user is told before
 * submitting rather than after.
 */
export function EditPurchasePayment({
  payment,
  methods,
}: {
  payment: PurchasePayment;
  methods: MethodOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    updatePurchasePaymentAction,
    {},
  );

  /*
   * Uncontrolled everywhere else in this codebase, but BR-29's requirement
   * depends on which method is selected, so this one field has to be watched to
   * label the reference box correctly as it changes.
   */
  const [methodId, setMethodId] = useState(() => currentMethodId(payment, methods));
  const chosen = methods.find((method) => method.id === methodId);
  const needsReference = Boolean(chosen && chosen.code !== "cash");

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
        title={`Edit ${payment.receipt_number}`}
        width="md"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="paymentId" value={payment.id} />

          {state.formError && <Alert tone="danger">{state.formError}</Alert>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="amount" label="Amount" required error={state.fieldErrors?.amount}>
              {(props) => (
                <NumericInput
                  {...props}
                  step="0.01"
                  min="0"
                  defaultValue={payment.amount}
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
              {(props) => <DateInput {...props} defaultValue={payment.payment_date} />}
            </Field>
          </div>

          <Field
            name="paymentMethodId"
            label="Method"
            required
            error={state.fieldErrors?.paymentMethodId}
          >
            {(props) => (
              <Select
                {...props}
                defaultValue={methodId}
                onChange={(event) => setMethodId(event.target.value)}
              >
                {methods.length === 0 && <option value="">No methods configured</option>}
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            name="referenceNumber"
            label={needsReference ? "Reference number" : "Reference number (optional)"}
            required={needsReference}
            error={state.fieldErrors?.referenceNumber}
            hint={
              needsReference
                ? "Required for every method but cash, so the payment can be traced."
                : undefined
            }
          >
            {(props) => (
              <Input {...props} defaultValue={payment.reference_number ?? ""} />
            )}
          </Field>

          <Field name="notes" label="Notes (optional)" error={state.fieldErrors?.notes}>
            {(props) => <Textarea {...props} rows={2} defaultValue={payment.notes ?? ""} />}
          </Field>

          <p className="text-[11.5px] leading-relaxed text-faint">
            Total payments may not exceed the purchase price, so raising this amount
            past the balance is refused.
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

/**
 * The payment row carries its method's CODE, not its id. Matching on the code
 * is what lets the picker open on the method already recorded.
 */
function currentMethodId(payment: PurchasePayment, methods: MethodOption[]): string {
  return (
    methods.find((method) => method.code === payment.method_code)?.id ??
    methods[0]?.id ??
    ""
  );
}

/** Removing a receipt reverses its ledger debit and reopens the amount due. */
export function DeletePurchasePayment({ payment }: { payment: PurchasePayment }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    deletePurchasePaymentAction,
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
          <strong className="text-ink">{payment.receipt_number}</strong> for{" "}
          <strong className="text-ink">{formatMoney(payment.amount)}</strong> will be
          removed and its ledger entry reversed. The amount due on this purchase goes
          back up by that much.
        </p>

        <form action={formAction} className="flex justify-end gap-2.5 pt-1">
          <input type="hidden" name="paymentId" value={payment.id} />
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
