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
import { DeleteCategory } from "./delete-category";

export const metadata: Metadata = { title: "Category" };

export default async function CategoryDetailPage(
  props: PageProps<"/settings/categories/[id]">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  const mayManage = can(me, "manage_referencedata");

  let category: ReferenceRow;
  try {
    category = await getReference("categories", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  // BR-60 — what depends on this entry. Never fatal: the category still reads
  // without it.
  const usage = await getReferenceUsage("categories", id).catch(() => null);
  const rows = Object.entries(usage?.byTable ?? {});

  return (
    <>
      <PageHeader
        eyebrow="Settings / Product categories"
        title={category.name ?? "Category"}
        meta={
          <StatusPill tone={category.is_active ? "success" : "neutral"}>
            {category.is_active ? "Active" : "Inactive"}
          </StatusPill>
        }
        actions={
          <>
            <ButtonLink href="/settings/categories" variant="outline">
              ← Back
            </ButtonLink>
            {mayManage && (
              <ButtonLink href={`/settings/categories/${id}/edit`}>Edit</ButtonLink>
            )}
            {mayManage && (
              <DeleteCategory
                categoryId={id}
                name={category.name ?? "This category"}
                editHref={`/settings/categories/${id}/edit`}
                variant="danger"
              />
            )}
          </>
        }
      />

      <PageBody>
        <Card title="Category">
          <DetailList
            columns={2}
            items={[
              { label: "Name", value: category.name || "—" },
              { label: "Status", value: category.is_active ? "Active" : "Inactive" },
              { label: "Description", value: category.description || "—" },
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
                    : "Nothing references this category, so it can be deleted outright rather than deactivated."
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
                A category in use cannot be deleted. Deactivating it removes it from
                the pickers while every product already filed under it keeps its
                meaning.
              </p>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
