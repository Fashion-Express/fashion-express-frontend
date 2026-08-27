"use client";

import { useActionState, useState } from "react";
import { DateInput, Field, Input, NumericInput, Select, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { createPurchaseAction } from "../../../actions";
import type { MethodOption } from "../../payment-form";

export function PurchaseForm({
  supplierId,
  methods,
  today,
  cancelHref,
}: {
  supplierId: string;
  methods: MethodOption[];
  today: string;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createPurchaseAction,
    {},
  );
  const [methodId, setMethodId] = useState("");
  const [payingAmount, setPayingAmount] = useState("");

  const chosen = methods.find((method) => method.id === methodId);
  const paying = payingAmount.trim() !== "" && Number(payingAmount) > 0;
  const needsReference = paying && Boolean(chosen && chosen.code !== "cash");

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <input type="hidden" name="supplierId" value={supplierId} />

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <FormCard title="Purchase information">
        <Field
          name="productName"
          label="Product description"
          required
          error={state.fieldErrors?.productName}
          hint="Free text — a purchase is deliberately not linked to an inventory item."
        >
          {(props) => (
            <Input {...props} placeholder="Describe the product/item details…" autoFocus />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="price" label="Price" required error={state.fieldErrors?.price}>
            {(props) => <NumericInput {...props} step="0.01" min="0" placeholder="0.00" />}
          </Field>

          <Field name="purchaseDate" label="Purchase date" required error={state.fieldErrors?.purchaseDate}>
            {(props) => <DateInput {...props} defaultValue={today} />}
          </Field>
        </div>

        <Field name="notes" label="Notes" error={state.fieldErrors?.notes}>
          {(props) => <Textarea {...props} rows={2} placeholder="Optional notes…" />}
        </Field>
      </FormCard>

      {/*
        BR-32 — an initial payment may not exceed the price, and the two are
        saved atomically or not at all: send too much and nothing is written,
        not even the purchase. Leaving this section empty saves only the
        purchase, which is why it is visibly optional rather than a set of
        fields that look required.
      */}
      <FormCard
        title="Optional payment record"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton>Save purchase</SubmitButton>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-muted">
          Leave this empty to save only the purchase. Paying more than the price is
          refused, and nothing at all is saved when it is — not the purchase either.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="initialPayment" label="Amount" error={state.fieldErrors?.initialPayment}>
            {(props) => (
              <NumericInput
                {...props}
                step="0.01"
                min="0"
                placeholder="0.00"
                defaultValue=""
                onChange={(event) => setPayingAmount(event.target.value)}
              />
            )}
          </Field>

          <Field
            name="initialPaymentMethodId"
            label="Method"
            required={paying}
            error={state.fieldErrors?.initialPaymentMethodId}
          >
            {(props) => (
              <Select
                {...props}
                defaultValue=""
                onChange={(event) => setMethodId(event.target.value)}
              >
                <option value="">Not paying now</option>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field
          name="initialPaymentReference"
          label="Reference number"
          required={needsReference}
          error={state.fieldErrors?.initialPaymentReference}
          hint={
            needsReference
              ? `${chosen?.label} is a traceable instrument — the reference is the trace.`
              : "Required for every method except cash."
          }
        >
          {(props) => <Input {...props} className="font-mono" placeholder="Reference number" />}
        </Field>

        <p className="text-[11.5px] leading-relaxed text-faint">
          The payment date follows the purchase date automatically.
        </p>
      </FormCard>
    </form>
  );
}
