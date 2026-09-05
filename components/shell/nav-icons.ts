/**
 * The sidebar's line icons, copied verbatim from the mockup's `ICONS` map in
 * `Sidebar.dc.html`.
 *
 * Each value is the `d` of a single `<path>` drawn in a 20×20 box, stroked at
 * 1.6 with round caps and joins — never filled. Keeping them as bare path data
 * rather than components means the sidebar renders one `<svg>` shape and the
 * active colour is just `currentColor`, so an icon inherits the row's state
 * without a second code path.
 *
 * This file is a plain module (no `server-only`): `nav.ts` is read on the
 * server to filter by permission and by the client sidebar to draw.
 */
export const NAV_ICON = {
  dashboard: "M3 10.5 10 4l7 6.5M4.8 9.4V16h10.4V9.4",
  shops: "M3.4 7.6 4.6 4h10.8l1.2 3.6M3.4 7.6h13.2V16H3.4zM7.6 16v-4.4h4.8V16",
  customers:
    "M13.4 16v-1.3a2.9 2.9 0 0 0-2.9-2.9H6.3a2.9 2.9 0 0 0-2.9 2.9V16M8.4 9.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8M16.6 16v-1.3a2.9 2.9 0 0 0-2.2-2.8",
  inventory: "M17 13.6V6.4L10 3 3 6.4v7.2L10 17zM3 6.4 10 10m0 0 7-3.6M10 10v7",
  suppliers:
    "M2.6 12.8V6.2h8.6v6.6M11.2 8.6h3l2.2 2.4v1.8M2.6 12.8h14.8M6 15.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2m8 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2",
  expenses: "M10 3.4v13.2M13.4 6.2H8.6a2 2 0 0 0 0 4h2.8a2 2 0 0 1 0 4H6",
  sales: "M3.4 16h13.2M5.6 16V9.4m4.4 6.6V5.2m4.4 10.8v-4.4",
  myBills:
    "M12 3.4H6.4a1.6 1.6 0 0 0-1.6 1.6v10a1.6 1.6 0 0 0 1.6 1.6h7.2a1.6 1.6 0 0 0 1.6-1.6V6.6zM12 3.4v3.2h3.2M7.6 10.6h4.8M7.6 13.4h3.2",
  reviewBills:
    "M12 3.4H6.4a1.6 1.6 0 0 0-1.6 1.6v10a1.6 1.6 0 0 0 1.6 1.6h7.2a1.6 1.6 0 0 0 1.6-1.6V6.6zM12 3.4v3.2h3.2M7.4 11.4l1.6 1.6 3-3.2",
  reports: "M3.4 3.4v13.2h13.2M6.8 13.2l3-3.4 2.4 1.8 3.2-4",
  users:
    "M13.4 16v-1.3a2.9 2.9 0 0 0-2.9-2.9H6.3a2.9 2.9 0 0 0-2.9 2.9V16M8.4 9.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8",
  categories:
    "M3.4 4.6h5.2v5.2H3.4zM11.4 4.6h5.2v5.2h-5.2zM3.4 11.6h5.2v4.8H3.4zM11.4 11.6h5.2v4.8h-5.2z",
  jobPositions:
    "M4.6 6.6h10.8a1.4 1.4 0 0 1 1.4 1.4v6.6a1.4 1.4 0 0 1-1.4 1.4H4.6a1.4 1.4 0 0 1-1.4-1.4V8a1.4 1.4 0 0 1 1.4-1.4M7.6 6.6V5.2a1.4 1.4 0 0 1 1.4-1.4h2a1.4 1.4 0 0 1 1.4 1.4v1.4",
  departments:
    "M10 3.4v4M4.6 16.6v-3.2a1.6 1.6 0 0 1 1.6-1.6h7.6a1.6 1.6 0 0 1 1.6 1.6v3.2M8.2 7.4h3.6v4.4H8.2z",
  roles: "M10 3.4 4.4 5.8v4c0 3.2 2.3 5.5 5.6 6.8 3.3-1.3 5.6-3.6 5.6-6.8v-4zM7.8 9.8l1.6 1.6 3-3.2",
  settings:
    "M10 12.4a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8M15.4 12.4a1.3 1.3 0 0 0 .3 1.4l.1.1a1.4 1.4 0 1 1-2 2l-.1-.1a1.3 1.3 0 0 0-2.2.9v.2a1.4 1.4 0 1 1-2.8 0v-.1a1.3 1.3 0 0 0-2.2-1l-.1.1a1.4 1.4 0 1 1-2-2l.1-.1a1.3 1.3 0 0 0-.9-2.3h-.2a1.4 1.4 0 1 1 0-2.8h.1a1.3 1.3 0 0 0 1-2.2l-.1-.1a1.4 1.4 0 1 1 2-2l.1.1a1.3 1.3 0 0 0 2.2-.9V3.4a1.4 1.4 0 1 1 2.8 0v.1a1.3 1.3 0 0 0 2.2 1l.1-.1a1.4 1.4 0 1 1 2 2l-.1.1a1.3 1.3 0 0 0 .9 2.2h.2a1.4 1.4 0 1 1 0 2.8h-.2a1.3 1.3 0 0 0-1.2.9",
  /** The footer's sign-out arrow — the only icon that is not a nav entry. */
  signOut:
    "M12.5 6V4.6A1.6 1.6 0 0 0 10.9 3H4.6A1.6 1.6 0 0 0 3 4.6v10.8A1.6 1.6 0 0 0 4.6 17h6.3a1.6 1.6 0 0 0 1.6-1.6V14M8 10h9m0 0-2.6-2.6M17 10l-2.6 2.6",
} as const;
