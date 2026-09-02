"use client";

import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxRow } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Alert, Card } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { cn } from "@/lib/cn";
import type { PermissionRow } from "@/lib/api/roles";
import { setRoleGrantsAction } from "../actions";

export type PermissionGroup = { module: string; items: PermissionRow[] };

/**
 * FR-00.4 — the permission matrix for one role.
 *
 * **Why the boxes are controlled React state.** A 50-row matrix needs a live
 * count of what changed and a diff to confirm against, neither of which exists
 * without state. This is the same deliberate exception the sale form makes to
 * the "prefer uncontrolled" rule, and for the same reason.
 *
 * **Why the value does not ride on the checkbox.** An unchecked box is not
 * submitted at all, which is indistinguishable from a field the form never
 * rendered — the house rule that makes every other boolean here a `<Select>` of
 * "true"/"false". So the checkbox is an unnamed control and the value travels
 * in an always-present hidden `perm.<codename>` field. The action treats a
 * MISSING field as an error rather than as false, because the write replaces
 * the whole set and a partial submission would silently revoke the rest.
 *
 * **Why the form lives inside the dialog.** The confirm step is a stage of one
 * submission, not a second round trip, so there is no intent to carry across a
 * server response and nothing for React's post-action form reset to lose. It is
 * the shape `sale-actions.tsx` already uses.
 */
export function RoleMatrix({
  roleId,
  roleLabel,
  groups,
  granted,
  accountCount,
  editable,
  readOnlyReason,
}: {
  roleId: string;
  roleLabel: string;
  groups: PermissionGroup[];
  granted: string[];
  accountCount: number;
  editable: boolean;
  /** Shown when `editable` is false, so the screen says why rather than just refusing. */
  readOnlyReason?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setRoleGrantsAction,
    {},
  );

  const baseline = useMemo(() => new Set(granted), [granted]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(granted));
  const [confirming, setConfirming] = useState(false);
  /*
   * Every module starts CLOSED. Twelve open cards is a page you scroll rather
   * than read, and the header's count tells you what is inside without opening
   * it — which is the thing you usually came to check.
   *
   * Collapsing is safe for the save: the `perm.*` fields are built from every
   * row and live in the dialog's form, not in these cards, so a closed module
   * still submits. If they were in here, closing one would drop its fields and
   * the action would refuse the whole submission as incomplete.
   */
  const [openModules, setOpenModules] = useState<Set<string>>(() => new Set());

  /*
   * Converge on the server's answer after a save. `refresh()` re-runs the page
   * and hands down a new `granted`, but it does NOT remount this component, so
   * without this the ticks would stay on whatever was last clicked and the
   * screen could quietly disagree with what is stored.
   */
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    setConfirming(false);
    if (state.ok) setChecked(new Set(granted));
  }

  const rows = groups.flatMap((group) => group.items);
  const added = rows.filter(
    (p) => checked.has(p.codename) && !baseline.has(p.codename),
  );
  const removed = rows.filter(
    (p) => !checked.has(p.codename) && baseline.has(p.codename),
  );
  const changes = added.length + removed.length;

  function toggle(codename: string, on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      if (on) next.add(codename);
      else next.delete(codename);
      return next;
    });
  }

  function toggleModule(module: string) {
    setOpenModules((current) => {
      const next = new Set(current);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  function setModule(items: PermissionRow[], on: boolean) {
    setChecked((current) => {
      const next = new Set(current);
      for (const item of items) {
        if (on) next.add(item.codename);
        else next.delete(item.codename);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {state.formError && <Alert tone="danger">{state.formError}</Alert>}
      {state.ok && (
        <Alert tone="success">
          Saved. Everyone holding {roleLabel} is affected from their next
          request.
        </Alert>
      )}
      {!editable && readOnlyReason && (
        <Alert tone="info">{readOnlyReason}</Alert>
      )}

      {groups.map((group) => {
        const on = group.items.filter((p) => checked.has(p.codename)).length;
        // Changes hide inside a closed module, so the header says there are some.
        const touched = group.items.filter(
          (p) => checked.has(p.codename) !== baseline.has(p.codename),
        ).length;
        const isOpen = openModules.has(group.module);
        const bodyId = `module-${group.module}`;

        return (
          <Card
            key={group.module}
            title={
              <button
                type="button"
                onClick={() => toggleModule(group.module)}
                aria-expanded={isOpen}
                aria-controls={bodyId}
                className="-mx-1 flex flex-1 cursor-pointer items-center gap-2 rounded-control px-1 py-0.5 text-left transition-colors hover:bg-subtle"
              >
                <span
                  aria-hidden
                  className={cn(
                    "text-[10px] text-muted transition-transform duration-150",
                    isOpen && "rotate-90",
                  )}
                >
                  ▶
                </span>
                <span className="font-sans text-[13px] font-semibold text-ink capitalize">
                  {group.module}
                </span>
                <span className="font-mono text-[10.5px] text-faint">
                  {on}/{group.items.length}
                </span>
                {touched > 0 && (
                  <span className="rounded-badge bg-accent/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-accent">
                    {touched} changed
                  </span>
                )}
              </button>
            }
            actions={
              editable ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModule(group.items, true)}
                  >
                    All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setModule(group.items, false)}
                  >
                    None
                  </Button>
                </>
              ) : null
            }
            bodyClassName={isOpen ? undefined : "p-0"}
          >
            {isOpen && (
              <div id={bodyId} className="grid gap-0.5 sm:grid-cols-2">
                {group.items.map((permission) => (
                  <CheckboxRow
                    key={permission.codename}
                    id={`perm-${permission.codename}`}
                    label={permission.label}
                    hint={permission.codename}
                    checked={checked.has(permission.codename)}
                    disabled={!editable}
                    onChange={(on_) => toggle(permission.codename, on_)}
                  />
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {editable && (
        <div className="flex items-center justify-end gap-3">
          <span className="text-[12.5px] text-muted">
            {changes === 0
              ? "No changes"
              : `${changes} change${changes === 1 ? "" : "s"}`}
          </span>
          <Button disabled={changes === 0} onClick={() => setConfirming(true)}>
            Review changes
          </Button>
        </div>
      )}

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Change what ${roleLabel} may do?`}
        width="md"
      >
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="roleId" value={roleId} />
          {/*
            Every permission, always — never only the ticked ones. The write
            replaces the whole set, so an omitted field would be a silent
            revoke; the action refuses a submission that is missing any.
          */}
          {rows.map((permission) => (
            <input
              key={permission.codename}
              type="hidden"
              name={`perm.${permission.codename}`}
              value={checked.has(permission.codename) ? "true" : "false"}
            />
          ))}

          {/* Losses first, and in red — they are what a reader must catch. */}
          {removed.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[12.5px] font-semibold text-danger">
                Removing {removed.length}
              </p>
              <ul className="max-h-[28vh] overflow-y-auto rounded-control border border-danger/25 bg-danger-bg/40">
                {removed.map((p) => (
                  <li
                    key={p.codename}
                    className="flex items-center justify-between gap-4 px-3.5 py-2 text-[12.5px]"
                  >
                    <span className="text-ink">{p.label}</span>
                    <span className="font-mono text-[10.5px] text-faint">
                      {p.codename}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {added.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[12.5px] font-semibold text-ink">
                Adding {added.length}
              </p>
              <ul className="max-h-[28vh] overflow-y-auto rounded-control border border-line">
                {added.map((p) => (
                  <li
                    key={p.codename}
                    className="flex items-center justify-between gap-4 px-3.5 py-2 text-[12.5px]"
                  >
                    <span className="text-ink">{p.label}</span>
                    <span className="font-mono text-[10.5px] text-faint">
                      {p.codename}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/*
            BR-56 — this is the sentence that makes the cost of the click clear.
            The change is not queued and nobody is signed out.
          */}
          <p className="text-[11.5px] leading-relaxed text-faint">
            {accountCount === 1
              ? "1 account holds"
              : `${accountCount} accounts hold`}{" "}
            {roleLabel}. This takes effect on their next request — nobody is
            signed out, and work they have half-finished may be refused when they
            submit it. It can be reversed by changing it back, but there is no
            undo.
          </p>

          <div className="flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <SubmitButton variant="danger" pendingLabel="Applying…">
              Apply changes
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
