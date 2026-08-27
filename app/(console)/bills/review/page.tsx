import type { Metadata } from "next";
import { attachmentUrl, listBillClaims } from "@/lib/api/bill-claims";
import { forbidden } from "@/lib/api/guard";
import { expenseCategories, optionLabel } from "@/lib/api/reference";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { FilterBar } from "@/components/ui/filter-bar";
import { Alert, EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, Table, Td, Th, Tr } from "@/components/ui/table";
import { CLAIM_TONE, ClaimTotalsRow } from "../claim-totals";
import { ReviewClaim } from "./review-actions";

export const metadata: Metadata = { title: "Review bills" };

export default async function ReviewBillsPage(props: PageProps<"/bills/review">) {
  const params = await props.searchParams;
  const status = firstParam(params.status);
  const search = firstParam(params.search);
  const page = pageParam(params.page);

  const me = await requireSession();
  if (!can(me, "review_bills")) forbidden("Cannot review bill claims.");

  // With `review_bills` the same endpoint returns every employee's claims —
  // the scope follows the caller, not the URL.
  const [claims, categories] = await Promise.all([
    listBillClaims({ page, status, search }),
    expenseCategories().catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Review bills"
        title="All bill claims"
        meta="Approving a claim posts it to expenses automatically."
      />

      <PageBody>
        <ClaimTotalsRow totals={claims.totals} />

        <FilterBar
          basePath="/bills/review"
          values={{ search, status }}
          preserve={[]}
          fields={[
            { type: "search", name: "search", placeholder: "Search by employee or description" },
            {
              type: "select",
              name: "status",
              label: "All statuses",
              options: [
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ],
            },
          ]}
        />

        {claims.items.length === 0 ? (
          <EmptyState
            title={status || search ? "No claims match that filter" : "No claims submitted"}
            description="Claims appear here as staff submit them."
          />
        ) : (
          <>
            <Alert tone="info">
              An approved claim posts an expense dated to the bill date, paid to the
              submitting employee. A claim is processed once, in one direction only.
            </Alert>

            <Table
              head={
                <>
                  <Th>ID</Th>
                  <Th>Employee</Th>
                  <Th>Bill date</Th>
                  <Th>Description</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Reviewed by</Th>
                  <Th>Receipt</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {claims.items.map((claim) => (
                <Tr key={claim.id}>
                  <Td mono className="text-accent">#{claim.id}</Td>
                  <Td strong mono>{claim.submitted_by}</Td>
                  <Td mono>{formatDate(claim.bill_date)}</Td>
                  <Td className="max-w-[240px] truncate">{claim.description}</Td>
                  <Td align="right" mono>{formatMoney(claim.amount)}</Td>
                  <Td>
                    <StatusPill tone={CLAIM_TONE[claim.status_code]}>{claim.status_label}</StatusPill>
                  </Td>
                  <Td mono>
                    {claim.approved_by ?? "—"}
                    {claim.approval_date && (
                      <span className="mt-0.5 block text-[10.5px] text-faint">
                        {formatDate(claim.approval_date)}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {claim.attachment ? (
                      <a
                        href={attachmentUrl(claim.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11.5px] text-accent no-underline hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    {claim.status_code === "pending" ? (
                      <ReviewClaim
                        claimId={claim.id}
                        employee={claim.submitted_by}
                        description={claim.description}
                        amount={claim.amount}
                        categories={categories.map((c) => ({ id: c.id, label: optionLabel(c) }))}
                      />
                    ) : (
                      <span className="text-[11.5px] text-faint">Processed</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={claims}
              noun="claims"
              basePath="/bills/review"
              searchParams={{ status, search }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
