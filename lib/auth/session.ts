import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch, SESSION_COOKIE } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Id } from "@/lib/api/types";
import type { Permission } from "./permissions";

/**
 * `GET /api/me` — the route the shell actually wants. better-auth's own
 * get-session cannot answer it, because it knows nothing about user types or
 * permissions.
 */
export type Me = {
  id: Id;
  username: string;
  displayName: string;
  userType: {
    id: Id;
    code: string;
    isSuperuser: boolean;
    isManager: boolean;
  };
  /**
   * The user's HOME shop — what create forms default to. It does not restrict
   * what they can see; visibility is enforced per-route on the server.
   */
  shopId: Id | null;
  /** Sorted and complete. Presentation only — see `can` below. */
  permissions: string[];
};

/**
 * Deduped per request: the console layout and the page inside it both want the
 * session, and React's `cache` makes that one HTTP call rather than two.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    return await apiFetch<Me>("/me");
  } catch (error) {
    // An expired or revoked session looks exactly like a missing one to the
    // caller; anything else is a real failure and should surface.
    if (error instanceof ApiError && error.isUnauthorized) return null;
    throw error;
  }
});

/** For any page or layout behind the console shell. */
export async function requireSession(): Promise<Me> {
  const me = await getMe();
  /*
   * `session_expired` asks `proxy.ts` to clear the cookie on the way through.
   * A Server Component cannot delete one itself, and a cookie the API has
   * rejected must not survive this redirect: the proxy trusts that a cookie
   * EXISTS, so it would bounce /login straight back here and loop forever.
   */
  if (!me) redirect("/login?session_expired=1");
  return me;
}

/**
 * Whether to render a menu item or a button.
 *
 * This is presentation, not security. The server enforces the same rules on
 * every route regardless of what the client draws, and a Server Action is
 * reachable by direct POST — so an action must never treat a hidden button as
 * proof that the caller lacked the permission.
 *
 * An Owner (`isSuperuser`) short-circuits every check, matching the backend.
 * That short-circuit is why the permission name is TYPED: a name the backend
 * never seeds is unreachable for everyone else while passing silently for an
 * Owner, so a typo here is invisible to whoever is usually testing.
 */
export function can(me: Me | null, permission: Permission): boolean {
  if (!me) return false;
  return me.userType.isSuperuser || me.permissions.includes(permission);
}

export function canAny(me: Me | null, permissions: readonly Permission[]): boolean {
  return permissions.some((permission) => can(me, permission));
}

export function isManager(me: Me | null): boolean {
  return Boolean(me && (me.userType.isSuperuser || me.userType.isManager));
}

/* -------------------------------------------------------------------------
   Sign in / sign out
   ------------------------------------------------------------------------- */

/**
 * Signs in against better-auth and re-issues its session cookie on THIS origin.
 *
 * The upstream `Set-Cookie` cannot simply be passed through: it was minted for
 * the API's origin, and the browser is talking to Next.js. So the cookie is
 * read off the upstream response and set again here, keeping the flags that
 * matter — HttpOnly so script cannot read it, SameSite=Lax so it is not sent on
 * a cross-site POST (that is what protects every route from CSRF), and the same
 * lifetime the server chose.
 */
export async function signIn(username: string, password: string): Promise<void> {
  const response = await apiFetch("/auth/sign-in/username", {
    method: "POST",
    body: { username, password },
    anonymous: true,
    raw: true,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string;
      code?: string;
    };

    // 429 is the lockout: 5 consecutive failures for the same username + IP
    // locks the account for an hour, and the check runs BEFORE the password is
    // examined — so the correct password is refused too. Saying "invalid
    // password" there would send someone in circles.
    throw new ApiError({
      status: response.status,
      message:
        body.message ??
        (response.status === 401
          ? "Invalid username or password."
          : "Could not sign in. Please try again."),
      code: body.code,
    });
  }

  const setCookie = response.headers
    .getSetCookie()
    .find((value) => value.startsWith(`${SESSION_COOKIE}=`));

  if (!setCookie) {
    throw new ApiError({
      status: 502,
      message:
        "The API accepted the sign-in but returned no session cookie. Check that the frontend origin is listed in the backend's TRUSTED_ORIGINS.",
    });
  }

  const token = setCookie.slice(`${SESSION_COOKIE}=`.length).split(";")[0];
  const maxAge = Number(/Max-Age=(\d+)/i.exec(setCookie)?.[1] ?? 60 * 60 * 24 * 7);

  (await cookies()).set(SESSION_COOKIE, decodeURIComponent(token), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function signOut(): Promise<void> {
  try {
    // This is the one call that needs an Origin header, and apiFetch adds it
    // for every /auth/* path. A 403 MISSING_OR_NULL_ORIGIN here means
    // APP_ORIGIN is not in the backend's TRUSTED_ORIGINS.
    await apiFetch("/auth/sign-out", { method: "POST", raw: true });
  } catch {
    // Whatever the server says, the local session has to go — otherwise the
    // user is stuck signed in to a session they asked to end.
  }

  (await cookies()).delete(SESSION_COOKIE);
}

/** Drop a session cookie the API has already rejected. */
export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
