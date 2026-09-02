import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { NamedEntryForm } from "@/components/reference/named-entry-form";
import { createDepartmentAction } from "../actions";

export const metadata: Metadata = { title: "Add department" };

export default async function NewDepartmentPage() {
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    forbidden("Cannot manage reference data.");
  }

  return (
    <>
      <PageHeader eyebrow="Settings / Departments" title="Add department" />
      <PageBody>
        <NamedEntryForm
          action={createDepartmentAction}
          cancelHref="/settings/departments"
          noun="department"
          namePlaceholder="Operations"
          statusHint="An inactive department stays on the staff already assigned to it, but is no longer offered when creating or editing an account."
        />
      </PageBody>
    </>
  );
}
