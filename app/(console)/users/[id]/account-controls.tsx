"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert, Card } from "@/components/ui/surfaces";
import { Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { setPasswordAction, setUserStatusAction } from "../actions";

/**
 * Retiring someone is a STATUS change, not a deletion — the account keeps every
 * record it created, and only an active account may authenticate.
 */
export function AccountControls({
  userId,
  username,
  statusCode,
  isSelf,
}: {
  userId: string;
  username: string;
  statusCode: string;
  isSelf: boolean;
}) {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [statusState, statusAction] = useActionState<ActionState, FormData>(
    setUserStatusAction,
    {},
  );
  const [passwordState, passwordAction] = useActionState<ActionState, FormData>(
    setPasswordAction,
    {},
  );

  const [seen, setSeen] = useState(passwordState);
  if (seen !== passwordState) {
    setSeen(passwordState);
    if (passwordState.ok) setPasswordOpen(false);
  }

  return (
    <Card title="Manage this account">
      <div className="flex flex-col gap-4">
        {statusState.formError && <Alert tone="danger">{statusState.formError}</Alert>}
        {statusState.ok && <Alert tone="success">Employment status updated.</Alert>}
        {passwordState.ok && <Alert tone="success">Password changed.</Alert>}

        <div className="flex flex-wrap items-end justify-between gap-3 rounded-control border border-line px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Employment status</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              {isSelf
                ? "You cannot change your own — an inactive account cannot sign in, and recovering means going into the database."
                : "Retire someone by setting this to inactive. Their records stay intact."}
            </p>
          </div>

          <form action={statusAction} className="flex items-end gap-2.5">
            <input type="hidden" name="id" value={userId} />
            <Field name="statusCode" label="Status">
              {(props) => (
                <Select {...props} defaultValue={statusCode} disabled={isSelf} className="w-[150px]">
                  <option value="active">Active</option>
                  <option value="on_leave">On leave</option>
                  <option value="inactive">Inactive</option>
                </Select>
              )}
            </Field>
            <SubmitButton variant="outline" disabled={isSelf} pendingLabel="Saving…">
              Update
            </SubmitButton>
          </form>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">Password</p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Set a new password for {username} without knowing the current one.
            </p>
          </div>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            Set password
          </Button>
        </div>
      </div>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title={`Set a new password for ${username}`}
      >
        <form action={passwordAction} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={userId} />

          {passwordState.formError && <Alert tone="danger">{passwordState.formError}</Alert>}

          <Field
            name="password"
            label="New password"
            required
            error={passwordState.fieldErrors?.password}
            hint="At least 8 characters. Their existing sessions are unaffected."
          >
            {(props) => <Input {...props} type="password" autoComplete="new-password" autoFocus />}
          </Field>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancel</Button>
            <SubmitButton pendingLabel="Saving…">Set password</SubmitButton>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
