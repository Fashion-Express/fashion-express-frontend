"use client";

import { useActionState } from "react";
import { DateInput, Field, Input, NumericInput, Select, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { ExpenseDetail } from "@/lib/api/expenses";
import type { ShopOption } from "@/lib/api/types";

type Picker = { id: string; label: string };

export function ExpenseForm({
  action,
  expense,
  categories,
  methods,
  shops,
  today,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  expense?: ExpenseDetail;
  categories: Picker[];
  methods: Picker[];
  shops: ShopOption[];
  today: string;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const editing = Boolean(expense);

  /*
   * The expense read shape carries `category_label` and `method_label` but no
   * ids, so neither picker can be preselected. Rather than showing a blank that
   * reads as "no category" for a record that certainly has one, the current
   * value becomes the empty option's label — the same trick the user form uses
   * for job position and department, which face the identical API shape.
   * Leaving it alone then submits nothing for that field, and the API leaves it
   * as it was.
   */
  return (
    <form action={formAction} className="mx-auto w-full max-w-[760px]">
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <FormCard
        title="Expense information"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton>{submitLabel}</SubmitButton>
          </>
        }
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="date" label="Date" required error={state.fieldErrors?.date}>
            {(props) => <DateInput {...props} defaultValue={expense?.date ?? today} />}
          </Field>

          <Field name="amount" label="Amount" required error={state.fieldErrors?.amount}>
            {(props) => (
              <NumericInput {...props} step="0.01" min="0" placeholder="0.00" defaultValue={expense?.amount ?? ""} />
            )}
          </Field>
        </div>

        <Field name="description" label="Description" required error={state.fieldErrors?.description}>
          {(props) => (
            <Input {...props} defaultValue={expense?.description ?? ""} placeholder="What was this expense for?" />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="expenseCategoryId"
            label="Category"
            required={!editing}
            error={state.fieldErrors?.expenseCategoryId}
            hint={editing ? "Leave as it is to keep the current category." : undefined}
          >
            {(props) => (
              <Select {...props} defaultValue="">
                <option value="">
                  {editing ? expense?.category_label : "Select category"}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </Select>
            )}
          </Field>

          {/* BR-62 — expense-scoped methods only, so a supplier-only instrument
              is never offered on a cost the database would then refuse. */}
          <Field
            name="paymentMethodId"
            label="Payment method"
            error={state.fieldErrors?.paymentMethodId}
            hint={
              editing
                ? "Leave as it is to keep the current method."
                : "Optional — not every expense records how it was settled."
            }
          >
            {(props) => (
              <Select {...props} defaultValue="">
                <option value="">
                  {editing ? (expense?.method_label ?? "Not recorded") : "Not recorded"}
                </option>
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>{method.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="paidTo" label="Paid to" error={state.fieldErrors?.paidTo}>
            {(props) => <Input {...props} defaultValue={expense?.paid_to ?? ""} placeholder="Recipient name" />}
          </Field>

          <Field name="receiptNumber" label="Receipt number" error={state.fieldErrors?.receiptNumber}>
            {(props) => (
              <Input {...props} defaultValue={expense?.receipt_number ?? ""} className="font-mono" />
            )}
          </Field>

          {/*
            §10.2 — an expense may carry a shop, and leaving it blank is a
            meaningful choice rather than a missing one: it marks a business-wide
            cost, which is why the dashboard reports expenses outside the shop
            filter entirely.
          */}
          <Field
            name="shopId"
            label="Shop"
            error={state.fieldErrors?.shopId}
            hint="Leave blank for a business-wide cost."
            className="sm:col-span-2"
          >
            {(props) => (
              <Select {...props} defaultValue={expense?.shop_id ?? ""}>
                <option value="">Business-wide</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Field name="notes" label="Notes" error={state.fieldErrors?.notes}>
          {(props) => (
            <Textarea {...props} rows={3} defaultValue={expense?.notes ?? ""} placeholder="Optional notes…" />
          )}
        </Field>
      </FormCard>
    </form>
  );
}
