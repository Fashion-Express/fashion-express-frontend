import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getCustomer } from "@/lib/api/customers";
import { requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { Card, DetailList, PageBody } from "@/components/ui/surfaces";
import { CustomerHeader } from "./customer-header";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerProfilePage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  const me = await requireSession();

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <CustomerHeader customer={customer} me={me} current={`/customers/${customer.id}`} />

      <PageBody>
        <Card title="Customer information">
          <DetailList
            columns={3}
            items={[
              { label: "Customer ID", value: customer.customer_id, mono: true },
              { label: "Name", value: customer.name },
              { label: "Company", value: customer.company || "—" },
              { label: "Phone", value: customer.phone || "—", mono: true },
              { label: "Email", value: customer.email || "—" },
              { label: "City", value: customer.city || "—" },
              { label: "Shop", value: customer.shop_name },
              { label: "Status", value: customer.status_label },
              { label: "Created", value: formatDate(customer.created_at), mono: true },
              { label: "Address", value: customer.address || "—" },
            ]}
          />
        </Card>

        {customer.notes && (
          <Card title="Notes">
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
              {customer.notes}
            </p>
          </Card>
        )}
      </PageBody>
    </>
  );
}
