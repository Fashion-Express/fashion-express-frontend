import type { Permission } from "@/lib/auth/permissions";
import { NAV_ICON } from "./nav-icons";

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
 * **Every entry is gated on its own `*_menu` permission** (FR-00.2 mechanism
 * 2), never on a record permission. Seven of them used to borrow one — Users
 * from `view_user`, the administration screens from `manage_referencedata` —
 * which made the sidebar a side effect of what someone could do rather than a
 * thing that could be decided. Taking Departments out of a menu meant revoking
 * reference data entirely, and removing Product categories and Job positions
 * with it.
 *
 * A menu permission decides what is DRAWN and nothing else: every page keeps
 * its own guard, so removing one hides a link without revoking access to the
 * URL. `managerOnly` / `superuserOnly` sit alongside and are privilege levels
 * (mechanism 3), not permissions — they are read from the user's type.
 */
export type NavItem = {
  href: string;
  label: string;
  /**
   * The row's line icon: the `d` of one 20x20 path from `nav-icons.ts`. It is
   * required rather than optional because the collapsed 68px rail shows NOTHING
   * ELSE — an entry without an icon would be an unlabelled blank row until the
   * rail is hovered.
   */
  icon: string;
  /** Shown when the user holds ANY of these. Empty means always shown. */
  permissions: Permission[];
  /** Additionally requires manager or superuser. */
  managerOnly?: boolean;
  /**
   * Additionally requires an UNRESTRICTED account. `permissions` cannot express
   * this: `is_superuser` is a privilege level read from the user's type
   * (BR-56), not a codename anyone can be granted — the same reason
   * `managerOnly` sits beside it, and the reason the API guards this route with
   * `@RequireSuperuser` rather than a permission.
   */
  superuserOnly?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: NAV_ICON.dashboard, permissions: [] },
      {
        href: "/shops",
        label: "Shops",
        icon: NAV_ICON.shops,
        permissions: ["view_shops_menu"],
      },
      {
        href: "/customers",
        label: "Customers",
        icon: NAV_ICON.customers,
        permissions: ["view_customers_menu"],
      },
      {
        href: "/inventory",
        label: "Inventory",
        icon: NAV_ICON.inventory,
        permissions: ["view_inventory_menu"],
      },
      {
        href: "/suppliers",
        label: "Suppliers",
        icon: NAV_ICON.suppliers,
        permissions: ["view_suppliers_menu"],
      },
      {
        href: "/expenses",
        label: "Expenses",
        icon: NAV_ICON.expenses,
        permissions: ["view_expenses_menu"],
      },
      {
        href: "/sales",
        label: "Sales",
        icon: NAV_ICON.sales,
        permissions: ["view_sales_menu"],
      },
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
      {
        href: "/bills",
        label: "My bills",
        icon: NAV_ICON.myBills,
        permissions: ["view_bills_menu"],
      },
      {
        href: "/bills/review",
        label: "Review bills",
        icon: NAV_ICON.reviewBills,
        permissions: ["view_review_bills_menu"],
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
        icon: NAV_ICON.reports,
        permissions: ["view_reports_menu"],
        managerOnly: true,
      },
      // FR-00.6. The mockup omits staff accounts and names "Users & Roles" as
      // its own next step; the backend has had the module all along.
      {
        href: "/users",
        label: "Users",
        icon: NAV_ICON.users,
        permissions: ["view_users_menu"],
        managerOnly: true,
      },
      // FR-12 master data. Reads are ungated on the API, but the screen exists
      // to maintain the list, so the link is shown to whoever can write it.
      {
        href: "/settings/categories",
        label: "Product categories",
        icon: NAV_ICON.categories,
        permissions: ["view_categories_menu"],
      },
      // FR-12.2 — the other two NAMED lists. Both are optional on a staff
      // account, so they are maintained beside the categories rather than
      // buried in the Users screen that consumes them.
      {
        href: "/settings/job-positions",
        label: "Job positions",
        icon: NAV_ICON.jobPositions,
        permissions: ["view_job_positions_menu"],
      },
      {
        href: "/settings/departments",
        label: "Departments",
        icon: NAV_ICON.departments,
        permissions: ["view_departments_menu"],
      },
      // FR-00.4 — what each role grants. Administrator-only: anyone who can
      // edit grants can grant themselves anything.
      {
        href: "/settings/roles",
        label: "Roles & permissions",
        icon: NAV_ICON.roles,
        permissions: ["view_roles_menu"],
        superuserOnly: true,
      },
      {
        href: "/settings/appearance",
        label: "Settings",
        icon: NAV_ICON.settings,
        permissions: [],
      },
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
  "/settings/categories",
  "/settings/job-positions",
  "/settings/departments",
  "/settings/roles",
  "/settings/appearance",
]);
