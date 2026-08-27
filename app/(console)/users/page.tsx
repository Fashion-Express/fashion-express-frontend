import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { listUsers, listUserTypes } from "@/lib/api/users";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Users" };

const STATUS_TONE = {
  active: "success",
  inactive: "neutral",
  on_leave: "warning",
} as const;

export default async function UsersPage(props: PageProps<"/users">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const statusCode = firstParam(params.statusCode);
  const userTypeId = firstParam(params.userTypeId);
  const shopId = firstParam(params.shopId);
  const page = pageParam(params.page);

  const me = await requireSession();
  if (!can(me, "view_user") || !isManager(me)) forbidden("Staff accounts are manager-only.");

  const [users, types] = await Promise.all([
    listUsers({ page, search, statusCode, userTypeId, shopId }),
    listUserTypes().catch(() => []),
  ]);

  const filtered = Boolean(search || statusCode || userTypeId);

  return (
    <>
      <PageHeader
        eyebrow="Users"
        title="Staff accounts"
        meta="Privilege comes from the account type, not the account."
        actions={
          can(me, "add_user") ? <ButtonLink href="/users/new">+ Add user</ButtonLink> : null
        }
      />

      <PageBody>
        <FilterBar
          basePath="/users"
          values={{ search, statusCode, userTypeId }}
          fields={[
            { type: "search", name: "search", placeholder: "Search username, name, employee ID or email" },
            {
              type: "select",
              name: "statusCode",
              label: "All statuses",
              options: [
                { value: "active", label: "Active" },
                { value: "on_leave", label: "On leave" },
                { value: "inactive", label: "Inactive" },
              ],
            },
            {
              type: "select",
              name: "userTypeId",
              label: "All types",
              options: types.map((type) => ({ value: type.id, label: type.label })),
            },
          ]}
        />

        {users.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No accounts match that filter" : "No staff accounts"}
            description="Every account has exactly one type, and that type carries its permissions."
            action={
              can(me, "add_user") && !filtered ? (
                <ButtonLink href="/users/new">+ Add user</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Employee ID</Th>
                  <Th>Username</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th>Shop</Th>
                  <Th>Joined</Th>
                  <Th align="right">Salary</Th>
                  <Th>Status</Th>
                  <Th>Sign-in</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {users.items.map((user) => (
                <Tr key={user.id}>
                  <Td mono className="text-accent">{user.employee_id}</Td>
                  <Td strong mono>{user.username}</Td>
                  <Td>{user.name}</Td>
                  <Td>{user.user_type_label}</Td>
                  <Td>{user.shop_name ?? "—"}</Td>
                  <Td mono>{user.join_date ? formatDate(user.join_date) : "—"}</Td>
                  <Td align="right" mono>{formatMoney(user.salary)}</Td>
                  <Td>
                    <StatusPill tone={STATUS_TONE[user.status_code]}>{user.status_label}</StatusPill>
                  </Td>
                  <Td>
                    {/*
                      `status_code` and `is_active` answer different questions:
                      the status is the person's employment state, `is_active`
                      says whether the account may authenticate at all.
                    */}
                    <StatusPill tone={user.is_active ? "success" : "danger"}>
                      {user.is_active ? "Enabled" : "Disabled"}
                    </StatusPill>
                  </Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/users/${user.id}`}>View</RowLink>
                      {can(me, "change_user") && (
                        <>
                          <span className="text-faint">·</span>
                          <RowLink href={`/users/${user.id}/edit`}>Edit</RowLink>
                        </>
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={users}
              noun="accounts"
              basePath="/users"
              searchParams={{ search, statusCode, userTypeId, shopId }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
