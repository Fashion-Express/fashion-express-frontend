"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { Supplier } from "@/lib/api/suppliers";

export function SupplierForm({
  action,
  supplier,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  supplier?: Supplier;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-[760px]">
      {supplier && <input type="hidden" name="id" value={supplier.id} />}

      <FormCard
        title="Supplier information"
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
            {(props) => <Input {...props} defaultValue={supplier?.name ?? ""} autoFocus />}
          </Field>

          <Field name="phone" label="Phone" required error={state.fieldErrors?.phone}>
            {(props) => (
              <Input {...props} type="tel" defaultValue={supplier?.phone ?? ""} placeholder="01XXXXXXXXX" />
            )}
          </Field>

          <Field name="email" label="Email" error={state.fieldErrors?.email}>
            {(props) => (
              <Input {...props} type="email" defaultValue={supplier?.email ?? ""} placeholder="name@company.com" />
            )}
          </Field>
        </div>

        <Field name="address" label="Address" error={state.fieldErrors?.address}>
          {(props) => (
            <Textarea {...props} rows={2} defaultValue={supplier?.address ?? ""} placeholder="Street, city" />
          )}
        </Field>
      </FormCard>
    </form>
  );
}
