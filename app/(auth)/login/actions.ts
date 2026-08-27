"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import { fieldErrorsOf, required, safeRedirect, text } from "@/lib/form";
import { signIn } from "@/lib/auth/session";

const schema = z.object({
  username: z.string().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
});

export async function loginAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse({
    username: required(formData, "username"),
    password: required(formData, "password"),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await signIn(parsed.data.username, parsed.data.password);
  } catch (error) {
    return toActionState(error);
  }

  // Outside the try: `redirect` works by throwing, so catching around it would
  // swallow the navigation and report it as a failed sign-in.
  //
  // `next` is navigation state rather than a form field — it is never
  // validated into a field error, because there is no input to show one on.
  redirect(safeRedirect(text(formData, "next"), "/dashboard"));
}
