"use client";

import { useActionState } from "react";
import {
  Field,
  Input,
  ReadOnlyValue,
  Select,
  Textarea,
} from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { ShopOption } from "@/lib/api/types";

type CustomerDefaults = {
  id: string;
  customer_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  status_code: string;
  shop_id: string;
  shop_name: string;
};

export function CustomerForm({
  action,
  shops,
  customer,
  defaultShopId,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  shops: ShopOption[];
  customer?: CustomerDefaults;
  /** The signed-in user's home shop, which a create form defaults to. */
  defaultShopId?: string | null;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const editing = Boolean(customer);

  return (
    <form action={formAction} className="mx-auto w-full max-w-[760px]">
      {customer && <input type="hidden" name="id" value={customer.id} />}

      <FormCard
        title="Customer information"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton>{submitLabel}</SubmitButton>
          </>
        }
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="name" label="Name" required error={state.fieldErrors?.name}>
            {(props) => (
              <Input {...props} defaultValue={customer?.name ?? ""} autoFocus={!editing} />
            )}
          </Field>

          <Field name="company" label="Company" error={state.fieldErrors?.company}>
            {(props) => <Input {...props} defaultValue={customer?.company ?? ""} />}
          </Field>

          <Field name="phone" label="Phone" required error={state.fieldErrors?.phone}>
            {(props) => (
              <Input
                {...props}
                type="tel"
                inputMode="tel"
                defaultValue={customer?.phone ?? ""}
                placeholder="01XXXXXXXXX"
              />
            )}
          </Field>

          <Field name="email" label="Email" error={state.fieldErrors?.email}>
            {(props) => (
              <Input
                {...props}
                type="email"
                defaultValue={customer?.email ?? ""}
                placeholder="name@company.com"
              />
            )}
          </Field>

          <Field name="city" label="City" error={state.fieldErrors?.city}>
            {(props) => <Input {...props} defaultValue={customer?.city ?? ""} />}
          </Field>

          {/*
            BR-54 — a record's shop is fixed at creation, and a PATCH carrying
            shopId is refused with a 400 rather than ignored. So it is a choice
            on create and a fact on edit; rendering an editable select here
            would be offering something the server will not accept.
          */}
          {editing ? (
            <Field
              name="shopDisplay"
              label="Shop"
              hint="Fixed when the customer was created — their sales are scoped to it."
            >
              {() => <ReadOnlyValue>{customer?.shop_name}</ReadOnlyValue>}
            </Field>
          ) : (
            <Field name="shopId" label="Shop" required error={state.fieldErrors?.shopId}>
              {(props) => (
                <Select {...props} defaultValue={defaultShopId ?? ""}>
                  <option value="" disabled>
                    Choose a shop
                  </option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Field name="statusCode" label="Status" error={state.fieldErrors?.statusCode}>
            {(props) => (
              <Select {...props} defaultValue={customer?.status_code ?? "active"}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            )}
          </Field>

          {/*
            FR-03.2 — the customer number is issued by the server inside the
            transaction that inserts the row, and never accepted from the
            caller. Shown, never typed.
          */}
          {editing && (
            <Field name="customerIdDisplay" label="Customer ID" hint="Issued once, immutable.">
              {() => <ReadOnlyValue mono>{customer?.customer_id}</ReadOnlyValue>}
            </Field>
          )}
        </div>

        <Field name="address" label="Address" error={state.fieldErrors?.address}>
          {(props) => (
            <Textarea {...props} rows={2} defaultValue={customer?.address ?? ""} />
          )}
        </Field>

        <Field name="notes" label="Notes" error={state.fieldErrors?.notes}>
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              defaultValue={customer?.notes ?? ""}
              placeholder="Optional notes…"
            />
          )}
        </Field>
      </FormCard>
    </form>
  );
}
