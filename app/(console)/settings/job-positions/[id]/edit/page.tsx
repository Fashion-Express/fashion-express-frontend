import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getReference, type ReferenceRow } from "@/lib/api/reference";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { NamedEntryForm } from "@/components/reference/named-entry-form";
import { updateJobPositionAction } from "../../actions";

export const metadata: Metadata = { title: "Edit job position" };

export default async function EditJobPositionPage(
  props: PageProps<"/settings/job-positions/[id]/edit">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    forbidden("Cannot manage reference data.");
  }

  let entry: ReferenceRow;
  try {
    entry = await getReference("job-positions", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings / Job positions"
        title={entry.name ?? "Edit job position"}
      />
      <PageBody>
        <NamedEntryForm
          entry={entry}
          action={updateJobPositionAction}
          cancelHref={`/settings/job-positions/${id}`}
          noun="job position"
          namePlaceholder="Sales executive"
          statusHint="An inactive job position stays on the staff already holding it, but is no longer offered when creating or editing an account."
        />
      </PageBody>
    </>
  );
}
