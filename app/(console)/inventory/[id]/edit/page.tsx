import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getInventoryItem } from "@/lib/api/inventory";
import { categories, optionLabel, units } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { listSupplierOptions } from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { updateInventoryAction } from "../../actions";
import { ItemForm } from "../../item-form";

export const metadata: Metadata = { title: "Edit item" };

export default async function EditInventoryPage(props: PageProps<"/inventory/[id]/edit">) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "change_inventoryitem")) forbidden("Cannot edit inventory.");

  let item;
  try {
    item = await getInventoryItem(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const [shops, unitOptions, categoryOptions, suppliers] = await Promise.all([
    listShopOptions(),
    units(),
    categories().catch(() => []),
    listSupplierOptions().catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={`Inventory / Edit · ${item.part_code}`}
        title={`Edit ${item.part_name}`}
      />
      <PageBody>
        <ItemForm
          action={updateInventoryAction}
          item={item}
          shops={shops}
          units={unitOptions.map((u) => ({ id: u.id, label: optionLabel(u) }))}
          categories={categoryOptions.map((c) => ({ id: c.id, label: optionLabel(c) }))}
          suppliers={suppliers}
          cancelHref={`/inventory/${item.id}/movements`}
          submitLabel="Save item"
        />
      </PageBody>
    </>
  );
}
