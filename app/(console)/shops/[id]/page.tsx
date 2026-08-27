import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getShop, shopHoldings } from "@/lib/api/shops";
import { can, requireSession } from "@/lib/auth/session";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  DetailList,
  PageBody,
  PageHeader,
  StatTile,
  StatusPill,
} from "@/components/ui/surfaces";
import { ShopAdminActions } from "./admin-actions";

export const metadata: Metadata = { title: "Shop" };

export default async function ShopDetailPage(props: PageProps<"/shops/[id]">) {
  const { id } = await props.params;
  const me = await requireSession();

  let shop;
  try {
    shop = await getShop(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const holdings = shopHoldings(shop);

  return (
    <>
      <PageHeader
        eyebrow="Shops / Detail"
        title={shop.name}
        meta={
          <StatusPill tone={shop.is_active ? "success" : "neutral"}>
            {shop.is_active ? "Active" : "Inactive"}
          </StatusPill>
        }
        actions={
          <>
            <ButtonLink href="/shops" variant="outline">
              ← Back to list
            </ButtonLink>
            {can(me, "change_shop") && (
              <ButtonLink href={`/shops/${shop.id}/edit`}>Edit shop</ButtonLink>
            )}
          </>
        }
      />

      <PageBody>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card title="Shop information">
            <DetailList
              items={[
                { label: "Shop ID", value: shop.id, mono: true },
                { label: "Name", value: shop.name },
                {
                  label: "Description",
                  value: shop.description || "—",
                },
                {
                  label: "Status",
                  value: shop.is_active ? "Active" : "Inactive",
                },
              ]}
            />
          </Card>

          <Card title="What this shop holds">
            {/*
              FR-11.2.2 — these counts exist so the consequences of retiring a
              shop are visible before acting on it, and they come down with the
              record itself rather than needing four more calls.
            */}
            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Customers" value={shop.customer_count} tone="accent" />
              <StatTile label="Products" value={shop.inventory_count} tone="warning" />
              <StatTile label="Sales" value={shop.sale_count} tone="success" />
              <StatTile label="Staff" value={shop.staff_count} tone="info" />
            </div>
          </Card>
        </div>

        {(can(me, "change_shop") || can(me, "delete_shop")) && (
          <ShopAdminActions
            shop={{ id: shop.id, name: shop.name, isActive: shop.is_active }}
            holdings={holdings}
            canChange={can(me, "change_shop")}
            canDelete={can(me, "delete_shop")}
          />
        )}
      </PageBody>
    </>
  );
}
