import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getInventoryItem, listMovements } from "@/lib/api/inventory";
import { pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney, formatQuantity } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, DetailList, EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteItem } from "./delete-item";

export const metadata: Metadata = { title: "Stock history" };

export default async function MovementsPage(props: PageProps<"/inventory/[id]/movements">) {
  const { id } = await props.params;
  const params = await props.searchParams;
  const page = pageParam(params.page);

  const me = await requireSession();

  let item;
  try {
    item = await getInventoryItem(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const movements = await listMovements(id, page);
  const totalPages = Math.max(1, Math.ceil(movements.total / movements.pageSize));

  return (
    <>
      <PageHeader
        eyebrow={`Inventory / Stock history · ${item.part_code}`}
        title={item.part_name}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={item.is_low_stock ? "danger" : "success"}>
              {item.is_low_stock ? "Low stock" : "In stock"}
            </StatusPill>
            <span>{item.shop_name}</span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/inventory" variant="outline">← Back</ButtonLink>
            {can(me, "change_inventoryitem") && (
              <ButtonLink href={`/inventory/${item.id}/edit`}>Edit item</ButtonLink>
            )}
            {can(me, "delete_inventoryitem") && (
              <DeleteItem itemId={item.id} name={item.part_name} />
            )}
          </>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Current stock" value={`${formatQuantity(item.quantity)} ${item.unit_label}`} note={`${item.box_count} boxes`} tone="accent" />
          <StatTile label="Minimum stock" value={String(item.minimum_stock)} note="Low stock threshold" tone="warning" />
          <StatTile label="Unit price" value={formatMoney(item.unit_price)} note={`Purchased at ${formatMoney(item.purchase_price)}`} tone="neutral" />
          <StatTile label="Stock value" value={formatMoney(item.stock_value)} tone="success" />
        </div>

        <Card title="Product">
          <DetailList
            columns={3}
            items={[
              { label: "Code", value: item.part_code, mono: true },
              { label: "Category", value: item.category_name ?? "—" },
              { label: "Supplier", value: item.supplier_name ?? "Not linked" },
              { label: "Shop", value: item.shop_name },
              { label: "Unit", value: item.unit_label },
            ]}
          />
        </Card>

        <Card title="Movement history" bodyClassName="p-0">
          {movements.items.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No movements recorded"
                description="Movements are written automatically by sales, edits and adjustments — never by hand."
              />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Date &amp; time</Th>
                    <Th>Type</Th>
                    <Th align="right">Quantity</Th>
                    <Th align="right">Boxes</Th>
                    <Th align="right">Previous</Th>
                    <Th align="right">New</Th>
                    <Th>Reason</Th>
                    <Th>By</Th>
                  </>
                }
              >
                {movements.items.map((move) => {
                  /*
                   * `quantity` is the ABSOLUTE amount moved; the sign comes from
                   * the transaction type's direction (+1 in, −1 out, 0 either).
                   * Rendered from `direction` rather than by comparing the code
                   * to a string (FR-12.7.2) — the meaning lives in the reference
                   * table, which is the reason that table exists.
                   */
                  const sign = move.direction > 0 ? "+" : move.direction < 0 ? "−" : "±";
                  const tone = move.direction > 0 ? "success" : move.direction < 0 ? "danger" : "warning";

                  // Each row carries only one dimension: a unit movement zeroes
                  // the box columns and vice versa. That is what lets a
                  // five-unit move be told from a five-box one.
                  const isBoxMove = Number(move.quantity) === 0 && move.box_quantity !== 0;

                  return (
                    <Tr key={move.id}>
                      <Td mono>{formatDateTime(move.created_at)}</Td>
                      <Td>
                        <StatusPill tone={tone}>{move.type_label}</StatusPill>
                      </Td>
                      <Td align="right" mono className={move.direction < 0 ? "text-danger" : move.direction > 0 ? "text-success" : undefined}>
                        {isBoxMove ? "—" : `${sign}${formatQuantity(move.quantity)}`}
                      </Td>
                      <Td align="right" mono>
                        {isBoxMove ? `${sign}${move.box_quantity}` : "—"}
                      </Td>
                      <Td align="right" mono>
                        {isBoxMove ? move.previous_box_quantity : formatQuantity(move.previous_quantity)}
                      </Td>
                      <Td align="right" mono strong>
                        {isBoxMove ? move.new_box_quantity : formatQuantity(move.new_quantity)}
                      </Td>
                      <Td>{move.reason}</Td>
                      <Td mono>{move.created_by}</Td>
                    </Tr>
                  );
                })}
              </Table>

              <div className="flex items-center justify-between pt-3">
                <p className="font-mono text-[11.5px] text-faint">
                  Showing {movements.items.length} of {movements.total} movements
                </p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <ButtonLink href={`/inventory/${id}/movements?page=${page - 1}`} variant="outline" size="sm">
                      ← Newer
                    </ButtonLink>
                  )}
                  {page < totalPages && (
                    <ButtonLink href={`/inventory/${id}/movements?page=${page + 1}`} variant="outline" size="sm">
                      Older →
                    </ButtonLink>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
