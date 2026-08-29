import type { Metadata } from "next";
import { getUser } from "@/lib/api/users";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import {
  Alert,
  Card,
  DetailList,
  PageBody,
  PageHeader,
  StatusPill,
} from "@/components/ui/surfaces";

export const metadata: Metadata = { title: "Profile" };

/**
 * The signed-in user's own account.
 *
 * What this page can offer is decided by the API, not by preference. There is
 * no `PATCH /me`: profile writes go through `PATCH /users/:id`, which requires
 * `change_user`, and even *reading* the full record needs `view_user`. So an
 * ordinary employee cannot change their own name, email or phone here — no
 * route exists that would let them, and drawing an editable form over a request
 * the server will refuse is worse than saying so.
 *
 * What every account can do regardless is set its own password: that route
 * checks the caller against the id itself rather than a permission, and is the
 * one self-service write in the whole users module.
 */
export default async function ProfilePage() {
  const me = await requireSession();

  // `GET /users/:id` is gated on `view_user`, which an employee does not hold —
  // including for their own row. Absent is the normal case, not a failure, so
  // it degrades to what /me already told us rather than taking the page down.
  const record = can(me, "view_user")
    ? await getUser(me.id).catch(() => null)
    : null;

  // Matches the real guard on /users/[id]/edit — offering the link without both
  // halves would land the user in a 404.
  const mayEdit = can(me, "change_user") && isManager(me);

  return (
    <>
      <PageHeader
        eyebrow="Account / Profile"
        title={me.displayName || me.username}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={me.userType.isSuperuser ? "accent" : "neutral"}>
              {me.userType.code}
            </StatusPill>
            <span className="font-mono">{me.username}</span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/profile/password" variant="outline">
              Update password
            </ButtonLink>
            {mayEdit && (
              <ButtonLink href={`/users/${me.id}/edit`}>Edit profile</ButtonLink>
            )}
          </>
        }
      />

      <PageBody>
        {!mayEdit && (
          <Alert tone="info">
            Your name, email and other details are maintained by a manager — the API
            has no self-service route for them. Your password is yours to change at
            any time, from the button above.
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card title="Profile">
            <DetailList
              columns={2}
              items={[
                { label: "Username", value: me.username, mono: true },
                { label: "Display name", value: me.displayName || "—" },
                // Everything below comes from the full record, which only an
                // account holding `view_user` can read.
                ...(record
                  ? [
                      { label: "Employee ID", value: record.employee_id, mono: true },
                      { label: "Email", value: record.email || "—" },
                      { label: "Phone", value: record.phone || "—", mono: true },
                      { label: "Job position", value: record.job_position ?? "—" },
                      { label: "Department", value: record.department ?? "—" },
                      {
                        label: "Joined",
                        value: record.join_date ? formatDate(record.join_date) : "—",
                        mono: true,
                      },
                      { label: "Salary", value: formatMoney(record.salary), mono: true },
                    ]
                  : []),
              ]}
            />
          </Card>

          <Card title="Access">
            <DetailList
              columns={1}
              items={[
                { label: "Account type", value: record?.user_type_label ?? me.userType.code },
                {
                  label: "Privilege",
                  value: me.userType.isSuperuser
                    ? "Owner — passes every permission check"
                    : me.userType.isManager
                      ? "Manager"
                      : "Standard",
                },
                {
                  label: "Home shop",
                  value: record?.shop_name ?? (me.shopId ? "Assigned" : "None"),
                },
                {
                  label: "Permissions held",
                  value: me.userType.isSuperuser
                    ? "All (owner)"
                    : String(me.permissions.length),
                  mono: true,
                },
              ]}
            />

            {/*
              BR-57 — privilege comes from the TYPE, not the account, which is
              why there is nothing to change here even for someone who could.
            */}
            <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint">
              Your home shop defaults the create forms; it does not limit what you can
              see. Privilege comes from the account type — changing it is a manager
              action on the account, not a setting here.
            </p>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
