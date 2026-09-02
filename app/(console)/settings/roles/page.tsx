import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { grantsInfo, listRoles, type RoleSummary } from "@/lib/api/roles";
import { can, isSuperuser, requireSession } from "@/lib/auth/session";
import { plural } from "@/lib/format/plural";
import {
  Alert,
  EmptyState,
  PageBody,
  PageHeader,
  StatusPill,
} from "@/components/ui/surfaces";
import { ButtonLink } from "@/components/ui/button";
import { RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteNamedEntry } from "@/components/reference/delete-named-entry";
import { deleteRoleAction, loadRoleUsage } from "./actions";

export const metadata: Metadata = { title: "Roles & permissions" };

/**
 * FR-00.4 — roles are containers for permissions, so a capability can be
 * granted or revoked per role without touching individual accounts.
 *
 * A role here is a **user type**: BR-56 makes the type the only place privilege
 * is recorded, and BR-57 gives every account exactly one. The four that ship
 * are fixed — this screen changes what they grant, not which of them exist.
 */
export default async function RolesPage() {
  const me = await requireSession();
  // Reading is reference data; only the WRITE is administrator-only.
  if (!can(me, "manage_referencedata")) forbidden("Cannot read reference data.");

  const [roles, info] = await Promise.all([
    listRoles().catch((): RoleSummary[] => []),
    grantsInfo().catch(() => ({ enabled: false, safeguards: [] })),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Roles & permissions"
        meta="What each role may do. A change reaches everyone holding it immediately."
        actions={
          isSuperuser(me) ? (
            <ButtonLink href="/settings/roles/new">+ New role</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        {/*
          Both notices are worth showing rather than silently rendering a
          read-only screen: "why can I not edit this" is the question a blank
          affordance always produces.
        */}
        {!isSuperuser(me) && (
          <Alert tone="info">
            You can see what each role grants, but only an administrator may
            change it — anyone who can edit grants can grant themselves anything.
          </Alert>
        )}

        {isSuperuser(me) && !info.enabled && (
          <Alert tone="warning">
            Editing is switched off on the server. It must be deliberately
            enabled with <strong>ENABLE_ROLE_EDITING=true</strong>, the same way
            the data cleanup tool is.
          </Alert>
        )}

        {roles.length === 0 ? (
          <EmptyState
            title="No roles to show"
            description="The role list could not be read."
          />
        ) : (
          <Table
            head={
              <>
                <Th>Role</Th>
                <Th>Privilege</Th>
                <Th align="right">Permissions</Th>
                <Th align="right">Accounts</Th>
                <Th align="right">Actions</Th>
              </>
            }
          >
            {roles.map((role) => (
              <Tr key={role.id}>
                <Td strong>
                  {role.label}
                  <span className="mt-0.5 block font-mono text-[10.5px] font-normal text-faint">
                    {role.code}
                  </span>
                </Td>
                <Td>
                  {role.is_superuser ? (
                    <StatusPill tone="accent">Unrestricted</StatusPill>
                  ) : role.is_manager ? (
                    <StatusPill tone="info">Manager</StatusPill>
                  ) : (
                    <StatusPill tone="neutral">Standard</StatusPill>
                  )}
                </Td>
                {/* Counts arrive as strings; Number() only to display them. */}
                <Td align="right" mono>
                  {Number(role.permission_count)}
                </Td>
                <Td align="right" mono>
                  {plural(role.account_count, "account")}
                </Td>
                <Td align="right">
                  <RowActions>
                    <RowLink href={`/settings/roles/${role.id}`}>
                      {isSuperuser(me) && info.enabled && !role.is_superuser
                        ? "Permissions"
                        : "View"}
                    </RowLink>
                    {isSuperuser(me) && (
                      <>
                        <RowLink href={`/settings/roles/${role.id}/edit`}>
                          Edit
                        </RowLink>
                        {/*
                          BR-60 — a role held by any account cannot be deleted.
                          Its own permission grants are not usage; they cascade
                          away with it.
                        */}
                        <DeleteNamedEntry
                          entryId={role.id}
                          name={role.label}
                          editHref={`/settings/roles/${role.id}/edit`}
                          noun="role"
                          deactivateHint="it is no longer offered when creating an account, while everyone already holding it keeps it."
                          deleteAction={deleteRoleAction}
                          loadUsage={loadRoleUsage}
                        />
                      </>
                    )}
                  </RowActions>
                </Td>
              </Tr>
            ))}
          </Table>
        )}

        <p className="text-[11.5px] leading-relaxed text-faint">
          An unrestricted role passes every permission check regardless of what
          is listed against it, so its grants are shown for reference only. The
          role you hold yourself cannot be edited.
        </p>
      </PageBody>
    </>
  );
}
