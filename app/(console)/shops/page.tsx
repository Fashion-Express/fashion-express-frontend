import type { Metadata } from "next";
import { listShops } from "@/lib/api/shops";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { ShopFilters } from "./filters";

export const metadata: Metadata = { title: "Shops" };

export default async function ShopsPage(props: PageProps<"/shops">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const status = firstParam(params.status);
  const page = pageParam(params.page);

  const me = await requireSession();
  const shops = await listShops({
    page,
    search,
    // The API takes true/false and rejects anything else, so an absent filter
    // must be omitted rather than sent as an empty string.
    isActive: status === "active" ? true : status === "inactive" ? false : undefined,
  });

  return (
    <>
      <PageHeader
        eyebrow="Shops"
        title="Manage your shop locations"
        meta="Customers, stock and sales each belong to exactly one shop."
        actions={
          can(me, "add_shop") ? <ButtonLink href="/shops/new">+ Add shop</ButtonLink> : null
        }
      />

      <PageBody>
        <ShopFilters search={search} status={status} />

        {shops.items.length === 0 ? (
          <EmptyState
            title={search || status ? "No shops match that filter" : "No shops yet"}
            description={
              search || status
                ? "Try a different name, or clear the filters."
                : "A shop scopes customers, stock and sales. Add the first one to get started."
            }
            action={
              can(me, "add_shop") && !search && !status ? (
                <ButtonLink href="/shops/new">+ Add shop</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Name</Th>
                  <Th>Description</Th>
                  <Th align="right">Customers</Th>
                  <Th align="right">Products</Th>
                  <Th align="right">Sales</Th>
                  <Th align="right">Staff</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {shops.items.map((shop) => (
                <Tr key={shop.id}>
                  <Td strong>{shop.name}</Td>
                  <Td className="max-w-[280px] truncate">{shop.description || "—"}</Td>
                  <Td align="right" mono>{shop.customer_count}</Td>
                  <Td align="right" mono>{shop.inventory_count}</Td>
                  <Td align="right" mono>{shop.sale_count}</Td>
                  <Td align="right" mono>{shop.staff_count}</Td>
                  <Td>
                    <StatusPill tone={shop.is_active ? "success" : "neutral"}>
                      {shop.is_active ? "Active" : "Inactive"}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/shops/${shop.id}`}>View</RowLink>
                      {can(me, "change_shop") && (
                        <>
                          <span className="text-faint">·</span>
                          <RowLink href={`/shops/${shop.id}/edit`}>Edit</RowLink>
                        </>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={shops}
              noun="shops"
              basePath="/shops"
              searchParams={{ search, status }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
