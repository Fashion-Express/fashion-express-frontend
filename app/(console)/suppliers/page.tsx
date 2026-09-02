import type { Metadata } from "next";
import { listSuppliers } from "@/lib/api/suppliers";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { formatMoney, isPositive, sum } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatTile } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteSupplier } from "./[id]/delete-supplier";

export const metadata: Metadata = { title: "Suppliers" };

export default async function SuppliersPage(props: PageProps<"/suppliers">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const page = pageParam(params.page);

  const me = await requireSession();
  const suppliers = await listSuppliers({ page, search });

  // Suppliers are not shop-scoped (FR-11.4) — buying is done centrally — so
  // there is no shop filter on this screen and none is preserved in its links.
  const pageDue = sum(suppliers.items.map((s) => s.total_due));

  return (
    <>
      <PageHeader
        eyebrow="Suppliers"
        title="Manage your supplier relationships"
        meta="Purchasing is business-wide, not per shop."
        actions={
          can(me, "add_supplier") ? (
            <ButtonLink href="/suppliers/new">+ Add supplier</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        {suppliers.items.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Suppliers" value={String(suppliers.total)} tone="accent" />
            <StatTile
              label="Purchased (this page)"
              value={formatMoney(sum(suppliers.items.map((s) => s.total_purchased)), { compact: true })}
              tone="info"
            />
            <StatTile
              label="Owed (this page)"
              value={formatMoney(pageDue, { compact: true })}
              note="Derived from the payment rows, never entered"
              tone={isPositive(pageDue) ? "danger" : "success"}
            />
          </div>
        )}

        <FilterBar
          basePath="/suppliers"
          values={{ search }}
          preserve={[]}
          fields={[
            { type: "search", name: "search", placeholder: "Search suppliers by name or phone" },
          ]}
        />

        {suppliers.items.length === 0 ? (
          <EmptyState
            title={search ? "No suppliers match that search" : "No suppliers yet"}
            description={
              search
                ? "Search matches a supplier name or phone number."
                : "Add the first supplier to start recording purchases against them."
            }
            action={
              can(me, "add_supplier") && !search ? (
                <ButtonLink href="/suppliers/new">+ Add supplier</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Email</Th>
                  <Th align="right">Purchases</Th>
                  <Th align="right">Total purchased</Th>
                  <Th align="right">Total paid</Th>
                  <Th align="right">Total due</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {suppliers.items.map((supplier) => (
                <Tr key={supplier.id}>
                  <Td strong>{supplier.name}</Td>
                  <Td mono>{supplier.phone}</Td>
                  <Td className="max-w-[200px] truncate">{supplier.email || "—"}</Td>
                  <Td align="right" mono>{supplier.purchase_count}</Td>
                  <Td align="right" mono>{formatMoney(supplier.total_purchased)}</Td>
                  <Td align="right" mono>{formatMoney(supplier.total_paid)}</Td>
                  <Td
                    align="right"
                    mono
                    className={isPositive(supplier.total_due) ? "text-danger" : undefined}
                  >
                    {formatMoney(supplier.total_due)}
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/suppliers/${supplier.id}`}>View</RowLink>
                      {can(me, "change_supplier") && (
                        <>
                          <span className="text-faint">·</span>
                          <RowLink href={`/suppliers/${supplier.id}/edit`}>Edit</RowLink>
                        </>
                      )}
                      {can(me, "delete_supplier") && (
                        <>
                          <span className="text-faint">·</span>
                          {/* The dialog names what the delete cascades to, and
                              `purchase_count` is already on the row — so the
                              cost is stated without a second call. */}
                          <DeleteSupplier
                            supplierId={supplier.id}
                            name={supplier.name}
                            purchaseCount={supplier.purchase_count}
                            variant="ghost"
                          />
                        </>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={suppliers}
              noun="suppliers"
              basePath="/suppliers"
              searchParams={{ search }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
