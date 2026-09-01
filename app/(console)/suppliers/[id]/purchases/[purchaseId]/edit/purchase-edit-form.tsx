"use client";

import { useActionState } from "react";
import { DateInput, Field, Input, NumericInput, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { PurchaseDetail } from "@/lib/api/suppliers";
import { formatMoney } from "@/lib/format/money";
import { updatePurchaseAction } from "../../../../actions";

/**
 * FR-05.4 — editing a purchase.
 *
 * Only the four fields the API accepts. `paid_amount` is absent because it is
 * the sum of the payment rows: it is changed by recording or removing a
 * receipt, never by typing over it. The supplier is absent because a purchase
 * belongs to the one it was entered against.
 */
export function PurchaseEditForm({
  purchase,
  cancelHref,
}: {
  purchase: PurchaseDetail;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updatePurchaseAction,
    {},
  );

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      <input type="hidden" name="purchaseId" value={purchase.id} />
      <input type="hidden" name="supplierId" value={purchase.supplier_id} />

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
            <Input {...props} defaultValue={purchase.product_name} autoFocus />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="price"
            label="Price"
            required
            error={state.fieldErrors?.price}
            hint={`${formatMoney(purchase.paid_amount)} already paid — the price cannot go below it.`}
          >
            {(props) => (
              <NumericInput
                {...props}
                step="0.01"
                min="0"
                defaultValue={purchase.price}
              />
            )}
          </Field>

          <Field
            name="purchaseDate"
            label="Purchase date"
            required
            error={state.fieldErrors?.purchaseDate}
          >
            {(props) => <DateInput {...props} defaultValue={purchase.purchase_date} />}
          </Field>
        </div>

        <Field name="notes" label="Notes (optional)" error={state.fieldErrors?.notes}>
          {(props) => <Textarea {...props} rows={3} defaultValue={purchase.notes} />}
        </Field>
      </FormCard>

      <div className="flex justify-end gap-2.5">
        <FormCancel href={cancelHref} />
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
      </div>
    </form>
  );
}
