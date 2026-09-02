"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createReference,
  deleteReference,
  getReferenceUsage,
  updateReference,
} from "@/lib/api/reference";
import { getRoleGrants, setRoleGrants } from "@/lib/api/roles";
import { requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text, valuesOf } from "@/lib/form";

/**
 * FR-00.4 — replace what a role grants.
 *
 * The check is `isSuperuser`, not `can()`: this is a privilege *level* rather
 * than a capability, for the reason the API uses `@RequireSuperuser` — anyone
 * who can edit grants can grant themselves anything, so gating it on a
 * permission would let a role hand itself that permission. The server enforces
 * the same thing; this only decides whether to bother asking.
 */
export async function setRoleGrantsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!me.userType.isSuperuser) {
    return {
      formError: "Only an administrator may change what a role grants.",
    };
  }

  const roleId = text(formData, "roleId");
  if (!roleId) return { formError: "No role was named." };

  /*
   * The catalogue is re-read from the API rather than trusted from the form:
   * the set of permissions that exist is the server's fact, and a form that
   * omitted rows would otherwise decide what a role does not grant.
   */
  let catalogue: string[];
  try {
    catalogue = (await getRoleGrants(roleId)).catalogue.map((p) => p.codename);
  } catch (error) {
    return toActionState(error);
  }

  /*
   * Every permission arrives as its own always-present `perm.<codename>` field
   * holding "true" or "false".
   *
   * A MISSING field is an error, never a silent "false". The write replaces the
   * whole set, so a partial submission — a stale tab, a half-rendered form —
   * would quietly revoke everything it failed to mention. This is the same
   * hazard the house rule about checkboxes names, handled rather than avoided.
   */
  const granted: string[] = [];
  const missing: string[] = [];

  for (const codename of catalogue) {
    const value = text(formData, `perm.${codename}`);
    if (value === undefined) {
      missing.push(codename);
      continue;
    }
    if (value === "true") granted.push(codename);
  }

  if (missing.length > 0) {
    return {
      formError:
        "That submission was incomplete, so it was not saved — saving would " +
        "have revoked every permission it did not mention. Reload the page " +
        "and try again.",
    };
  }

  try {
    await setRoleGrants(roleId, granted);
  } catch (error) {
    // 403 (not an administrator / disabled / unrestricted role / your own) and
    // 400 (unknown codename) all carry a sentence written for the user.
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------
   FR-12.1 — the roles themselves.

   A role is a `user-types` entry, the "coded" reference tier: a stable `code`
   that logic and history key on and that is fixed once created (BR-59), plus a
   freely editable label. Both privilege flags are administrator-only on the
   API, so every action here re-checks the same thing rather than relying on a
   hidden button.
   ------------------------------------------------------------------------- */

const LIST = "user-types" as const;

const roleSchema = z.object({
  label: z.string().min(1, "A role needs a label.").max(60, "Label is too long."),
  description: z.string().optional(),
  /** Booleans travel as "true"/"false" strings — see `lib/form.ts`. */
  isManager: z.enum(["true", "false"]),
  isSuperuser: z.enum(["true", "false"]),
  isActive: z.enum(["true", "false"]),
});

/** BR-59 — set once, never editable, so it is read on create only. */
const codeSchema = z
  .string()
  .min(1, "A code is required.")
  .max(30, "Code is too long.")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Start with a letter; lower-case letters, digits and underscores only.",
  );

async function administrator(): Promise<ActionState | null> {
  const me = await requireSession();
  return me.userType.isSuperuser
    ? null
    : {
        formError:
          "Only an administrator may create or change a role — a role decides " +
          "what everyone holding it may do.",
      };
}

function readRole(formData: FormData) {
  return {
    label: required(formData, "label"),
    description: text(formData, "description"),
    isManager: required(formData, "isManager"),
    isSuperuser: required(formData, "isSuperuser"),
    isActive: required(formData, "isActive"),
  };
}

export async function createRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = valuesOf(formData);

  const denied = await administrator();
  if (denied) return { ...denied, values };

  const parsed = roleSchema.safeParse(readRole(formData));
  const code = codeSchema.safeParse(required(formData, "code"));
  if (!parsed.success || !code.success) {
    return {
      fieldErrors: {
        ...(parsed.success ? {} : fieldErrorsOf(parsed.error)),
        ...(code.success ? {} : { code: code.error.issues[0].message }),
      },
      values,
    };
  }

  try {
    await createReference(LIST, {
      code: code.data,
      label: parsed.data.label,
      description: parsed.data.description ?? "",
      isManager: parsed.data.isManager === "true",
      isSuperuser: parsed.data.isSuperuser === "true",
      isActive: parsed.data.isActive === "true",
    });
  } catch (error) {
    // A duplicate code is a 409 naming the constraint; it maps onto the field.
    return { ...toActionState(error), values };
  }

  redirect("/settings/roles");
}

export async function updateRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const values = valuesOf(formData);

  const denied = await administrator();
  if (denied) return { ...denied, values };

  const parsed = roleSchema.safeParse(readRole(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values };
  }

  try {
    // No `code`: it is fixed once created (BR-59) and the API has no field for it.
    await updateReference(LIST, required(formData, "id"), {
      label: parsed.data.label,
      description: parsed.data.description ?? "",
      isManager: parsed.data.isManager === "true",
      isSuperuser: parsed.data.isSuperuser === "true",
      isActive: parsed.data.isActive === "true",
    });
  } catch (error) {
    return { ...toActionState(error), values };
  }

  redirect("/settings/roles");
}

/**
 * BR-60 — what would break if this role went. Its own permission grants are
 * NOT counted: they are part of the role, and the foreign key cascades them
 * away with it. What counts is accounts holding it.
 */
export async function loadRoleUsage(id: string) {
  await requireSession();
  try {
    return await getReferenceUsage(LIST, id);
  } catch {
    return { error: "Could not check what uses this role." };
  }
}

export async function deleteRoleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const denied = await administrator();
  if (denied) return denied;

  try {
    await deleteReference(LIST, required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
