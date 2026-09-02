import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import {
  getReference,
  getReferenceUsage,
  type ReferenceRow,
} from "@/lib/api/reference";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  DetailList,
  EmptyState,
  PageBody,
  PageHeader,
  StatusPill,
} from "@/components/ui/surfaces";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteNamedEntry } from "@/components/reference/delete-named-entry";
import { deleteJobPositionAction, loadJobPositionUsage } from "../actions";

export const metadata: Metadata = { title: "Job position" };

export default async function JobPositionDetailPage(
  props: PageProps<"/settings/job-positions/[id]">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  const mayManage = can(me, "manage_referencedata");

  let entry: ReferenceRow;
  try {
    entry = await getReference("job-positions", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  // BR-60 — what depends on this entry. Never fatal: the job position still reads
  // without it.
  const usage = await getReferenceUsage("job-positions", id).catch(() => null);
  const rows = Object.entries(usage?.byTable ?? {});

  return (
    <>
      <PageHeader
        eyebrow="Settings / Job positions"
        title={entry.name ?? "Job position"}
        meta={
          <StatusPill tone={entry.is_active ? "success" : "neutral"}>
            {entry.is_active ? "Active" : "Inactive"}
          </StatusPill>
        }
        actions={
          <>
            <ButtonLink href="/settings/job-positions" variant="outline">
              ← Back
            </ButtonLink>
            {mayManage && (
              <ButtonLink href={`/settings/job-positions/${id}/edit`}>Edit</ButtonLink>
            )}
            {mayManage && (
              <DeleteNamedEntry
                entryId={id}
                name={entry.name ?? "This job position"}
                editHref={`/settings/job-positions/${id}/edit`}
                noun="job position"
                deactivateHint="it disappears from the account forms while every staff member already holding it keeps it."
                deleteAction={deleteJobPositionAction}
                loadUsage={loadJobPositionUsage}
                variant="danger"
              />
            )}
          </>
        }
      />

      <PageBody>
        <Card title="Job position">
          <DetailList
            columns={2}
            items={[
              { label: "Name", value: entry.name || "—" },
              { label: "Status", value: entry.is_active ? "Active" : "Inactive" },
            ]}
          />
        </Card>

        <Card title="Where it is used" bodyClassName="p-0">
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Not used by any record"
                description={
                  usage === null
                    ? "The usage check could not be completed."
                    : "Nothing references this job position, so it can be deleted outright rather than deactivated."
                }
              />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Table</Th>
                    <Th align="right">Records</Th>
                  </>
                }
              >
                {rows.map(([table, count]) => (
                  <Tr key={table}>
                    <Td>{table.replace(/_/g, " ")}</Td>
                    <Td align="right" mono>{count}</Td>
                  </Tr>
                ))}
              </Table>
              <p className="px-3 pt-1 pb-2 text-[11.5px] leading-relaxed text-faint">
                A job position in use cannot be deleted. Deactivating it removes it from the account forms while every staff member already holding it keeps it.
              </p>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
