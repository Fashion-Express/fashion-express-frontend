import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 renamed `middleware` to `proxy`. It runs on the Node runtime and
 * cannot be configured onto the edge.
 *
 * This is a fast path, NOT the security boundary: it only checks whether a
 * session cookie is present, because verifying it would mean an API round trip
 * on every request including static assets. Whether the session is still valid
 * is decided by `requireSession()` in the console layout, which asks the API.
 */
const SESSION_COOKIE = "better-auth.session_token";

/**
 * Set by `requireSession()` when the API has refused the cookie we are holding.
 * It travels as a query param because a Server Component cannot delete a
 * cookie — only a proxy or a Server Action can — so the layout has to ask us.
 */
const REJECTED_PARAM = "session_expired";

export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has(SESSION_COOKIE);
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/login";

  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Come back to where they were headed once signed in.
    url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (signedIn && isLogin) {
    /*
     * A cookie the API has already rejected. Drop it and let the form render.
     *
     * Without this the two halves of the check deadlock: we only know a cookie
     * EXISTS, so we send /login to /dashboard, while the console layout asks
     * the API, is told 401, and sends /dashboard back to /login. The browser
     * gives up on the loop and shows a blank page.
     */
    if (request.nextUrl.searchParams.has(REJECTED_PARAM)) {
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next's own assets and the favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
