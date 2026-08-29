"use server";

import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import { setUserPassword } from "@/lib/api/users";
import { requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required } from "@/lib/form";

/**
 * Changing your OWN password.
 *
 * Deliberately separate from `setPasswordAction` in the users module, for two
 * reasons:
 *
 *  - The id is taken from the SESSION and never from the form. That action has
 *    to accept an id, because an administrator uses it to set someone else's;
 *    this one does not, so it does not read one. A Server Action is reachable
 *    by direct POST, and the safest field is the one that isn't there.
 *  - It requires the new password twice. The API cannot ask for the current one
 *    (`POST /users/:id/password` takes only the new value), so a typo would
 *    otherwise lock the user out of their own account with nothing to compare
 *    against. The confirmation is the only check available, which makes it
 *    worth having rather than ceremony.
 */
const schema = z
  .object({
    password: z.string().min(8, "A password is at least 8 characters."),
    confirmPassword: z.string().min(1, "Type the new password again."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "The two passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changeOwnPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();

  const parsed = schema.safeParse({
    password: required(formData, "password"),
    confirmPassword: required(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    // `me.id`, not a form value — see above.
    await setUserPassword(me.id, parsed.data.password);
  } catch (error) {
    return toActionState(error);
  }

  // No redirect: the user stays put and the form reports success in place.
  // Existing sessions are unaffected by a password change, so this one survives
  // and there is nothing to sign back into.
  return { ok: true };
}
