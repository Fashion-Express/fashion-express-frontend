"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * One filter row for every list screen.
 *
 * Filters live in the URL rather than in component state, so a filtered list is
 * a link — shareable, bookmarkable, and correct after a reload or a back
 * button. Submitting navigates; there is no client-side copy of the data to
 * drift out of step with the server.
 *
 * `preserve` names the params owned by something else on the page (the top
 * bar's shop switcher, above all) so that clearing a search does not silently
 * clear the shop as well.
 */

export type FilterField =
  | { type: "search"; name: string; placeholder: string; width?: string }
  | {
      type: "select";
      name: string;
      label: string;
      options: Array<{ value: string; label: string }>;
      width?: string;
    }
  | { type: "date"; name: string; label: string; width?: string };

export function FilterBar({
  basePath,
  fields,
  values,
  preserve = ["shopId"],
}: {
  basePath: string;
  fields: FilterField[];
  values: Record<string, string | undefined>;
  preserve?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(next: Record<string, string>) {
    const params = new URLSearchParams();

    for (const key of preserve) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }

    for (const [key, value] of Object.entries(next)) {
      if (value && value.trim()) params.set(key, value.trim());
    }

    // A changed filter invalidates the page position.
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  const active = fields.some((field) => values[field.name]);

  return (
    <form
      className="flex flex-wrap items-end gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const next: Record<string, string> = {};
        for (const [key, value] of data.entries()) {
          if (typeof value === "string") next[key] = value;
        }
        navigate(next);
      }}
    >
      {fields.map((field) => {
        if (field.type === "search") {
          return (
            <input
              key={field.name}
              type="search"
              name={field.name}
              defaultValue={values[field.name] ?? ""}
              placeholder={field.placeholder}
              aria-label={field.placeholder}
              className={`h-filter min-w-[200px] flex-1 rounded-control border border-line bg-subtle px-3 font-sans text-[12px] text-ink outline-none placeholder:text-faint focus:border-accent ${field.width ?? ""}`}
            />
          );
        }

        if (field.type === "date") {
          return (
            <label key={field.name} className="flex flex-col gap-1">
              <span className="font-mono text-[9.5px] tracking-[0.07em] text-muted uppercase">
                {field.label}
              </span>
              <input
                type="date"
                name={field.name}
                defaultValue={values[field.name] ?? ""}
                className={`h-filter rounded-control border border-line bg-surface px-2.5 font-mono text-[12px] text-ink-soft outline-none focus:border-accent ${field.width ?? "w-[150px]"}`}
              />
            </label>
          );
        }

        return (
          <select
            key={field.name}
            name={field.name}
            defaultValue={values[field.name] ?? ""}
            aria-label={field.label}
            className={`h-filter cursor-pointer rounded-control border border-line bg-surface px-3 font-sans text-[12px] text-ink-soft outline-none focus:border-accent ${field.width ?? "w-[160px]"}`}
          >
            <option value="">{field.label}</option>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      })}

      <Button type="submit" variant="dark" size="sm">
        Search
      </Button>

      {active && (
        <Button variant="outline" size="sm" onClick={() => navigate({})}>
          Reset
        </Button>
      )}
    </form>
  );
}
