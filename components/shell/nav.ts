import type { Permission } from "@/lib/auth/permissions";

/**
 * The sidebar's contents.
 *
 * The mockup draws twelve fixed items. Here each one carries the permissions
 * that make it useful, so an Employee whose rights cover bill claims does not
 * see nine menu items that would all answer 403. An Owner (`isSuperuser`)
 * passes every check, matching the backend's own short-circuit.
 *
 * Hiding an item is presentation only — the server enforces the same rules on
 * every route regardless of what is drawn.
 *
 * The names come from the backend's permission seed and are typed against it
 * (`lib/auth/permissions.ts`). They were previously guessed at in a Django-ish
 * `view_billclaim` / `view_report` style that the backend never seeds, so the
 * three bill-claim entries and Reports were gated on permissions nobody can
 * hold: every non-superuser was denied links to pages they could open, and only
 * the Owner short-circuit hid it.
 *
 * Where the backend offers a `*_menu` permission, that is the one to use —
 * FR-00.2 mechanism 2 exists to gate navigation entries that have no record of
 * their own, which is exactly this list.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Shown when the user holds ANY of these. Empty means always shown. */
  permissions: Permission[];
  /** Additionally requires manager or superuser. */
  managerOnly?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", permissions: [] },
      { href: "/shops", label: "Shops", permissions: ["view_shops_menu"] },
      { href: "/customers", label: "Customers", permissions: ["view_customers_menu"] },
      { href: "/inventory", label: "Inventory", permissions: ["view_inventory_menu"] },
      { href: "/suppliers", label: "Suppliers", permissions: ["view_suppliers_menu"] },
      { href: "/expenses", label: "Expenses", permissions: ["view_expenses_menu"] },
      { href: "/sales", label: "Sales", permissions: ["view_sales_menu"] },
    ],
  },
  {
    label: "Bill claims",
    items: [
      // "Submit bill" is deliberately NOT a nav entry: /bills/submit is reached
      // from My bills, which links it in its header and again from its empty
      // state, and from the reduced dashboard. Every seeded role that can
      // submit can also see its own claims, so nobody loses the path.
      // No `view_billclaim` exists: a staff member sees their own claims with
      // `view_my_bills`, and anyone who may review them can obviously read
      // them too. The scope follows the caller, not the URL.
      { href: "/bills", label: "My bills", permissions: ["view_my_bills", "review_bills"] },
      {
        href: "/bills/review",
        label: "Review bills",
        permissions: ["review_bills"],
        managerOnly: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      // The page itself additionally requires `view_ledger` and manager, per
      // FR-09.5; this is the menu gate, and both must line up or the link
      // renders straight into a 404.
      {
        href: "/reports",
        label: "Reports",
        permissions: ["view_reports_menu", "view_ledger"],
        managerOnly: true,
      },
      // FR-00.6. The mockup omits staff accounts and names "Users & Roles" as
      // its own next step; the backend has had the module all along.
      { href: "/users", label: "Users", permissions: ["view_user"], managerOnly: true },
      { href: "/settings/appearance", label: "Settings", permissions: [] },
    ],
  },
];

/**
 * Every nav destination now exists, so nothing is drawn disabled. The set is
 * kept because it is the one place to mark a route as not-yet-built if another
 * is added later — a link that 404s is worse than one that says "soon".
 */
export const IMPLEMENTED = new Set([
  "/dashboard",
  "/shops",
  "/customers",
  "/inventory",
  "/suppliers",
  "/expenses",
  "/sales",
  "/bills",
  "/bills/review",
  "/reports",
  "/users",
  "/settings/appearance",
]);
