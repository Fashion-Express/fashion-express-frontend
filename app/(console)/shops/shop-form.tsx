"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";

/**
 * One form for both add and edit — the fields and the rules are identical, only
 * the action and the labels differ.
 */
export function ShopForm({
  action,
  shop,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  shop?: { id: string; name: string; description: string };
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-[760px]">
      {shop && <input type="hidden" name="id" value={shop.id} />}

      <FormCard
        title="Shop information"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton>{submitLabel}</SubmitButton>
          </>
        }
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <Field name="name" label="Shop name" required error={state.fieldErrors?.name}>
          {(props) => (
            <Input
              {...props}
              defaultValue={shop?.name ?? ""}
              placeholder="e.g. Gulshan Branch"
              autoFocus
            />
          )}
        </Field>

        <Field
          name="description"
          label="Description"
          error={state.fieldErrors?.description}
          hint="The address or a note about this location."
        >
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              defaultValue={shop?.description ?? ""}
              placeholder="House 42, Road 11, Gulshan 2, Dhaka 1212"
            />
          )}
        </Field>
      </FormCard>
    </form>
  );
}
