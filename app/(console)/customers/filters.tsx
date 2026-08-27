"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Filters go into the URL so a filtered list stays a link. The shop filter is
 * owned by the top bar's switcher, so it is preserved here rather than
 * duplicated — clearing the search must not silently clear the shop.
 */
export function CustomerFilters({
  search,
  statusCode,
}: {
  search?: string;
  statusCode?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId");

  function navigate(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (shopId) params.set("shopId", shopId);
    for (const [key, value] of Object.entries(next)) {
      if (value && value.trim()) params.set(key, value.trim());
    }
    const query = params.toString();
    router.push(query ? `/customers?${query}` : "/customers");
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        navigate({
          search: String(data.get("search") ?? ""),
          statusCode: String(data.get("statusCode") ?? ""),
        });
      }}
    >
      <input
        type="search"
        name="search"
        defaultValue={search ?? ""}
        placeholder="Search name, customer ID, company or phone"
        aria-label="Search customers"
        className="h-filter min-w-[220px] flex-1 rounded-control border border-line bg-subtle px-3 font-sans text-[12px] text-ink outline-none placeholder:text-faint focus:border-accent"
      />

      <select
        name="statusCode"
        defaultValue={statusCode ?? ""}
        aria-label="Filter by status"
        className="h-filter w-[150px] cursor-pointer rounded-control border border-line bg-surface px-3 font-sans text-[12px] text-ink-soft outline-none focus:border-accent"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

      <Button type="submit" variant="dark" size="sm">
        Search
      </Button>

      {(search || statusCode) && (
        <Button variant="outline" size="sm" onClick={() => navigate({})}>
          Reset
        </Button>
      )}
    </form>
  );
}
