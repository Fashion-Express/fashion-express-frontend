import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { isSuperuser, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Add role" };

export default async function NewRolePage() {
  const me = await requireSession();
  // Creating a role is privilege work: it can confer manager or unrestricted
  // access, which the API restricts to administrators.
  if (!isSuperuser(me)) forbidden("Only an administrator may create a role.");

  return (
    <>
      <PageHeader
        eyebrow="Settings / Roles & permissions"
        title="Add role"
        meta="It starts with no permissions. Grant them once it exists."
      />
      <PageBody>
        <RoleForm cancelHref="/settings/roles" />
      </PageBody>
    </>
  );
}
