"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { deleteCategoryAction, loadCategoryUsage } from "../actions";

type Usage = { total: number; byTable: Record<string, number> };

/**
 * BR-60 — a category in use cannot be deleted, so the usage is read BEFORE the
 * delete is offered rather than after the API refuses. The alternative the user
 * almost always wants is to deactivate it, so the dialog says so and links
 * straight there.
 */
export function DeleteCategory({
  categoryId,
  name,
  editHref,
  variant = "ghost",
}: {
  categoryId: string;
  name: string;
  editHref: string;
  variant?: "danger" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteCategoryAction,
    {},
  );

  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) setOpen(false);
  }

  function open_() {
    setOpen(true);
    setUsage(null);
    setLoadError(null);

    startLoading(async () => {
      const result = await loadCategoryUsage(categoryId);
      if ("error" in result) setLoadError(result.error);
      else setUsage(result);
    });
  }

  const inUse = usage !== null && usage.total > 0;

  return (
    <>
      <Button
        variant={variant}
        size={variant === "ghost" ? "sm" : "md"}
        onClick={open_}
      >
        Delete
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this category?"
        width="md"
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        {loading && (
          <p className="text-[12.5px] text-muted">Checking what uses this category…</p>
        )}

        {loadError && <Alert tone="danger">{loadError}</Alert>}

        {usage && (
          <div className="flex flex-col gap-4">
            {inUse ? (
              <>
                <Alert tone="warning">
                  <strong>{name}</strong> is used by {usage.total}{" "}
                  {usage.total === 1 ? "record" : "records"} and cannot be deleted.
                  Deactivate it instead — it disappears from the pickers while every
                  product already filed under it keeps its meaning.
                </Alert>

                <div className="overflow-hidden rounded-control border border-line">
                  <dl className="divide-y divide-line text-[12.5px]">
                    {Object.entries(usage.byTable).map(([table, count]) => (
                      <div
                        key={table}
                        className="flex items-center justify-between gap-4 px-3.5 py-2.5"
                      >
                        <dt className="text-muted">{table.replace(/_/g, " ")}</dt>
                        <dd className="font-mono font-medium tabular-nums text-ink">
                          {count}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="flex justify-end gap-2.5">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => (window.location.href = editHref)}>
                    Deactivate instead
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] leading-relaxed text-muted">
                  <strong className="text-ink">{name}</strong> is not used by any
                  record and will be removed permanently. This cannot be undone.
                </p>

                <form action={formAction} className="flex justify-end gap-2.5">
                  <input type="hidden" name="id" value={categoryId} />
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <SubmitButton variant="danger" pendingLabel="Deleting…">
                    Delete category
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
