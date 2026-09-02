"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { ReferenceRow } from "@/lib/api/reference";

/**
 * FR-12.2 — one form for every **named** reference list, and for both create
 * and edit, because the fields are identical: a name, and whether the list
 * still offers it.
 *
 * The action is a prop rather than a branch inside: each screen's `actions.ts`
 * pins its own list slug, and a form that chose the slug itself would be a form
 * that could be pointed at the wrong list.
 *
 * There is no description field. The registry gives one to Product categories
 * alone, and posting a description to a list without it is a 400.
 */
export function NamedEntryForm({
  entry,
  action,
  cancelHref,
  noun,
  namePlaceholder,
  statusHint,
}: {
  /** Absent when creating. */
  entry?: ReferenceRow;
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  cancelHref: string;
  /** Lower case and singular — "job position". Used in the submit label. */
  noun: string;
  namePlaceholder: string;
  /** What deactivating means for the records already carrying this entry. */
  statusHint: string;
}) {
  const editing = Boolean(entry);
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      {entry && <input type="hidden" name="id" value={entry.id} />}

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <FormCard title={noun.charAt(0).toUpperCase() + noun.slice(1)}>
        <Field name="name" label="Name" required error={state.fieldErrors?.name}>
          {(props) => (
            <Input
              {...props}
              defaultValue={entry?.name ?? ""}
              placeholder={namePlaceholder}
              autoFocus
            />
          )}
        </Field>

        <Field
          name="isActive"
          label="Status"
          required
          error={state.fieldErrors?.isActive}
          hint={statusHint}
        >
          {(props) => (
            <Select {...props} defaultValue={entry ? String(entry.is_active) : "true"}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          )}
        </Field>
      </FormCard>

      <div className="flex justify-end gap-2.5">
        <FormCancel href={cancelHref} />
        <SubmitButton pendingLabel="Saving…">
          {editing ? "Save changes" : `Create ${noun}`}
        </SubmitButton>
      </div>
    </form>
  );
}
