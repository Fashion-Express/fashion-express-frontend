import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { departments, jobPositions, optionLabel } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { getUser, listUserTypes } from "@/lib/api/users";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { updateUserAction } from "../../actions";
import { UserForm } from "../../user-form";

export const metadata: Metadata = { title: "Edit user" };

export default async function EditUserPage(props: PageProps<"/users/[id]/edit">) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "change_user") || !isManager(me)) forbidden("Cannot edit staff accounts.");

  let user;
  try {
    user = await getUser(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const [types, shops, positions, depts] = await Promise.all([
    listUserTypes(),
    listShopOptions().catch(() => []),
    jobPositions().catch(() => []),
    departments().catch(() => []),
  ]);

  return (
    <>
      <PageHeader eyebrow="Users / Edit" title={`Edit ${user.name}`} />
      <PageBody>
        <UserForm
          action={updateUserAction}
          user={user}
          types={types}
          shops={shops}
          positions={positions.map((p) => ({ id: p.id, label: optionLabel(p) }))}
          departments={depts.map((d) => ({ id: d.id, label: optionLabel(d) }))}
          cancelHref={`/users/${user.id}`}
          submitLabel="Save changes"
        />
      </PageBody>
    </>
  );
}
