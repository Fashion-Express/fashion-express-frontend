"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { loginAction } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {next && <input type="hidden" name="next" value={next} />}

      <div className="flex flex-col gap-1.5">
        <h1 className="font-sans text-[27px] leading-tight font-semibold tracking-[-0.022em] text-ink">
          Welcome back
        </h1>
        <p className="text-[13.5px] text-muted">Sign in to continue to Fashion Express.</p>
      </div>

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <div className="flex flex-col gap-3.5">
        <Field name="username" label="Username" error={state.fieldErrors?.username}>
          {(props) => (
            <Input
              {...props}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              className="h-tall rounded-field"
              placeholder="admin"
            />
          )}
        </Field>

        <Field name="password" label="Password" error={state.fieldErrors?.password}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="current-password"
              className="h-tall rounded-field font-mono tracking-[0.2em]"
              placeholder="••••••••••••"
            />
          )}
        </Field>
      </div>

      <SubmitButton
        variant="dark"
        size="lg"
        fullWidth
        pendingLabel="Signing in…"
        className="rounded-field"
      >
        Sign in
      </SubmitButton>

      <p className="text-[11.5px] leading-relaxed text-faint">
        Staff sign in with a username, not an email address. After five failed
        attempts the account is locked for an hour.
      </p>
    </form>
  );
}
