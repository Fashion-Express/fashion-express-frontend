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
 */
export type NavItem = {
  href: string;
  label: string;
  /** Shown when the user holds ANY of these. Empty means always shown. */
  permissions: string[];
  /** Additionally requires manager or superuser. */
  managerOnly?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", permissions: [] },
      { href: "/shops", label: "Shops", permissions: ["view_shop"] },
      { href: "/customers", label: "Customers", permissions: ["view_customer"] },
      { href: "/inventory", label: "Inventory", permissions: ["view_inventoryitem"] },
      { href: "/suppliers", label: "Suppliers", permissions: ["view_supplier"] },
      { href: "/expenses", label: "Expenses", permissions: ["view_expense"] },
      { href: "/sales", label: "Sales", permissions: ["view_sale"] },
    ],
  },
  {
    label: "Bill claims",
    items: [
      { href: "/bills/submit", label: "Submit bill", permissions: ["add_billclaim"] },
      { href: "/bills", label: "My bills", permissions: ["view_billclaim"] },
      {
        href: "/bills/review",
        label: "Review bills",
        permissions: ["change_billclaim"],
        managerOnly: true,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/reports", label: "Reports", permissions: ["view_report"] },
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
  "/bills/submit",
  "/bills",
  "/bills/review",
  "/reports",
  "/users",
  "/settings/appearance",
]);
