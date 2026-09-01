"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { ReferenceRow } from "@/lib/api/reference";
import { createCategoryAction, updateCategoryAction } from "./actions";

/**
 * One form for both create and edit, because the fields are identical — a
 * product category is a name, a description and whether it is still offered.
 *
 * Deactivating rather than deleting is the normal way to retire one: an
 * inactive category disappears from the pickers while every product already
 * filed under it keeps its meaning. Deleting is only possible while nothing
 * uses it at all.
 */
export function CategoryForm({
  category,
  cancelHref,
}: {
  /** Absent when creating. */
  category?: ReferenceRow;
  cancelHref: string;
}) {
  const editing = Boolean(category);
  const [state, formAction] = useActionState<ActionState, FormData>(
    editing ? updateCategoryAction : createCategoryAction,
    {},
  );

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      {category && <input type="hidden" name="id" value={category.id} />}

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <FormCard title="Category">
        <Field name="name" label="Name" required error={state.fieldErrors?.name}>
          {(props) => (
            <Input
              {...props}
              defaultValue={category?.name ?? ""}
              placeholder="Fasteners"
              autoFocus
            />
          )}
        </Field>

        <Field
          name="description"
          label="Description (optional)"
          error={state.fieldErrors?.description}
          hint="Shown only on this screen — it does not appear on documents."
        >
          {(props) => (
            <Textarea {...props} rows={3} defaultValue={category?.description ?? ""} />
          )}
        </Field>

        <Field
          name="isActive"
          label="Status"
          required
          error={state.fieldErrors?.isActive}
          hint="An inactive category stays on the products already filed under it, but is no longer offered when adding one."
        >
          {(props) => (
            <Select
              {...props}
              defaultValue={category ? String(category.is_active) : "true"}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          )}
        </Field>
      </FormCard>

      <div className="flex justify-end gap-2.5">
        <FormCancel href={cancelHref} />
        <SubmitButton pendingLabel="Saving…">
          {editing ? "Save changes" : "Create category"}
        </SubmitButton>
      </div>
    </form>
  );
}
