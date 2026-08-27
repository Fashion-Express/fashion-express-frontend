"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import { createUser, setUserPassword, updateUser } from "@/lib/api/users";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";
import { parseMoneyInput } from "@/lib/format/money";

/**
 * `employeeId` is generated once and never editable (FR-00.8, BR-45), and
 * `isSuperuser`/`isManager` are not columns at all — privilege comes from the
 * TYPE, so promoting someone means changing their `userTypeId`. Each is a 400
 * rather than a silent ignore, so none of them appears in any schema here.
 */

const profileFields = {
  name: z.string().min(1, "A display name is required."),
  userTypeId: z.string().min(1, "Every account has exactly one type."),
  email: z
    .union([z.string().email("Enter a valid email address."), z.literal("")])
    .optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  joinDate: z.string().optional(),
  jobPositionId: z.string().optional(),
  departmentId: z.string().optional(),
  shopId: z.string().optional(),
  statusCode: z.enum(["active", "inactive", "on_leave"]).optional(),
};

const createSchema = z.object({
  ...profileFields,
  username: z
    .string()
    .min(3, "A username is 3–30 characters.")
    .max(30, "A username is 3–30 characters.")
    .regex(/^[A-Za-z0-9._-]+$/, "Letters, digits, and . _ - only."),
  password: z.string().min(8, "A password is at least 8 characters."),
});

const updateSchema = z.object(profileFields);

function readForm(formData: FormData) {
  return {
    name: required(formData, "name"),
    userTypeId: required(formData, "userTypeId"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    address: text(formData, "address"),
    notes: text(formData, "notes"),
    joinDate: text(formData, "joinDate"),
    jobPositionId: text(formData, "jobPositionId"),
    departmentId: text(formData, "departmentId"),
    shopId: text(formData, "shopId"),
    statusCode: text(formData, "statusCode"),
  };
}

export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_user")) {
    return { formError: "You do not have permission to add a staff account." };
  }

  const parsed = createSchema.safeParse({
    ...readForm(formData),
    username: required(formData, "username"),
    password: required(formData, "password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  // Salary is a decimal STRING end to end — a JSON number would be a float.
  const salary = parseMoneyInput(formData.get("salary"));

  let id: string;
  try {
    // The account and its credential are created in one transaction; a
    // duplicate username rolls the whole thing back, leaving no orphan.
    const user = await createUser({ ...parsed.data, salary: salary ?? undefined });
    id = user.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/users/${id}`);
}

export async function updateUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_user")) {
    return { formError: "You do not have permission to edit a staff account." };
  }

  const id = required(formData, "id");
  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const salary = parseMoneyInput(formData.get("salary"));

  try {
    await updateUser(id, { ...parsed.data, salary: salary ?? undefined });
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/users/${id}`);
}

/**
 * Retiring someone is a STATUS change, not a deletion — only an `active`
 * account may authenticate, and only active accounts count toward the
 * dashboard's employee figure.
 *
 * Refused on your own account: setting your own status to anything but active
 * ends your session on the very next request, and recovering means going into
 * the database.
 */
export async function setUserStatusAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_user")) {
    return { formError: "You do not have permission to change a staff account." };
  }

  const id = required(formData, "id");
  if (id === me.id) {
    return {
      formError:
        "You cannot change your own status — only an active account may sign in, so this would lock you out immediately.",
    };
  }

  const statusCode = text(formData, "statusCode");
  if (statusCode !== "active" && statusCode !== "inactive" && statusCode !== "on_leave") {
    return { formError: "That is not a valid employment status." };
  }

  try {
    await updateUser(id, { statusCode });
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/** Anyone may change their own; changing someone else's needs `change_user`. */
export async function setPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  const id = required(formData, "id");

  if (id !== me.id && !can(me, "change_user")) {
    return { formError: "You do not have permission to change this password." };
  }

  const password = required(formData, "password");
  if (password.length < 8) {
    return { fieldErrors: { password: "A password is at least 8 characters." } };
  }

  try {
    await setUserPassword(id, password);
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
