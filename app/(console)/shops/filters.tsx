"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Filters write to the URL, so a filtered list is a link: shareable, and
 * correct after a reload or a back button. Submitting the form navigates —
 * there is no client-side filter state to drift out of sync with the server.
 */
export function ShopFilters({
  search,
  status,
}: {
  search?: string;
  status?: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action="/shops"
      className="flex flex-wrap items-center gap-2.5"
      onSubmit={(event) => {
        // Let the browser build the query string, then navigate on the client
        // so the page transition stays within the app shell.
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const [key, value] of data.entries()) {
          if (typeof value === "string" && value.trim()) params.set(key, value.trim());
        }
        const query = params.toString();
        router.push(query ? `/shops?${query}` : "/shops");
      }}
    >
      <input
        type="search"
        name="search"
        defaultValue={search ?? ""}
        placeholder="Search by shop name"
        aria-label="Search shops"
        className="h-filter min-w-[200px] flex-1 rounded-control border border-line bg-subtle px-3 font-sans text-[12px] text-ink outline-none placeholder:text-faint focus:border-accent"
      />

      <select
        name="status"
        defaultValue={status ?? ""}
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

      {(search || status) && (
        <Button variant="outline" size="sm" onClick={() => router.push("/shops")}>
          Reset
        </Button>
      )}
    </form>
  );
}
