import type { Metadata } from "next";
import { attachmentUrl, listBillClaims } from "@/lib/api/bill-claims";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, Table, Td, Th, Tr } from "@/components/ui/table";
import { CLAIM_TONE, ClaimTotalsRow } from "./claim-totals";
import { WithdrawClaim } from "./withdraw-claim";

export const metadata: Metadata = { title: "My bills" };

export default async function MyBillsPage(props: PageProps<"/bills">) {
  const params = await props.searchParams;
  const status = firstParam(params.status);
  const page = pageParam(params.page);

  const me = await requireSession();
  // The scope follows the caller's permissions, not the URL: `view_my_bills`
  // returns their own claims and there is no parameter to widen it.
  const claims = await listBillClaims({ page, status });

  return (
    <>
      <PageHeader
        eyebrow="My bills"
        title="My bill claims"
        actions={
          can(me, "submit_bill") ? (
            <ButtonLink href="/bills/submit">+ Submit new claim</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        <ClaimTotalsRow totals={claims.totals} />

        <FilterBar
          basePath="/bills"
          values={{ status }}
          preserve={[]}
          fields={[
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
            title={status ? "No claims with that status" : "No claims yet"}
            description="Submit a claim for an expense you paid for personally, and track it here until it is reviewed."
            action={
              can(me, "submit_bill") ? (
                <ButtonLink href="/bills/submit">+ Submit a claim</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>ID</Th>
                  <Th>Bill date</Th>
                  <Th>Description</Th>
                  <Th align="right">Amount</Th>
                  <Th>Status</Th>
                  <Th>Reviewed</Th>
                  <Th>Receipt</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {claims.items.map((claim) => (
                <Tr key={claim.id}>
                  <Td mono className="text-accent">#{claim.id}</Td>
                  <Td mono>{formatDate(claim.bill_date)}</Td>
                  <Td strong className="max-w-[280px] truncate">{claim.description}</Td>
                  <Td align="right" mono>{formatMoney(claim.amount)}</Td>
                  <Td>
                    <StatusPill tone={CLAIM_TONE[claim.status_code]}>{claim.status_label}</StatusPill>
                  </Td>
                  <Td mono>{claim.approval_date ? formatDate(claim.approval_date) : "—"}</Td>
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
                    <RowActions>
                      {/* A reviewed claim can no longer be edited or withdrawn:
                          it is part of the expense record now. */}
                      {claim.status_code === "pending" && can(me, "submit_bill") ? (
                        <WithdrawClaim claimId={claim.id} description={claim.description} />
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination page={claims} noun="claims" basePath="/bills" searchParams={{ status }} />
          </>
        )}
      </PageBody>
    </>
  );
}
