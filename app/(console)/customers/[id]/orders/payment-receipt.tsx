"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert, DetailList } from "@/components/ui/surfaces";
import type { PaymentBatch } from "@/lib/api/customers";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";

/**
 * BR-19's combined receipt: one lump sum, and every invoice it was spread
 * across. The account table can only say how many invoices an event settled —
 * this says which ones, and what each of them got.
 *
 * Read when the dialog opens rather than with the page, for the same reason the
 * order lines are: most visits never open it.
 */
export function PaymentReceipt({
  customerId,
  batchRef,
  loadBatch,
}: {
  customerId: string;
  batchRef: string;
  loadBatch: (
    customerId: string,
    batchRef: string,
  ) => Promise<{ batch: PaymentBatch } | { error: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [batch, setBatch] = useState<PaymentBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function open_() {
    setOpen(true);
    if (batch) return; // Already read once; the event is immutable.

    setError(null);
    startLoading(async () => {
      const result = await loadBatch(customerId, batchRef);
      if ("error" in result) setError(result.error);
      else setBatch(result.batch);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open_}
        className="cursor-pointer rounded-sm bg-transparent p-0 font-mono text-[12px] text-accent hover:underline"
      >
        {batchRef}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Payment receipt"
        width="md"
      >
        <div className="flex flex-col gap-4">
          {loading && <p className="text-[12.5px] text-muted">Loading receipt…</p>}

          {error && <Alert tone="danger">{error}</Alert>}

          {batch && (
            <>
              <DetailList
                columns={2}
                items={[
                  { label: "Reference", value: batch.batch_ref, mono: true },
                  { label: "Date", value: formatDate(batch.payment_date), mono: true },
                  { label: "Method", value: batch.method_label },
                  {
                    label: "Total",
                    value: formatMoney(batch.total_amount),
                    mono: true,
                  },
                  { label: "Customer", value: batch.customer_name },
                  { label: "Recorded by", value: batch.recorded_by || "—" },
                ]}
              />

              {batch.notes && (
                <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
                  {batch.notes}
                </p>
              )}

              <div className="overflow-hidden rounded-control border border-line">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line bg-subtle">
                      <Th>Invoice</Th>
                      <Th>Receipt</Th>
                      <Th align="right">Applied</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.allocations.map((allocation) => (
                      <tr
                        key={allocation.receipt_number}
                        className="border-b border-line last:border-0"
                      >
                        <Td mono>{allocation.sale_number}</Td>
                        <Td mono>{allocation.receipt_number}</Td>
                        <Td align="right" mono>
                          {formatMoney(allocation.amount)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11.5px] leading-relaxed text-faint">
                The amount was applied to the oldest unpaid invoice first, and each
                invoice it touched got its own receipt.
              </p>
            </>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`px-3 py-2 font-mono text-[9.5px] leading-tight font-medium tracking-[0.07em] text-muted uppercase ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({
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
      className={`px-3 py-2.5 text-[12px] text-ink-soft ${mono ? "font-mono tabular-nums" : ""} ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </td>
  );
}
