import type { Metadata } from "next";
import { listInventory } from "@/lib/api/inventory";
import { categories, optionLabel } from "@/lib/api/reference";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { formatMoney, formatQuantity } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage(props: PageProps<"/inventory">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const categoryId = firstParam(params.categoryId);
  const stock = firstParam(params.stock);
  const shopId = firstParam(params.shopId);
  const page = pageParam(params.page);

  const me = await requireSession();
  const [inventory, categoryOptions] = await Promise.all([
    listInventory({
      page,
      search,
      shopId,
      categoryId,
      lowStock: stock === "low" ? true : undefined,
    }),
    categories().catch(() => []),
  ]);

  const { summary } = inventory;
  const filtered = Boolean(search || categoryId || stock);

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Products and stock levels"
        meta="Stock belongs to a shop — the same product in two shops is two records."
        actions={
          can(me, "add_inventoryitem") ? (
            <ButtonLink href="/inventory/new">+ Add item</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        {/* FR-04.4 — the summary describes the current FILTER, not this page. */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Products" value={summary.product_count} note={filtered ? "Matching this filter" : "All products"} tone="accent" />
          <StatTile label="Total quantity" value={formatQuantity(summary.total_quantity)} note={`${summary.total_boxes} boxes`} tone="neutral" />
          <StatTile label="Stock value" value={formatMoney(summary.total_value, { compact: true })} tone="warning" />
          <StatTile label="Low stock" value={summary.low_stock_count} note="At or below their own minimum" tone={Number(summary.low_stock_count) > 0 ? "danger" : "success"} />
        </div>

        <FilterBar
          basePath="/inventory"
          values={{ search, categoryId, stock }}
          fields={[
            { type: "search", name: "search", placeholder: "Search name, code or category" },
            {
              type: "select",
              name: "categoryId",
              label: "All categories",
              options: categoryOptions.map((c) => ({ value: c.id, label: optionLabel(c) })),
            },
            {
              type: "select",
              name: "stock",
              label: "All stock",
              width: "w-[140px]",
              options: [{ value: "low", label: "Low stock only" }],
            },
          ]}
        />

        {inventory.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No products match that filter" : "No products yet"}
            description={
              filtered
                ? "Search matches a product name, code or category."
                : "Add the first product to start tracking stock."
            }
            action={
              can(me, "add_inventoryitem") && !filtered ? (
                <ButtonLink href="/inventory/new">+ Add item</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Code</Th>
                  <Th>Name</Th>
                  <Th>Category</Th>
                  <Th>Shop</Th>
                  <Th align="right">Quantity</Th>
                  <Th align="right">Boxes</Th>
                  <Th align="right">Purchase</Th>
                  <Th align="right">Unit price</Th>
                  <Th align="right">Value</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {inventory.items.map((item) => (
                <Tr key={item.id}>
                  <Td mono className="text-accent">{item.part_code}</Td>
                  <Td strong>{item.part_name}</Td>
                  <Td>{item.category_name ?? "—"}</Td>
                  <Td>{item.shop_name}</Td>
                  <Td align="right" mono>
                    {formatQuantity(item.quantity)}
                    <span className="ml-1 text-faint">{item.unit_label}</span>
                  </Td>
                  <Td align="right" mono>{item.box_count}</Td>
                  <Td align="right" mono>{formatMoney(item.purchase_price)}</Td>
                  <Td align="right" mono>{formatMoney(item.unit_price)}</Td>
                  <Td align="right" mono>{formatMoney(item.stock_value)}</Td>
                  <Td>
                    {/* BR-24 — low is decided against this item's OWN minimum,
                        per shop (BR-52), and the API has already decided it. */}
                    <StatusPill tone={item.is_low_stock ? "danger" : "success"}>
                      {item.is_low_stock ? "Low" : "In stock"}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/inventory/${item.id}/movements`}>History</RowLink>
                      {can(me, "change_inventoryitem") && (
                        <>
                          <span className="text-faint">·</span>
                          <RowLink href={`/inventory/${item.id}/edit`}>Edit</RowLink>
                        </>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={inventory}
              noun="products"
              singular="product"
              basePath="/inventory"
              searchParams={{ search, categoryId, stock, shopId }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
