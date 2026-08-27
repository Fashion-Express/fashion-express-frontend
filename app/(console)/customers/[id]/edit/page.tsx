import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getCustomer } from "@/lib/api/customers";
import { listShopOptions } from "@/lib/api/shops";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { updateCustomerAction } from "../../actions";
import { CustomerForm } from "../../customer-form";

export const metadata: Metadata = { title: "Edit customer" };

export default async function EditCustomerPage(
  props: PageProps<"/customers/[id]/edit">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "change_customer")) {
    forbidden("You do not have permission to edit a customer.");
  }

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const shops = await listShopOptions();

  return (
    <>
      <PageHeader eyebrow="Customers / Edit" title={`Edit ${customer.name}`} />
      <PageBody>
        <CustomerForm
          action={updateCustomerAction}
          shops={shops}
          customer={customer}
          cancelHref={`/customers/${customer.id}`}
          submitLabel="Save changes"
        />
      </PageBody>
    </>
  );
}
