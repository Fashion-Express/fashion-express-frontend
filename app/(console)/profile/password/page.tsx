import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Update password" };

/**
 * No permission check beyond being signed in, and that is correct: the API's
 * `POST /users/:id/password` carries no permission decorator either. It
 * compares the id to the caller instead, because the rule depends on the value
 * of a route parameter rather than on a role — anyone may change their own,
 * only `change_user` changes someone else's. This page is always the "own" case.
 */
export default async function UpdatePasswordPage() {
  const me = await requireSession();

  return (
    <>
      <PageHeader
        eyebrow="Account / Password"
        title="Update password"
        meta={`Signed in as ${me.username}`}
      />
      <PageBody>
        <PasswordForm username={me.username} />
      </PageBody>
    </>
  );
}
