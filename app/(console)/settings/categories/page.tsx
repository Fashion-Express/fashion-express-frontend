import type { Metadata } from "next";
import { listReference } from "@/lib/api/reference";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import {
  EmptyState,
  PageBody,
  PageHeader,
  StatusPill,
} from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteCategory } from "./[id]/delete-category";

export const metadata: Metadata = { title: "Product categories" };

/**
 * FR-12.4.1 — the product category master list.
 *
 * Reads are open on the API, so this renders for anyone signed in; the write
 * actions are drawn only for `manage_referencedata`, which is what the API's
 * own write routes require.
 *
 * The list is NOT filtered to active by default. §23.6 hides inactive entries
 * from pickers, not from reads — an administration screen that could not see
 * what it had deactivated would be unable to reactivate it.
 */
export default async function CategoriesPage(
  props: PageProps<"/settings/categories">,
) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const page = pageParam(params.page);

  const me = await requireSession();
  const mayManage = can(me, "manage_referencedata");

  const categories = await listReference("categories", {
    page,
    search,
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  });

  const filtered = Boolean(search || status);

  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Product categories"
        meta="Shared across all shops — inventory is shop-scoped, its taxonomy is not."
        actions={
          mayManage ? (
            <ButtonLink href="/settings/categories/new">+ Add category</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        <FilterBar
          basePath="/settings/categories"
          values={{ search, status }}
          fields={[
            { type: "search", name: "search", placeholder: "Search categories by name" },
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

        {categories.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No categories match that filter" : "No categories yet"}
            description={
              filtered
                ? "Try a different name, or clear the status filter."
                : "A category groups products for reporting. Inventory items can also be left uncategorised."
            }
            action={
              mayManage && !filtered ? (
                <ButtonLink href="/settings/categories/new">+ Add category</ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {categories.items.map((category) => (
                <Tr key={category.id}>
                  <Td strong>{category.name}</Td>
                  <Td className="max-w-[420px] truncate">
                    {category.description || "—"}
                  </Td>
                  <Td>
                    <StatusPill tone={category.is_active ? "success" : "neutral"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/settings/categories/${category.id}`}>View</RowLink>
                      {mayManage && (
                        <>
                          <RowLink href={`/settings/categories/${category.id}/edit`}>
                            Edit
                          </RowLink>
                          <DeleteCategory
                            categoryId={category.id}
                            name={category.name ?? "This category"}
                            editHref={`/settings/categories/${category.id}/edit`}
                          />
                        </>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={categories}
              noun="categories"
              singular="category"
              basePath="/settings/categories"
              searchParams={{ search, status }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
