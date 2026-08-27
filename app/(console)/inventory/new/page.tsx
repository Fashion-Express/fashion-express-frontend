import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { categories, optionLabel, units } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { listSupplierOptions } from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { createInventoryAction } from "../actions";
import { ItemForm } from "../item-form";

export const metadata: Metadata = { title: "Add item" };

export default async function NewInventoryPage() {
  const me = await requireSession();
  if (!can(me, "add_inventoryitem")) forbidden("Cannot add inventory.");

  const [shops, unitOptions, categoryOptions, suppliers] = await Promise.all([
    listShopOptions(),
    units(),
    categories().catch(() => []),
    listSupplierOptions().catch(() => []),
  ]);

  return (
    <>
      <PageHeader eyebrow="Inventory / Add item" title="Add inventory item" />
      <PageBody>
        <ItemForm
          action={createInventoryAction}
          shops={shops}
          units={unitOptions.map((u) => ({ id: u.id, label: optionLabel(u) }))}
          categories={categoryOptions.map((c) => ({ id: c.id, label: optionLabel(c) }))}
          suppliers={suppliers}
          defaultShopId={me.shopId}
          cancelHref="/inventory"
          submitLabel="Save item"
        />
      </PageBody>
    </>
  );
}
