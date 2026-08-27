"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { DateInput, Field, Input, NumericInput, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format/money";

export type MethodOption = { id: string; label: string; code: string };

/**
 * One dialog for both payment paths, because the fields and the rules are the
 * same — only the target differs:
 *
 *   against a purchase  → BR-30 caps it at that purchase's remaining due
 *   against a supplier  → BR-31 allocates oldest purchase first, and caps it at
 *                         the supplier's total outstanding
 *
 * BR-29 — a reference number is mandatory for every method except cash. The
 * rule fails CLOSED on the server (anything not `cash` demands a trace), so the
 * field is required here the moment a non-cash method is chosen rather than
 * after a round trip that loses the typing.
 */
export function PaymentDialog({
  action,
  trigger,
  title,
  targetLabel,
  outstanding,
  methods,
  today,
  hiddenName,
  hiddenValue,
  allocationNote,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  trigger: string;
  title: string;
  targetLabel: string;
  outstanding: string;
  methods: MethodOption[];
  today: string;
  hiddenName: string;
  hiddenValue: string;
  allocationNote?: string;
}) {
  const [open, setOpen] = useState(false);
  /**
   * Mirrors the select only so the reference hint can react to it. The select
   * itself is UNCONTROLLED: the DOM value is what gets submitted, so what the
   * user sees selected is always what is sent. A controlled value can drift
   * from the DOM across a re-render — and drifting here would mean warning
   * about the wrong payment method.
   */
  const [methodId, setMethodId] = useState(methods[0]?.id ?? "");
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  const chosen = methods.find((method) => method.id === methodId);
  const needsReference = Boolean(chosen && chosen.code !== "cash");

  return (
    <>
      <Button onClick={() => setOpen(true)}>{trigger}</Button>

      <Modal open={open} onClose={() => setOpen(false)} title={title} width="md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name={hiddenName} value={hiddenValue} />

          {state.formError && <Alert tone="danger">{state.formError}</Alert>}

          <div className="flex items-center justify-between rounded-control bg-subtle px-3.5 py-3">
            <span className="text-[12px] text-muted">{targetLabel}</span>
            <span className="font-mono text-[12px] font-semibold text-danger">
              Due {formatMoney(outstanding)}
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

          <Field
            name="paymentMethodId"
            label="Method"
            required
            error={state.fieldErrors?.paymentMethodId}
          >
            {(props) => (
              <Select
                {...props}
                defaultValue={methods[0]?.id ?? ""}
                onChange={(event) => setMethodId(event.target.value)}
              >
                {methods.length === 0 && <option value="">No supplier methods configured</option>}
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            name="referenceNumber"
            label="Reference number"
            required={needsReference}
            error={state.fieldErrors?.referenceNumber}
            hint={
              needsReference
                ? `${chosen?.label} is a traceable instrument — the reference is the trace.`
                : "Cash needs no reference."
            }
          >
            {(props) => (
              <Input
                {...props}
                className="font-mono"
                placeholder={needsReference ? "LC-99881" : "Not required for cash"}
              />
            )}
          </Field>

          {allocationNote && (
            <p className="text-[11.5px] leading-relaxed text-faint">{allocationNote}</p>
          )}

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton pendingLabel="Saving…">Save payment</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
