"use client";

import { useActionState } from "react";
import { DateInput, Field, Input, NumericInput, ReadOnlyValue, Select, Textarea } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { User, UserType } from "@/lib/api/users";
import type { ShopOption } from "@/lib/api/types";

type Picker = { id: string; label: string };

export function UserForm({
  action,
  user,
  types,
  shops,
  positions,
  departments,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  user?: User;
  types: UserType[];
  shops: ShopOption[];
  positions: Picker[];
  departments: Picker[];
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const editing = Boolean(user);

  /*
   * React resets an uncontrolled form once its action completes — a refusal is
   * no exception — so every field below is re-seeded from what was submitted.
   * The reset then lands back on the user's own typing instead of wiping a
   * screenful of it to correct one field.
   *
   * The order is deliberate: what was just submitted, then the saved record,
   * then empty. `??` and not `||`, so a value the user deliberately cleared
   * stays cleared rather than springing back to the stored one.
   */
  const sent = state.values;

  /*
   * A <select> needs more than a new `defaultValue`. React applies that only
   * when the element MOUNTS, so re-rendering with a different one leaves the
   * selection where it was and the reset then lands on the original default —
   * which is why the account type came back as "Choose a type" while every
   * text field kept its value. Keying each select on the value it should show
   * remounts it exactly when that value changes, and no more often.
   */
  const selectKey = (value: string) => `k:${value}`;

  // NB: `key` is written BEFORE `{...props}` on each select below. After a
  // spread it forces the JSX transform onto `createElement`, which validates
  // the children of every element it builds — and warns about the static
  // <option> placeholders that the `jsxs` fast path treats as static and
  // leaves alone.

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[860px] flex-col gap-4">
      {user && <input type="hidden" name="id" value={user.id} />}

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <FormCard title="Account">
        <div className="grid gap-4 sm:grid-cols-2">
          {/*
            The username is an immutable identifier and a PATCH carrying it is a
            400. So it is a field on create and a fact on edit — and the
            employee ID is never editable at all, being generated once.
          */}
          {editing ? (
            <>
              <Field name="usernameDisplay" label="Username" hint="An immutable identifier.">
                {() => <ReadOnlyValue mono>{user?.username}</ReadOnlyValue>}
              </Field>
              <Field name="employeeIdDisplay" label="Employee ID" hint="Generated once, never editable.">
                {() => <ReadOnlyValue mono>{user?.employee_id}</ReadOnlyValue>}
              </Field>
            </>
          ) : (
            <>
              <Field name="username" label="Username" required error={state.fieldErrors?.username}>
                {(props) => (
                  <Input
                    {...props}
                    defaultValue={sent?.username ?? ""}
                    autoCapitalize="none"
                    className="font-mono"
                    autoFocus
                  />
                )}
              </Field>
              <Field
                name="password"
                label="Password"
                required
                error={state.fieldErrors?.password}
                hint="At least 8 characters. The account can sign in immediately."
              >
                {/* Not re-seeded: `valuesOf` never echoes a password back. */}
                {(props) => <Input {...props} type="password" autoComplete="new-password" />}
              </Field>
            </>
          )}

          <Field name="name" label="Display name" required error={state.fieldErrors?.name}>
            {(props) => <Input {...props} defaultValue={sent?.name ?? user?.name ?? ""} />}
          </Field>

          {/* BR-57 — every account has exactly one type, and privilege comes
              from the type: promoting someone means changing it here. */}
          <Field
            name="userTypeId"
            label="Account type"
            required
            error={state.fieldErrors?.userTypeId}
            hint="Carries the account's permissions."
          >
            {(props) => (
              <Select
                key={selectKey(sent?.userTypeId ?? user?.user_type_id ?? "")}
                {...props}
                defaultValue={sent?.userTypeId ?? user?.user_type_id ?? ""}
              >
                <option value="" disabled>Choose a type</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>{type.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="statusCode" label="Employment status" error={state.fieldErrors?.statusCode}>
            {(props) => (
              <Select
                key={selectKey(sent?.statusCode ?? user?.status_code ?? "active")}
                {...props}
                defaultValue={sent?.statusCode ?? user?.status_code ?? "active"}
              >
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="inactive">Inactive</option>
              </Select>
            )}
          </Field>

          <Field
            name="shopId"
            label="Home shop"
            error={state.fieldErrors?.shopId}
            hint="Defaults their create forms. Does not limit what they can see."
          >
            {(props) => (
              <Select
                key={selectKey(sent?.shopId ?? user?.shop_id ?? "")}
                {...props}
                defaultValue={sent?.shopId ?? user?.shop_id ?? ""}
              >
                <option value="">No home shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FormCard>

      <FormCard
        title="Personal details"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton>{submitLabel}</SubmitButton>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="email" label="Email" error={state.fieldErrors?.email}>
            {(props) => (
              <Input {...props} type="email" defaultValue={sent?.email ?? user?.email ?? ""} />
            )}
          </Field>

          <Field name="phone" label="Phone" error={state.fieldErrors?.phone}>
            {(props) => (
              <Input {...props} type="tel" defaultValue={sent?.phone ?? user?.phone ?? ""} />
            )}
          </Field>

          <Field name="joinDate" label="Join date" error={state.fieldErrors?.joinDate}>
            {(props) => (
              <DateInput {...props} defaultValue={sent?.joinDate ?? user?.join_date ?? ""} />
            )}
          </Field>

          {/* A decimal string end to end — a JSON number would be a float. */}
          <Field name="salary" label="Salary" error={state.fieldErrors?.salary}>
            {(props) => (
              <NumericInput
                {...props}
                step="0.01"
                min="0"
                defaultValue={sent?.salary ?? user?.salary ?? ""}
                placeholder="0.00"
              />
            )}
          </Field>

          <Field name="jobPositionId" label="Job position" error={state.fieldErrors?.jobPositionId}>
            {(props) => (
              <Select
                key={selectKey(sent?.jobPositionId ?? "")}
                {...props}
                defaultValue={sent?.jobPositionId ?? ""}
              >
                <option value="">{user?.job_position ?? "Not set"}</option>
                {positions.map((position) => (
                  <option key={position.id} value={position.id}>{position.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="departmentId" label="Department" error={state.fieldErrors?.departmentId}>
            {(props) => (
              <Select
                key={selectKey(sent?.departmentId ?? "")}
                {...props}
                defaultValue={sent?.departmentId ?? ""}
              >
                <option value="">{user?.department ?? "Not set"}</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>{department.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        {/*
          Address and notes are accepted on write but are not returned by the
          user endpoints — the detail route answers with the same row shape as
          the list. They are therefore left blank rather than pre-filled with a
          guess, and submitting the form blank clears neither, since an empty
          optional field is sent as absent.
        */}
        <Field
          name="address"
          label="Address"
          error={state.fieldErrors?.address}
          hint={editing ? "Not shown by the API — fill in to replace." : undefined}
        >
          {(props) => <Textarea {...props} rows={2} defaultValue={sent?.address ?? ""} />}
        </Field>

        <Field name="notes" label="Notes" error={state.fieldErrors?.notes}>
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              defaultValue={sent?.notes ?? ""}
              placeholder="Optional notes…"
            />
          )}
        </Field>
      </FormCard>
    </form>
  );
}
