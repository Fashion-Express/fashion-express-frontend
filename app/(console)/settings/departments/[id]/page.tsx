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
import { deleteDepartmentAction, loadDepartmentUsage } from "../actions";

export const metadata: Metadata = { title: "Department" };

export default async function DepartmentDetailPage(
  props: PageProps<"/settings/departments/[id]">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  const mayManage = can(me, "manage_referencedata");

  let entry: ReferenceRow;
  try {
    entry = await getReference("departments", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  // BR-60 — what depends on this entry. Never fatal: the department still reads
  // without it.
  const usage = await getReferenceUsage("departments", id).catch(() => null);
  const rows = Object.entries(usage?.byTable ?? {});

  return (
    <>
      <PageHeader
        eyebrow="Settings / Departments"
        title={entry.name ?? "Department"}
        meta={
          <StatusPill tone={entry.is_active ? "success" : "neutral"}>
            {entry.is_active ? "Active" : "Inactive"}
          </StatusPill>
        }
        actions={
          <>
            <ButtonLink href="/settings/departments" variant="outline">
              ← Back
            </ButtonLink>
            {mayManage && (
              <ButtonLink href={`/settings/departments/${id}/edit`}>Edit</ButtonLink>
            )}
            {mayManage && (
              <DeleteNamedEntry
                entryId={id}
                name={entry.name ?? "This department"}
                editHref={`/settings/departments/${id}/edit`}
                noun="department"
                deactivateHint="it disappears from the account forms while every staff member already assigned to it keeps it."
                deleteAction={deleteDepartmentAction}
                loadUsage={loadDepartmentUsage}
                variant="danger"
              />
            )}
          </>
        }
      />

      <PageBody>
        <Card title="Department">
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
                    : "Nothing references this department, so it can be deleted outright rather than deactivated."
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
                A department in use cannot be deleted. Deactivating it removes it from the account forms while every staff member already assigned to it keeps it.
              </p>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
