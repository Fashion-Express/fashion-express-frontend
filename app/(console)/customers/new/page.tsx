import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { listShopOptions } from "@/lib/api/shops";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { createCustomerAction } from "../actions";
import { CustomerForm } from "../customer-form";

export const metadata: Metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  const me = await requireSession();
  if (!can(me, "add_customer")) {
    forbidden("You do not have permission to add a customer.");
  }

  const shops = await listShopOptions();

  return (
    <>
      <PageHeader eyebrow="Customers / Add" title="Add customer" />
      <PageBody>
        <CustomerForm
          action={createCustomerAction}
          shops={shops}
          // The user's home shop is the sensible default; it does not limit
          // what they may choose.
          defaultShopId={me.shopId}
          cancelHref="/customers"
          submitLabel="Save customer"
        />
      </PageBody>
    </>
  );
}
