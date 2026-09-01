import type { Metadata } from "next";
import { listCustomers } from "@/lib/api/customers";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { CustomerFilters } from "./filters";
import { DeleteCustomer } from "./[id]/delete-customer";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage(props: PageProps<"/customers">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const statusCode = firstParam(params.statusCode);
  const shopId = firstParam(params.shopId);
  const page = pageParam(params.page);

  const me = await requireSession();
  const customers = await listCustomers({ page, search, statusCode, shopId });

  const filtered = Boolean(search || statusCode);

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Manage your customer relationships"
        meta="Every customer belongs to exactly one shop, fixed when the record is created."
        actions={
          can(me, "add_customer") ? (
            <ButtonLink href="/customers/new">+ Add customer</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        <CustomerFilters search={search} statusCode={statusCode} />

        {customers.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No customers match that filter" : "No customers yet"}
            description={
              filtered
                ? "Search matches a name, customer ID, company or phone number."
                : "Add the first customer to start recording sales against them."
            }
            action={
              can(me, "add_customer") && !filtered ? (
                <ButtonLink href="/customers/new">+ Add customer</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Customer ID</Th>
                  <Th>Name / company</Th>
                  <Th>Phone</Th>
                  <Th>Email</Th>
                  <Th>City</Th>
                  <Th>Shop</Th>
                  <Th>Status</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {customers.items.map((customer) => (
                <Tr key={customer.id}>
                  <Td mono className="text-accent">{customer.customer_id}</Td>
                  <Td strong>
                    {customer.name}
                    {customer.company && (
                      <span className="mt-0.5 block text-[11.5px] font-normal text-muted">
                        {customer.company}
                      </span>
                    )}
                  </Td>
                  <Td mono>{customer.phone || "—"}</Td>
                  <Td className="max-w-[200px] truncate">{customer.email || "—"}</Td>
                  <Td>{customer.city || "—"}</Td>
                  <Td>{customer.shop_name}</Td>
                  <Td>
                    <StatusPill tone={customer.status_code === "active" ? "success" : "neutral"}>
                      {customer.status_label}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/customers/${customer.id}`}>View</RowLink>
                      {can(me, "change_customer") && (
                        <>
                          <span className="text-faint">·</span>
                          <RowLink href={`/customers/${customer.id}/edit`}>Edit</RowLink>
                        </>
                      )}
                      {can(me, "delete_customer") && (
                        <>
                          <span className="text-faint">·</span>
                          {/* Shows what the delete would destroy before it is
                              offered — deleting a customer cascades to every
                              sale, payment and receipt they have. */}
                          <DeleteCustomer
                            customerId={customer.id}
                            name={customer.name}
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
              page={customers}
              noun="customers"
              basePath="/customers"
              searchParams={{ search, statusCode, shopId }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
