import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { can, requireSession } from "@/lib/auth/session";
import { todayInDhaka } from "@/lib/format/date";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = { title: "Submit bill" };

export default async function SubmitBillPage() {
  const me = await requireSession();
  if (!can(me, "submit_bill")) forbidden("Cannot submit bill claims.");

  return (
    <>
      <PageHeader
        eyebrow="Submit bill"
        title="Submit bill claim"
        meta="Claim money you spent on the company's behalf."
      />
      <PageBody>
        <ClaimForm today={todayInDhaka()} />
      </PageBody>
    </>
  );
}
