import { redirect } from "next/navigation";
import { ConsoleFrame } from "@/components/shell/console-frame";
import { NAV, type NavGroup } from "@/components/shell/nav";
import { getLowStockCount } from "@/lib/api/dashboard";
import { listShopOptions } from "@/lib/api/shops";
import { canAny, isManager, requireSession, signOut } from "@/lib/auth/session";
import { formatLongDate } from "@/lib/format/date";
import type { ShopOption } from "@/lib/api/types";

/**
 * The console shell. This is the security boundary for everything inside it —
 * `proxy.ts` only checks that a cookie exists, which is a fast path, not proof
 * that the session is still valid.
 */
export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  const me = await requireSession();

  // Neither of these should take the whole console down: a user without
  // `view_shop`-adjacent rights still gets a working shell.
  const [shops, lowStock] = await Promise.all([
    listShopOptions().catch((): ShopOption[] => []),
    getLowStockCount().catch(() => ({ count: 0 })),
  ]);

  const groups: NavGroup[] = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.managerOnly && !isManager(me)) return false;
      return item.permissions.length === 0 || canAny(me, item.permissions);
    }),
  })).filter((group) => group.items.length > 0);

  async function signOutAction() {
    "use server";
    await signOut();
    redirect("/login");
  }

  return (
    <ConsoleFrame
      groups={groups}
      user={{
        name: me.displayName || me.username,
        role: me.userType.code,
        initials: (me.displayName || me.username).slice(0, 2).toUpperCase(),
      }}
      dateLabel={formatLongDate(new Date().toISOString())}
      shops={shops}
      lowStockCount={lowStock.count}
      signOutAction={signOutAction}
    >
      {children}
    </ConsoleFrame>
  );
}
