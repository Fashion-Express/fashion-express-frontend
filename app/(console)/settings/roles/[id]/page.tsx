import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import {
  getRoleGrants,
  grantsInfo,
  listRoles,
  type RoleGrants,
  type RoleSummary,
} from "@/lib/api/roles";
import { can, isSuperuser, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { RoleMatrix, type PermissionGroup } from "./role-matrix";

export const metadata: Metadata = { title: "Role permissions" };

/**
 * The order the sidebar puts the modules in, so the matrix reads like the app
 * rather than like the alphabet. Anything the API adds later that is not named
 * here still appears, after these.
 */
const MODULE_ORDER = [
  "sales",
  "customers",
  "inventory",
  "suppliers",
  "expenses",
  "claims",
  "shops",
  "users",
  "reference",
  "reports",
  "admin",
  "menu",
];

export default async function RolePermissionsPage(
  props: PageProps<"/settings/roles/[id]">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) forbidden("Cannot read reference data.");

  let grants: RoleGrants;
  try {
    grants = await getRoleGrants(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const [roles, info] = await Promise.all([
    listRoles().catch((): RoleSummary[] => []),
    grantsInfo().catch(() => ({ enabled: false, safeguards: [] })),
  ]);
  const role = roles.find((r) => r.id === id);

  /*
   * The four safeguards decided in one place, so the reason shown is the reason
   * the server would give. Each is re-enforced by the API — this only decides
   * whether to offer the affordance (FR-00.3).
   */
  const isOwnRole = me.userType.id === id;
  const readOnlyReason = !isSuperuser(me)
    ? "Only an administrator may change what a role grants."
    : !info.enabled
      ? "Editing is switched off on the server. It must be deliberately enabled with ENABLE_ROLE_EDITING=true."
      : role?.is_superuser
        ? `${role.label} has unrestricted access, so it passes every permission check regardless of what is listed here. These are shown for reference.`
        : isOwnRole
          ? "This is the role you hold yourself, so it cannot be edited here — nobody can change their own privilege in one click."
          : undefined;

  const editable = readOnlyReason === undefined;

  const byModule = new Map<string, PermissionGroup>();
  for (const permission of grants.catalogue) {
    const group = byModule.get(permission.module) ?? {
      module: permission.module,
      items: [],
    };
    group.items.push(permission);
    byModule.set(permission.module, group);
  }
  const groups = [...byModule.values()].sort((a, b) => {
    const ai = MODULE_ORDER.indexOf(a.module);
    const bi = MODULE_ORDER.indexOf(b.module);
    return (
      (ai === -1 ? MODULE_ORDER.length : ai) -
      (bi === -1 ? MODULE_ORDER.length : bi)
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Settings / Roles & permissions"
        title={role?.label ?? "Role"}
        meta={
          <span className="flex items-center gap-2">
            <StatusPill tone={role?.is_superuser ? "accent" : "neutral"}>
              {role?.code ?? id}
            </StatusPill>
            <span className="text-[12.5px] text-muted">
              {grants.granted.length} of {grants.catalogue.length} permissions
            </span>
          </span>
        }
        actions={
          <ButtonLink href="/settings/roles" variant="outline">
            ← Back
          </ButtonLink>
        }
      />

      <PageBody>
        <RoleMatrix
          roleId={id}
          roleLabel={role?.label ?? "this role"}
          groups={groups}
          granted={grants.granted}
          accountCount={Number(role?.account_count ?? 0)}
          editable={editable}
          readOnlyReason={readOnlyReason}
        />
      </PageBody>
    </>
  );
}
