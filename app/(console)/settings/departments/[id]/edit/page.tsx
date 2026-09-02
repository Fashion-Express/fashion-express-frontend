import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getReference, type ReferenceRow } from "@/lib/api/reference";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { NamedEntryForm } from "@/components/reference/named-entry-form";
import { updateDepartmentAction } from "../../actions";

export const metadata: Metadata = { title: "Edit department" };

export default async function EditDepartmentPage(
  props: PageProps<"/settings/departments/[id]/edit">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    forbidden("Cannot manage reference data.");
  }

  let entry: ReferenceRow;
  try {
    entry = await getReference("departments", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings / Departments"
        title={entry.name ?? "Edit department"}
      />
      <PageBody>
        <NamedEntryForm
          entry={entry}
          action={updateDepartmentAction}
          cancelHref={`/settings/departments/${id}`}
          noun="department"
          namePlaceholder="Operations"
          statusHint="An inactive department stays on the staff already assigned to it, but is no longer offered when creating or editing an account."
        />
      </PageBody>
    </>
  );
}
