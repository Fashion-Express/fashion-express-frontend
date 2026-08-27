import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { createShopAction } from "../actions";
import { ShopForm } from "../shop-form";

export const metadata: Metadata = { title: "Add shop" };

export default async function NewShopPage() {
  const me = await requireSession();
  if (!can(me, "add_shop")) forbidden("You do not have permission to add a shop.");

  return (
    <>
      <PageHeader eyebrow="Shops / Add" title="Add shop" />
      <PageBody>
        <ShopForm action={createShopAction} cancelHref="/shops" submitLabel="Save shop" />
      </PageBody>
    </>
  );
}
