import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { listLedger } from "@/lib/api/reports";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format/date";
import { formatMoney, isNegative } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Alert, EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Ledger" };

export default async function LedgerPage(props: PageProps<"/reports/ledger">) {
  const params = await props.searchParams;
  const entryType = firstParam(params.entryType) as "credit" | "debit" | undefined;
  const source = firstParam(params.source);
  const reference = firstParam(params.reference);
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const page = pageParam(params.page);

  const me = await requireSession();
  if (!can(me, "view_ledger") || !isManager(me)) {
    forbidden("The ledger is manager-only (FR-09.5).");
  }

  const ledger = await listLedger({ page, entryType, source, reference, from, to });
  const filtered = Boolean(entryType || source || reference || from || to);

  return (
    <>
      <PageHeader
        eyebrow="Reports / Ledger"
        title="Ledger"
        meta="Every credit and debit in the system, newest first."
        actions={<ButtonLink href="/reports" variant="outline">← Back to reports</ButtonLink>}
      />

      <PageBody>
        {/* `totals` covers the WHOLE ledger; `filtered` covers what was asked
            for. Labelling them apart matters — "the current balance" means the
            business's balance, and a filtered subtotal under that label would
            be a much more confusing number. */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Current balance"
            value={formatMoney(ledger.totals.balance, { compact: true })}
            note="Whole ledger — not filtered"
            tone={isNegative(ledger.totals.balance) ? "danger" : "success"}
          />
          <StatTile label="Total credits" value={formatMoney(ledger.totals.total_credits, { compact: true })} tone="success" />
          <StatTile label="Total debits" value={formatMoney(ledger.totals.total_debits, { compact: true })} tone="danger" />
        </div>

        {filtered && (
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Net (this filter)" value={formatMoney(ledger.filtered.net, { compact: true })} tone="info" />
            <StatTile label="Gross (this filter)" value={formatMoney(ledger.filtered.gross, { compact: true })} tone="info" />
          </div>
        )}

        <Alert tone="info">
          The ledger is append-only. Entries appear because money moved somewhere else —
          a sale payment, an expense, a supplier payment — and no one posts a line by
          hand.
        </Alert>

        <FilterBar
          basePath="/reports/ledger"
          values={{ entryType, source, reference, from, to }}
          preserve={[]}
          fields={[
            { type: "search", name: "reference", placeholder: "Search a receipt or reference" },
            {
              type: "select",
              name: "entryType",
              label: "All entries",
              width: "w-[140px]",
              options: [
                { value: "credit", label: "Credits" },
                { value: "debit", label: "Debits" },
              ],
            },
            {
              type: "select",
              name: "source",
              label: "All sources",
              options: [
                { value: "sale_payment", label: "Sale payment" },
                { value: "expense", label: "Expense" },
                { value: "supplier_payment", label: "Supplier payment" },
                { value: "other", label: "Other" },
              ],
            },
            { type: "date", name: "from", label: "From" },
            { type: "date", name: "to", label: "To" },
          ]}
        />

        {ledger.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No entries match that filter" : "The ledger is empty"}
            description="Entries are written automatically when a payment or expense is recorded."
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Date</Th>
                  <Th>Type</Th>
                  <Th>Source</Th>
                  <Th>Reference</Th>
                  <Th>Description</Th>
                  <Th align="right">Amount</Th>
                </>
              }
            >
              {ledger.items.map((entry) => {
                /*
                 * Rendered from `direction`, never by comparing entry_type to
                 * the string "credit" — the definition of a credit lives in one
                 * row of `ledger_entry_types`, which is the whole reason that
                 * list is a table (FR-12.12.2).
                 */
                const credit = entry.direction > 0;
                return (
                  <Tr key={entry.id}>
                    <Td mono>{formatDateTime(entry.timestamp)}</Td>
                    <Td>
                      <StatusPill tone={credit ? "success" : "danger"}>
                        {entry.entry_type_label}
                      </StatusPill>
                    </Td>
                    <Td>{entry.source_label}</Td>
                    <Td mono className="text-accent">{entry.reference}</Td>
                    <Td className="max-w-[280px] truncate">{entry.description}</Td>
                    <Td align="right" mono className={credit ? "text-success" : "text-danger"}>
                      {formatMoney(entry.signed_amount)}
                    </Td>
                  </Tr>
                );
              })}
            </Table>

            <Pagination
              page={ledger}
              noun="entries"
              singular="entry"
              basePath="/reports/ledger"
              searchParams={{ entryType, source, reference, from, to }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
