"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { ReferenceRow } from "@/lib/api/reference";
import { createRoleAction, updateRoleAction } from "./actions";

/**
 * FR-12.1 — a role, which is a `user-types` entry.
 *
 * Two things separate this from the other reference forms:
 *
 *  - **`code` is set once and never editable** (BR-59). Application logic and
 *    historical records key on it, so it is a field on create and a fact on
 *    edit — the same treatment a username gets on the staff form.
 *  - **The two privilege flags are not ordinary fields.** They decide what
 *    everyone holding the role may do, immediately (BR-56), and the API
 *    restricts writing them to administrators. The hints say so, because a
 *    select that quietly confers unrestricted access is the one control on this
 *    screen someone could regret.
 */
export function RoleForm({
  role,
  cancelHref,
}: {
  /** Absent when creating. */
  role?: ReferenceRow;
  cancelHref: string;
}) {
  const editing = Boolean(role);
  const [state, formAction] = useActionState<ActionState, FormData>(
    editing ? updateRoleAction : createRoleAction,
    {},
  );

  // Re-seed from what was submitted: React resets an uncontrolled form once its
  // action completes, errors included.
  const sent = state.values;

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      {role && <input type="hidden" name="id" value={role.id} />}

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <FormCard title="Role">
        {editing ? (
          <Field
            name="codeDisplay"
            label="Code"
            hint="Fixed once created — logic and history key on it (BR-59)."
          >
            {() => (
              <div className="flex h-input items-center rounded-control border border-dashed border-line bg-subtle px-3 font-mono text-[12.5px] text-muted">
                {role?.code}
              </div>
            )}
          </Field>
        ) : (
          <Field
            name="code"
            label="Code"
            required
            error={state.fieldErrors?.code}
            hint="Lower-case letters, digits and underscores. Cannot be changed afterwards."
          >
            {(props) => (
              <Input
                {...props}
                defaultValue={sent?.code ?? ""}
                placeholder="supervisor"
                autoCapitalize="none"
                className="font-mono"
                autoFocus
              />
            )}
          </Field>
        )}

        <Field name="label" label="Label" required error={state.fieldErrors?.label}>
          {(props) => (
            <Input
              {...props}
              defaultValue={sent?.label ?? role?.label ?? ""}
              placeholder="Supervisor"
              autoFocus={editing}
            />
          )}
        </Field>

        <Field
          name="description"
          label="Description (optional)"
          error={state.fieldErrors?.description}
        >
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              defaultValue={sent?.description ?? role?.description ?? ""}
            />
          )}
        </Field>
      </FormCard>

      <FormCard
        title="Privilege"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton pendingLabel="Saving…">
              {editing ? "Save changes" : "Create role"}
            </SubmitButton>
          </>
        }
      >
        <Field
          name="isManager"
          label="Manager"
          required
          error={state.fieldErrors?.isManager}
          hint="Opens the manager-only screens — reports, the ledger, bill-claim review — and lifts the rule that a salesperson sees only their own sales."
        >
          {(props) => (
            <Select
              key={`m:${sent?.isManager ?? String(role?.is_manager ?? false)}`}
              {...props}
              defaultValue={sent?.isManager ?? String(role?.is_manager ?? false)}
            >
              <option value="false">No</option>
              <option value="true">Yes</option>
            </Select>
          )}
        </Field>

        <Field
          name="isSuperuser"
          label="Unrestricted"
          required
          error={state.fieldErrors?.isSuperuser}
          hint="Passes every permission check regardless of what is granted. Its permission list becomes read-only, because nothing on it would change what a holder may do."
        >
          {(props) => (
            <Select
              key={`s:${sent?.isSuperuser ?? String(role?.is_superuser ?? false)}`}
              {...props}
              defaultValue={sent?.isSuperuser ?? String(role?.is_superuser ?? false)}
            >
              <option value="false">No</option>
              <option value="true">Yes — full access</option>
            </Select>
          )}
        </Field>

        <Field
          name="isActive"
          label="Status"
          required
          error={state.fieldErrors?.isActive}
          hint="An inactive role stays on the accounts already holding it, but is no longer offered when creating one."
        >
          {(props) => (
            <Select
              key={`a:${sent?.isActive ?? String(role?.is_active ?? true)}`}
              {...props}
              defaultValue={sent?.isActive ?? String(role?.is_active ?? true)}
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          )}
        </Field>

        <p className="text-[11.5px] leading-relaxed text-faint">
          A new role starts with no permissions at all. Grant them from the
          role&rsquo;s own screen once it exists.
        </p>
      </FormCard>
    </form>
  );
}
