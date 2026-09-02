import type { Metadata } from "next";
import { listReference } from "@/lib/api/reference";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteNamedEntry } from "@/components/reference/delete-named-entry";
import { deleteJobPositionAction, loadJobPositionUsage } from "./actions";

export const metadata: Metadata = { title: "Job positions" };

/**
 * FR-12.2 — the job position master list.
 *
 * Reads are open on the API, so this renders for anyone signed in; the write
 * actions are drawn only for `manage_referencedata`, which is what the API's
 * own write routes require.
 *
 * The list is NOT filtered to active by default. §23.6 hides inactive entries
 * from pickers, not from reads — an administration screen that could not see
 * what it had deactivated would be unable to reactivate it.
 */
export default async function JobPositionsPage(
  props: PageProps<"/settings/job-positions">,
) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const page = pageParam(params.page);

  const me = await requireSession();
  const mayManage = can(me, "manage_referencedata");

  const entries = await listReference("job-positions", {
    page,
    search,
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  });

  const filtered = Boolean(search || status);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Job positions"
        meta="Optional on a staff account — accounts created without one stay valid."
        actions={
          mayManage ? (
            <ButtonLink href="/settings/job-positions/new">+ Add job position</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        <FilterBar
          basePath="/settings/job-positions"
          values={{ search, status }}
          fields={[
            {
              type: "search",
              name: "search",
              placeholder: "Search job positions by name",
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
            title={filtered ? "No job positions match that filter" : "No job positions yet"}
            description={
              filtered
                ? "Try a different name, or clear the status filter."
                : "A job position names what a staff member does. It is optional, so an account can be created without one."
            }
            action={
              mayManage && !filtered ? (
                <ButtonLink href="/settings/job-positions/new">+ Add job position</ButtonLink>
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
                      <RowLink href={`/settings/job-positions/${entry.id}`}>View</RowLink>
                      {mayManage && (
                        <>
                          <RowLink href={`/settings/job-positions/${entry.id}/edit`}>
                            Edit
                          </RowLink>
                          <DeleteNamedEntry
                            entryId={entry.id}
                            name={entry.name ?? "This job position"}
                            editHref={`/settings/job-positions/${entry.id}/edit`}
                            noun="job position"
                            deactivateHint="it disappears from the account forms while every staff member already holding it keeps it."
                            deleteAction={deleteJobPositionAction}
                            loadUsage={loadJobPositionUsage}
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
              noun="job positions"
              singular="job position"
              basePath="/settings/job-positions"
              searchParams={{ search, status }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
