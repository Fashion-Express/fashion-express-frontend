"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { DateInput, Field, NumericInput, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { optionLabel, type ReferenceOption } from "@/lib/api/reference-options";
import { formatMoney } from "@/lib/format/money";
import { recordPaymentAction } from "../../actions";

/**
 * The mockup's "Record customer payment" modal.
 *
 * One amount goes in; the server decides where it lands — oldest finalised sale
 * first (BR-16), each sale touched getting its own real payment row and receipt
 * (BR-18), the whole event grouped under one reference (BR-19). BR-17 caps it
 * at the outstanding total and rejects the entire event if it would exceed,
 * writing nothing — so there is no half-applied state to explain.
 */
export function RecordPayment({
  customerId,
  customerName,
  outstanding,
  methods,
  today,
}: {
  customerId: string;
  customerName: string;
  outstanding: string;
  methods: ReferenceOption[];
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    recordPaymentAction,
    {},
  );

  /**
   * The action refreshes the page underneath on success, so close the dialog to
   * reveal the updated figures. `ok` distinguishes a save from the initial
   * state, which also carries no errors.
   *
   * Adjusted during render on a new result rather than in an effect: an effect
   * would paint the dialog once more before closing it.
   */
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Record payment</Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record customer payment"
        width="md"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={customerId} />

          {state.formError && <Alert tone="danger">{state.formError}</Alert>}

          <div className="flex items-center justify-between rounded-control bg-subtle px-3.5 py-3">
            <span className="text-[12px] text-muted">Customer: {customerName}</span>
            <span className="font-mono text-[12px] font-semibold text-danger">
              Due {formatMoney(outstanding)}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="amount" label="Amount" required error={state.fieldErrors?.amount}>
              {(props) => (
                <NumericInput
                  {...props}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
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
              {(props) => <DateInput {...props} defaultValue={today} />}
            </Field>
          </div>

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
                  <option key={method.id} value={method.id}>
                    {optionLabel(method)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="notes" label="Details (optional)" error={state.fieldErrors?.notes}>
            {(props) => <Textarea {...props} rows={2} placeholder="Payment details" />}
          </Field>

          <p className="text-[11.5px] leading-relaxed text-faint">
            The amount is applied to the oldest unpaid invoice first, and cannot exceed
            the total due.
          </p>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">Save payment</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
