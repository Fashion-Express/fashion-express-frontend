import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { NamedEntryForm } from "@/components/reference/named-entry-form";
import { createJobPositionAction } from "../actions";

export const metadata: Metadata = { title: "Add job position" };

export default async function NewJobPositionPage() {
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    forbidden("Cannot manage reference data.");
  }

  return (
    <>
      <PageHeader eyebrow="Settings / Job positions" title="Add job position" />
      <PageBody>
        <NamedEntryForm
          action={createJobPositionAction}
          cancelHref="/settings/job-positions"
          noun="job position"
          namePlaceholder="Sales executive"
          statusHint="An inactive job position stays on the staff already holding it, but is no longer offered when creating or editing an account."
        />
      </PageBody>
    </>
  );
}
