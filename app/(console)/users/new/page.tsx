import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { departments, jobPositions, optionLabel } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { listUserTypes } from "@/lib/api/users";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { createUserAction } from "../actions";
import { UserForm } from "../user-form";

export const metadata: Metadata = { title: "Add user" };

export default async function NewUserPage() {
  const me = await requireSession();
  if (!can(me, "add_user") || !isManager(me)) forbidden("Cannot add staff accounts.");

  const [types, shops, positions, depts] = await Promise.all([
    listUserTypes(),
    listShopOptions().catch(() => []),
    jobPositions().catch(() => []),
    departments().catch(() => []),
  ]);

  return (
    <>
      <PageHeader eyebrow="Users / Add" title="Add staff account" />
      <PageBody>
        <UserForm
          action={createUserAction}
          types={types}
          shops={shops}
          positions={positions.map((p) => ({ id: p.id, label: optionLabel(p) }))}
          departments={depts.map((d) => ({ id: d.id, label: optionLabel(d) }))}
          cancelHref="/users"
          submitLabel="Create account"
        />
      </PageBody>
    </>
  );
}
