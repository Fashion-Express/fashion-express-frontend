import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getShop } from "@/lib/api/shops";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { updateShopAction } from "../../actions";
import { ShopForm } from "../../shop-form";

export const metadata: Metadata = { title: "Edit shop" };

export default async function EditShopPage(props: PageProps<"/shops/[id]/edit">) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "change_shop")) forbidden("You do not have permission to edit a shop.");

  let shop;
  try {
    shop = await getShop(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader eyebrow="Shops / Edit" title={`Edit ${shop.name}`} />
      <PageBody>
        <ShopForm
          action={updateShopAction}
          shop={{ id: shop.id, name: shop.name, description: shop.description }}
          cancelHref={`/shops/${shop.id}`}
          submitLabel="Save changes"
        />
      </PageBody>
    </>
  );
}
