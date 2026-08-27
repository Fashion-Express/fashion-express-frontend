import { StatTile } from "@/components/ui/surfaces";
import type { ClaimTotals } from "@/lib/api/bill-claims";
import { formatMoney } from "@/lib/format/money";

/**
 * FR-07.4's three figures. They respect the same scope as the list, so a staff
 * member sees their own three and a reviewer sees everyone's — the same
 * component serves both screens because the API has already decided the scope.
 */
export function ClaimTotalsRow({ totals }: { totals: ClaimTotals }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatTile
        label="Pending"
        value={formatMoney(totals.pending, { compact: true })}
        note={`${totals.pending_count} awaiting review`}
        tone="warning"
      />
      <StatTile label="Approved" value={formatMoney(totals.approved, { compact: true })} tone="success" />
      <StatTile label="Rejected" value={formatMoney(totals.rejected, { compact: true })} tone="danger" />
    </div>
  );
}

export const CLAIM_TONE = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const;
