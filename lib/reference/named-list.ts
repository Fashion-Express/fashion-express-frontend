import "server-only";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createReference,
  deleteReference,
  getReferenceUsage,
  updateReference,
  type ReferenceList,
} from "@/lib/api/reference";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required } from "@/lib/form";

/**
 * FR-12.2 — the write half of a **named** reference list: job positions and
 * departments. A name, and whether the list still offers it. Nothing else.
 *
 * The three named lists are the same list twice over — the backend says so
 * itself, describing all twelve vocabularies in one registry rather than
 * writing twelve controllers, "because the pattern is the point". The rules
 * therefore live here once and each screen's `actions.ts` supplies only its
 * slug, so the two cannot drift apart.
 *
 * `description` is deliberately absent: the registry gives it to Product
 * categories alone, and sending one to a list without it is a 400 naming the
 * list. A shared form that quietly posted an empty description would turn every
 * save on these two screens into that error.
 *
 * The slug is a literal in each caller, never read from the form: these actions
 * are reachable by direct POST, and a slug taken off a request would let a
 * caller edit payment methods through the departments screen.
 */
export type NamedList = Extract<ReferenceList, "job-positions" | "departments">;

/** Both slugs are also their URL segment, as `categories` already is. */
const basePath = (list: NamedList) => `/settings/${list}`;

const namedSchema = z.object({
  name: z.string().min(1, "A name is required.").max(100, "Name is too long."),
  /**
   * A select, not a checkbox: an unchecked box is not sent at all, which is
   * indistinguishable from a field the form never rendered — both arrive as
   * `null` and `.optional()` rejects null.
   */
  isActive: z.enum(["true", "false"]),
});

function readForm(formData: FormData) {
  return {
    name: required(formData, "name"),
    isActive: required(formData, "isActive"),
  };
}

/** Writes need `manage_referencedata`, which is what the API's routes require. */
async function guard(): Promise<ActionState | null> {
  const me = await requireSession();
  return can(me, "manage_referencedata")
    ? null
    : { formError: "You do not have permission to manage reference data." };
}

export async function createNamedEntry(
  list: NamedList,
  formData: FormData,
): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = namedSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await createReference(list, {
      name: parsed.data.name,
      isActive: parsed.data.isActive === "true",
    });
  } catch (error) {
    return toActionState(error);
  }

  // Outside the try — `redirect` works by throwing, and a catch around it would
  // swallow the navigation and report it as a failure.
  redirect(basePath(list));
}

export async function updateNamedEntry(
  list: NamedList,
  formData: FormData,
): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  const parsed = namedSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await updateReference(list, required(formData, "id"), {
      name: parsed.data.name,
      isActive: parsed.data.isActive === "true",
    });
  } catch (error) {
    return toActionState(error);
  }

  redirect(basePath(list));
}

/**
 * BR-60 — an entry in use cannot be deleted at all, so the usage is read when
 * the dialog opens rather than after the API refuses. The answer comes from the
 * foreign keys pointing at the row, not a hand-maintained list.
 */
export async function namedEntryUsage(
  list: NamedList,
  id: string,
): Promise<{ total: number; byTable: Record<string, number> } | { error: string }> {
  await requireSession();

  try {
    return await getReferenceUsage(list, id);
  } catch {
    return { error: "Could not check what uses this entry." };
  }
}

export async function deleteNamedEntry(
  list: NamedList,
  formData: FormData,
): Promise<ActionState> {
  const denied = await guard();
  if (denied) return denied;

  try {
    await deleteReference(list, required(formData, "id"));
  } catch (error) {
    // A 409 names how many records use the entry and says to deactivate
    // instead. That sentence is written for the user; it is passed through.
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
