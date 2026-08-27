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
