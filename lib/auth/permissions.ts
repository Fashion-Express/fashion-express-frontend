/**
 * Every permission codename the backend seeds, and nothing else.
 *
 * Transcribed from `../fashion-express-backend/src/database/migrations/
 * 1756000000015-SeedReferenceData.ts`, which is the authoritative list — a
 * permission that is not a row there can never be held by anyone, so a typo in
 * a `can()` call is a check that silently fails closed for every non-superuser
 * and passes for every superuser. That is exactly the bug that hid four dead
 * permission names in the sidebar (`view_billclaim`, `add_billclaim`,
 * `change_billclaim`, `view_report`) for as long as development was done as an
 * Owner. Typing them closes that door: an unseeded name is now a build error.
 *
 * Kept apart from `session.ts` because `nav.ts` needs the type and is pulled
 * into the browser bundle by the sidebar — `session.ts` imports `server-only`.
 */
export const PERMISSIONS = [
  // Records
  "add_customer",
  "change_customer",
  "delete_customer",
  "view_customer",
  "add_customerpayment",
  "add_expense",
  "change_expense",
  "delete_expense",
  "view_expense",
  "add_inventoryitem",
  "change_inventoryitem",
  "delete_inventoryitem",
  "view_inventoryitem",
  "add_sale",
  "change_sale",
  "delete_sale",
  "view_sale",
  "finalize_sale",
  "add_salepayment",
  "change_salepayment",
  "delete_salepayment",
  "add_shop",
  "change_shop",
  "delete_shop",
  "view_shop",
  "add_supplier",
  "change_supplier",
  "delete_supplier",
  "view_supplier",
  "add_supplierpayment",
  "add_user",
  "change_user",
  "delete_user",
  "view_user",
  "change_businesssettings",

  // Bill claims. Note the shape: there is no `view_billclaim` — a staff member
  // sees their own with `view_my_bills`, and a reviewer sees everyone's with
  // `review_bills`. The scope follows the caller, not a parameter (FR-07).
  "submit_bill",
  "view_my_bills",
  "review_bills",

  // Ledger, reporting and admin tools
  "view_ledger",
  "export_data",
  "rebuild_ledger",
  "manage_referencedata",
  "clean_data",

  /**
   * FR-00.2 mechanism 2 — permissions that gate a NAVIGATION entry rather than
   * a record. They exist precisely so the sidebar has something to check that
   * is not a record permission, and they are what `nav.ts` should use.
   */
  "view_customers_menu",
  "view_expenses_menu",
  "view_inventory_menu",
  "view_reports_menu",
  "view_sales_menu",
  "view_shops_menu",
  "view_suppliers_menu",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
