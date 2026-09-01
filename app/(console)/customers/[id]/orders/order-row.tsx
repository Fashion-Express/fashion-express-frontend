"use client";

import { useState, useTransition } from "react";
import { StatusPill } from "@/components/ui/surfaces";
import { RowActions, RowLink, Td, Tr } from "@/components/ui/table";
import type { SaleItem } from "@/lib/api/sales";
import { formatDate } from "@/lib/format/date";
import { formatMoney, formatQuantity, isZero } from "@/lib/format/money";

/** Every column in the order table, so the detail row spans the full width. */
const COLUMNS = 7;

export type OrderRowData = {
  id: string;
  sale_number: string;
  finalized_at: string;
  total_amount: string;
  amount_paid: string;
  balance_due: string;
};

/**
 * One finalized order, with its lines behind a disclosure.
 *
 * The old console nested every order's products into the table permanently,
 * which stops being readable once a customer has more than a handful of orders.
 * The lines are fetched the first time a row is opened and kept, so re-opening
 * is free and a page load costs nothing extra.
 */
export function OrderRow({
  order,
  href,
  loadItems,
}: {
  order: OrderRowData;
  href: string;
  /**
   * Passed in rather than imported so this component stays a dumb renderer —
   * the Server Action lives with the page that owns the permission check.
   */
  loadItems: (saleId: string) => Promise<{ items: SaleItem[] } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SaleItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  const settled = isZero(order.balance_due);

  function toggle() {
    const opening = !open;
    setOpen(opening);

    // Only ever fetched once. A closed-and-reopened row shows what it already
    // has; a failed one retries, since the error may have been transient.
    if (!opening || (items !== null && !error)) return;

    setError(null);
    startLoading(async () => {
      const result = await loadItems(order.id);
      if ("error" in result) setError(result.error);
      else setItems(result.items);
    });
  }

  return (
    <>
      <Tr>
        <Td mono>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-expanded={open}
              aria-label={`${open ? "Hide" : "Show"} items on ${order.sale_number}`}
              className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-line text-[10px] leading-none text-muted transition-colors hover:bg-subtle"
            >
              <span aria-hidden>{open ? "−" : "+"}</span>
            </button>
            <RowLink href={href}>{order.sale_number}</RowLink>
          </div>
        </Td>
        <Td mono>{formatDate(order.finalized_at)}</Td>
        <Td align="right" mono>{formatMoney(order.total_amount)}</Td>
        <Td align="right" mono>{formatMoney(order.amount_paid)}</Td>
        <Td align="right" mono>{formatMoney(order.balance_due)}</Td>
        <Td>
          <StatusPill tone={settled ? "success" : "danger"}>
            {settled ? "Settled" : "Due"}
          </StatusPill>
        </Td>
        <Td align="right">
          <RowActions>
            <RowLink href={href}>View</RowLink>
          </RowActions>
        </Td>
      </Tr>

      {open && (
        <tr className="border-b border-line last:border-0">
          <td colSpan={COLUMNS} className="bg-subtle px-3 py-0">
            <div className="py-3 pl-7">
              {loading && (
                <p className="text-[12px] text-muted">Loading items…</p>
              )}

              {error && <p className="text-[12px] text-danger">{error}</p>}

              {!loading && !error && items?.length === 0 && (
                <p className="text-[12px] text-muted">This order has no line items.</p>
              )}

              {!loading && !error && items && items.length > 0 && (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <ItemTh>Item</ItemTh>
                      <ItemTh align="right">Quantity</ItemTh>
                      <ItemTh align="right">Unit price</ItemTh>
                      <ItemTh align="right">Subtotal</ItemTh>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <ItemTd>
                          {/* BR-04 — a machine line has no product to point
                              at; its description IS the machine. */}
                          {item.item_type_code === "inventory"
                            ? item.part_name
                            : item.description}
                          {item.part_code && (
                            <span className="ml-2 font-mono text-[10.5px] text-faint">
                              {item.part_code}
                            </span>
                          )}
                        </ItemTd>
                        <ItemTd align="right" mono>{formatQuantity(item.quantity)}</ItemTd>
                        <ItemTd align="right" mono>{formatMoney(item.unit_price)}</ItemTd>
                        <ItemTd align="right" mono>{formatMoney(item.line_total)}</ItemTd>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ItemTh({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-2 pb-1.5 font-mono text-[9.5px] leading-tight font-medium tracking-[0.07em] text-faint uppercase ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function ItemTd({
  children,
  align = "left",
  mono = false,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      className={`px-2 py-1.5 text-[12px] text-ink-soft ${mono ? "font-mono tabular-nums" : ""} ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </td>
  );
}
