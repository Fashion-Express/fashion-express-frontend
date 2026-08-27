import { ButtonLink } from "@/components/ui/button";
import { PageHeader, StatusPill, TabLinks } from "@/components/ui/surfaces";
import type { Customer } from "@/lib/api/customers";
import type { Me } from "@/lib/auth/session";
import { can } from "@/lib/auth/session";
import { DeleteCustomer } from "./delete-customer";

/** Shared chrome for the two customer tabs, so they cannot drift apart. */
export function CustomerHeader({
  customer,
  me,
  current,
}: {
  customer: Customer;
  me: Me;
  current: string;
}) {
  return (
    <>
      <PageHeader
        eyebrow={`Customers / ${customer.customer_id}`}
        title={customer.name}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={customer.status_code === "active" ? "success" : "neutral"}>
              {customer.status_label}
            </StatusPill>
            {customer.company && <span>{customer.company}</span>}
            <span className="text-faint">· {customer.shop_name}</span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/customers" variant="outline">
              ← Back
            </ButtonLink>
            {can(me, "change_customer") && (
              <ButtonLink href={`/customers/${customer.id}/edit`}>Edit</ButtonLink>
            )}
            {can(me, "delete_customer") && (
              <DeleteCustomer customerId={customer.id} name={customer.name} />
            )}
          </>
        }
      />

      <div className="px-5 sm:px-7">
        <TabLinks
          current={current}
          tabs={[
            { href: `/customers/${customer.id}`, label: "Profile" },
            { href: `/customers/${customer.id}/orders`, label: "Orders" },
          ]}
        />
      </div>
    </>
  );
}
