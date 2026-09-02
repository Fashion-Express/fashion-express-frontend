import type { Metadata } from "next";
import { listReference } from "@/lib/api/reference";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteNamedEntry } from "@/components/reference/delete-named-entry";
import { deleteDepartmentAction, loadDepartmentUsage } from "./actions";

export const metadata: Metadata = { title: "Departments" };

/**
 * FR-12.2 — the department master list.
 *
 * Reads are open on the API, so this renders for anyone signed in; the write
 * actions are drawn only for `manage_referencedata`, which is what the API's
 * own write routes require.
 *
 * The list is NOT filtered to active by default. §23.6 hides inactive entries
 * from pickers, not from reads — an administration screen that could not see
 * what it had deactivated would be unable to reactivate it.
 */
export default async function DepartmentsPage(
  props: PageProps<"/settings/departments">,
) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const page = pageParam(params.page);

  const me = await requireSession();
  const mayManage = can(me, "manage_referencedata");

  const entries = await listReference("departments", {
    page,
    search,
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  });

  const filtered = Boolean(search || status);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Departments"
        meta="Optional on a staff account — accounts created without one stay valid."
        actions={
          mayManage ? (
            <ButtonLink href="/settings/departments/new">+ Add department</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        <FilterBar
          basePath="/settings/departments"
          values={{ search, status }}
          fields={[
            {
              type: "search",
              name: "search",
              placeholder: "Search departments by name",
            },
            {
              type: "select",
              name: "status",
              label: "All statuses",
              options: [
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ],
            },
          ]}
        />

        {entries.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No departments match that filter" : "No departments yet"}
            description={
              filtered
                ? "Try a different name, or clear the status filter."
                : "A department groups staff accounts. It is optional, so an account can be created without one."
            }
            action={
              mayManage && !filtered ? (
                <ButtonLink href="/settings/departments/new">+ Add department</ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {entries.items.map((entry) => (
                <Tr key={entry.id}>
                  <Td strong>{entry.name}</Td>
                  <Td>
                    <StatusPill tone={entry.is_active ? "success" : "neutral"}>
                      {entry.is_active ? "Active" : "Inactive"}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/settings/departments/${entry.id}`}>View</RowLink>
                      {mayManage && (
                        <>
                          <RowLink href={`/settings/departments/${entry.id}/edit`}>
                            Edit
                          </RowLink>
                          <DeleteNamedEntry
                            entryId={entry.id}
                            name={entry.name ?? "This department"}
                            editHref={`/settings/departments/${entry.id}/edit`}
                            noun="department"
                            deactivateHint="it disappears from the account forms while every staff member already assigned to it keeps it."
                            deleteAction={deleteDepartmentAction}
                            loadUsage={loadDepartmentUsage}
                          />
                        </>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={entries}
              noun="departments"
              singular="department"
              basePath="/settings/departments"
              searchParams={{ search, status }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
