import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getReference, type ReferenceRow } from "@/lib/api/reference";
import { isSuperuser, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { RoleForm } from "../../role-form";

export const metadata: Metadata = { title: "Edit role" };

export default async function EditRolePage(
  props: PageProps<"/settings/roles/[id]/edit">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!isSuperuser(me)) forbidden("Only an administrator may change a role.");

  let role: ReferenceRow;
  try {
    role = await getReference("user-types", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings / Roles & permissions"
        title={role.label ?? "Edit role"}
      />
      <PageBody>
        <RoleForm role={role} cancelHref={`/settings/roles/${id}`} />
      </PageBody>
    </>
  );
}
