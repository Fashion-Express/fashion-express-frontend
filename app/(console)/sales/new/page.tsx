import type { Metadata } from "next";
import { listCustomerOptions } from "@/lib/api/customers";
import { forbidden } from "@/lib/api/guard";
import { listInventoryOptions } from "@/lib/api/inventory";
import { customerPaymentMethods, optionLabel } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { firstParam } from "@/lib/api/types";
import { can, requireSession } from "@/lib/auth/session";
import { todayInDhaka } from "@/lib/format/date";
import { Alert, EmptyState, PageBody, PageHeader } from "@/components/ui/surfaces";
import { ButtonLink } from "@/components/ui/button";
import { SaleForm } from "./sale-form";

export const metadata: Metadata = { title: "New sale" };

export default async function NewSalePage(props: PageProps<"/sales/new">) {
  const params = await props.searchParams;
  const mode = firstParam(params.mode) === "quotation" ? "quotation" : "sale";

  const me = await requireSession();
  if (!can(me, "add_sale")) forbidden("Cannot create sales.");

  const shops = await listShopOptions();

  // The shop owns both pickers, so it must be settled before either is fetched.
  // The user's home shop is the default; the URL wins when it names one.
  const requested = firstParam(params.shopId);
  const shopId =
    (requested && shops.some((shop) => shop.id === requested) ? requested : undefined) ??
    (me.shopId && shops.some((shop) => shop.id === me.shopId) ? me.shopId : undefined) ??
    shops[0]?.id;

  if (!shopId) {
    return (
      <>
        <PageHeader eyebrow="Sales / New" title="New sale" />
        <PageBody>
          <EmptyState
            title="No shops yet"
            description="A sale belongs to a shop, and its customer and stock must belong to the same one."
            action={<ButtonLink href="/shops/new">+ Add shop</ButtonLink>}
          />
        </PageBody>
      </>
    );
  }

  const [customers, products, methods] = await Promise.all([
    listCustomerOptions(shopId).catch(() => []),
    listInventoryOptions(shopId).catch(() => []),
    customerPaymentMethods().catch(() => []),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={mode === "quotation" ? "Sales / New quotation" : "Sales / New sale"}
        title={mode === "quotation" ? "New quotation" : "New sale"}
        meta={
          mode === "quotation"
            ? "An offer: no stock is touched and nothing counts toward a total."
            : "Saved as a draft. Stock is deducted only when it is finalized."
        }
      />

      <PageBody>
        {customers.length === 0 && (
          <Alert tone="warning">
            This shop has no active customers yet. A sale&rsquo;s customer must belong to
            the same shop, so one has to exist here first.
          </Alert>
        )}

        <SaleForm
          mode={mode}
          shopId={shopId}
          customers={customers}
          products={products}
          shops={shops}
          methods={methods.map((m) => ({ id: m.id, label: optionLabel(m) }))}
          today={todayInDhaka()}
        />
      </PageBody>
    </>
  );
}
