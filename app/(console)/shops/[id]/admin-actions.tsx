"use client";

import { useActionState, useState } from "react";
import { Alert, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { deleteShopAction, setShopActiveAction } from "../actions";

/**
 * Retiring and deleting, kept together because the choice between them is the
 * point.
 *
 * BR-48 — a shop holding any customer, product, sale or staff account cannot be
 * deleted. The database enforces that with ON DELETE RESTRICT, so the server
 * would refuse anyway; showing the holdings here means the user learns why
 * before clicking rather than after.
 */
export function ShopAdminActions({
  shop,
  holdings,
  canChange,
  canDelete,
}: {
  shop: { id: string; name: string; isActive: boolean };
  holdings: Array<{ label: string; count: number }>;
  canChange: boolean;
  canDelete: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [activeState, activeAction] = useActionState<ActionState, FormData>(
    setShopActiveAction,
    {},
  );
  const [deleteState, deleteAction] = useActionState<ActionState, FormData>(
    deleteShopAction,
    {},
  );

  const blocked = holdings.length > 0;
  const blockedSummary = holdings
    .map((entry) => `${entry.count} ${entry.label}${entry.count === 1 ? "" : "s"}`)
    .join(", ");

  return (
    <Card title="Manage this shop">
      <div className="flex flex-col gap-4">
        {activeState.formError && <Alert tone="danger">{activeState.formError}</Alert>}
        {deleteState.formError && <Alert tone="danger">{deleteState.formError}</Alert>}

        {canChange && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">
                {shop.isActive ? "Deactivate this shop" : "Reactivate this shop"}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                An inactive shop disappears from the pickers on create forms, but keeps
                every record it holds and continues to appear in reports.
              </p>
            </div>

            <form action={activeAction}>
              <input type="hidden" name="id" value={shop.id} />
              <input
                type="hidden"
                name="isActive"
                value={shop.isActive ? "false" : "true"}
              />
              <SubmitButton variant="outline" pendingLabel="Saving…">
                {shop.isActive ? "Deactivate" : "Reactivate"}
              </SubmitButton>
            </form>
          </div>
        )}

        {canDelete && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-danger/20 bg-danger-bg/40 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">Delete this shop</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                {blocked
                  ? `Not possible — this shop holds ${blockedSummary}. Deactivate it instead.`
                  : "Only for a shop created in error and never used. This cannot be undone."}
              </p>
            </div>

            <Button
              variant="danger"
              disabled={blocked}
              onClick={() => setConfirming(true)}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete this shop?"
      >
        <p className="text-[12.5px] leading-relaxed text-muted">
          <strong className="text-ink">{shop.name}</strong> will be removed permanently.
          This cannot be undone.
        </p>

        <form action={deleteAction} className="flex justify-end gap-2.5 pt-2">
          <input type="hidden" name="id" value={shop.id} />
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <SubmitButton variant="danger" pendingLabel="Deleting…">
            Delete shop
          </SubmitButton>
        </form>
      </Modal>
    </Card>
  );
}
