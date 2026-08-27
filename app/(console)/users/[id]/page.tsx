import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getUser, listUserTypes } from "@/lib/api/users";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, DetailList, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { AccountControls } from "./account-controls";

export const metadata: Metadata = { title: "User" };

const STATUS_TONE = {
  active: "success",
  inactive: "neutral",
  on_leave: "warning",
} as const;

export default async function UserDetailPage(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "view_user") || !isManager(me)) forbidden("Staff accounts are manager-only.");

  let user;
  try {
    user = await getUser(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const types = await listUserTypes().catch(() => []);
  const type = types.find((candidate) => candidate.id === user.user_type_id);
  const isSelf = user.id === me.id;

  return (
    <>
      <PageHeader
        eyebrow={`Users / ${user.employee_id}`}
        title={user.name}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={STATUS_TONE[user.status_code]}>{user.status_label}</StatusPill>
            <span className="font-mono">{user.username}</span>
            <span className="text-faint">· {user.user_type_label}</span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/users" variant="outline">← Back</ButtonLink>
            {can(me, "change_user") && (
              <ButtonLink href={`/users/${user.id}/edit`}>Edit</ButtonLink>
            )}
          </>
        }
      />

      <PageBody>
        {isSelf && (
          <Alert tone="info">
            This is your own account. Its employment status cannot be changed from here —
            only an active account may sign in, so doing so would lock you out on the
            very next request.
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card title="Account">
            <DetailList
              columns={2}
              items={[
                { label: "Employee ID", value: user.employee_id, mono: true },
                { label: "Username", value: user.username, mono: true },
                { label: "Display name", value: user.name },
                { label: "Email", value: user.email || "—" },
                { label: "Phone", value: user.phone || "—", mono: true },
                { label: "Home shop", value: user.shop_name ?? "—" },
                { label: "Job position", value: user.job_position ?? "—" },
                { label: "Department", value: user.department ?? "—" },
                { label: "Joined", value: user.join_date ? formatDate(user.join_date) : "—", mono: true },
                { label: "Salary", value: formatMoney(user.salary), mono: true },
              ]}
            />
          </Card>

          <Card title="Type and access">
            <DetailList
              columns={1}
              items={[
                { label: "Account type", value: user.user_type_label },
                {
                  label: "Privilege",
                  value: type
                    ? type.is_superuser
                      ? "Superuser — passes every permission check"
                      : type.is_manager
                        ? "Manager"
                        : "Standard"
                    : "—",
                },
                {
                  label: "Employment status",
                  value: user.status_label,
                },
                {
                  label: "Can sign in",
                  value: user.is_active ? "Yes" : "No",
                },
              ]}
            />

            {/*
              These two answer different questions and both matter: the status
              is the person's employment state, `is_active` says whether the
              account may authenticate at all. Suspending an Owner does not stop
              them being an Owner.
            */}
            <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint">
              Privilege comes from the type, not the account — to promote someone, change
              their type. Only an account whose status is active counts toward the
              dashboard&rsquo;s employee figure.
            </p>
          </Card>
        </div>

        {can(me, "change_user") && (
          <AccountControls
            userId={user.id}
            username={user.username}
            statusCode={user.status_code}
            isSelf={isSelf}
          />
        )}
      </PageBody>
    </>
  );
}
