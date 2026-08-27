"use client";

import { useActionState } from "react";
import { DateInput, Field, Input, NumericInput } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { ATTACHMENT_ACCEPT, ATTACHMENT_EXTENSIONS } from "@/lib/api/attachments";
import { submitClaimAction } from "../actions";

export function ClaimForm({ today }: { today: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitClaimAction,
    {},
  );

  return (
    <form
      action={formAction}
      // No encType here: React sets the encoding itself for a function action,
      // and declaring one is overridden with a console error. The file still
      // arrives as a File in the FormData the action receives.
      className="mx-auto w-full max-w-[760px]"
    >
      <FormCard
        title="Claim information"
        footer={
          <>
            <FormCancel href="/bills" />
            <SubmitButton pendingLabel="Submitting…">Submit claim</SubmitButton>
          </>
        }
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="amount" label="Amount" required error={state.fieldErrors?.amount}>
            {(props) => (
              <NumericInput {...props} step="0.01" min="0" placeholder="0.00" autoFocus />
            )}
          </Field>

          <Field
            name="billDate"
            label="Bill date"
            required
            error={state.fieldErrors?.billDate}
            hint="When the cost was incurred, not today."
          >
            {(props) => <DateInput {...props} defaultValue={today} />}
          </Field>
        </div>

        <Field name="description" label="Description" required error={state.fieldErrors?.description}>
          {(props) => <Input {...props} placeholder="What was this expense for?" />}
        </Field>

        <Field
          name="attachment"
          label="Upload bill / receipt"
          error={state.fieldErrors?.attachment}
          hint={`A scan or photo of the bill. Accepted: ${ATTACHMENT_EXTENSIONS.join(", ")}`}
        >
          {(props) => (
            <input
              {...props}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 font-sans text-[12.5px] text-ink file:mr-3 file:cursor-pointer file:rounded-badge file:border-0 file:bg-subtle file:px-3 file:py-1.5 file:font-sans file:text-[12px] file:font-semibold file:text-ink-soft"
            />
          )}
        </Field>

        {/* FR-07.1.1 — the status is set by the workflow. Saying so here stops
            anyone looking for the field they cannot find. */}
        <p className="text-[11.5px] leading-relaxed text-faint">
          The claim is submitted as pending. A manager approves or rejects it — approval
          posts it to expenses automatically, dated to the bill date and paid to you.
        </p>
      </FormCard>
    </form>
  );
}
