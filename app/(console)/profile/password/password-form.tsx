"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { changeOwnPasswordAction } from "../actions";

export function PasswordForm({ username }: { username: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    changeOwnPasswordAction,
    {},
  );

  /*
   * Nothing here clears the two boxes, and nothing needs to: React resets an
   * uncontrolled form once its action completes, so neither password is left
   * sitting in the DOM on a screen someone may walk away from. Verified in the
   * browser — the fields empty on a rejected submit as well as an accepted one.
   */

  return (
    <form action={formAction} className="mx-auto w-full max-w-[560px]">
      <FormCard
        title="Update password"
        footer={
          <>
            <FormCancel href="/profile" label="Back to profile" />
            <SubmitButton pendingLabel="Updating…">Update password</SubmitButton>
          </>
        }
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}
        {state.ok && (
          <Alert tone="success">
            Password updated. You are still signed in — a password change does not end
            your existing sessions.
          </Alert>
        )}

        {/*
          A hidden username field so a password manager knows which account it is
          storing this against. It is never read by the action, which takes the
          id from the session.
        */}
        <input type="hidden" name="usernameHint" autoComplete="username" value={username} readOnly />

        <Field
          name="password"
          label="New password"
          required
          error={state.fieldErrors?.password}
          hint="At least 8 characters."
        >
          {(props) => (
            <Input {...props} type="password" autoComplete="new-password" autoFocus />
          )}
        </Field>

        <Field
          name="confirmPassword"
          label="Confirm new password"
          required
          error={state.fieldErrors?.confirmPassword}
        >
          {(props) => (
            <Input {...props} type="password" autoComplete="new-password" />
          )}
        </Field>

        <p className="text-[11.5px] leading-relaxed text-faint">
          The current password is not required — the API does not ask for one. That is
          why this is confirmed twice instead: a typo here would otherwise be
          unrecoverable without a manager resetting it for you.
        </p>
      </FormCard>
    </form>
  );
}
