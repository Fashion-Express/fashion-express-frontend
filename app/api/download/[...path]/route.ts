import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getMe } from "@/lib/auth/session";

/**
 * The download door.
 *
 * Exports and printable documents are binary streams the browser has to receive
 * directly — a link, not a fetch. But the browser cannot call the API itself:
 * the session cookie belongs to this origin, not to the API's. So the link
 * points here, and this handler forwards the request with the cookie attached
 * and pipes the response straight back.
 *
 * The body is streamed rather than buffered — a full workbook export has no
 * business being read into memory on the way past.
 *
 * BR-01 still governs what comes back: an employee asking for another user's
 * invoice gets the API's 404, which is passed through unchanged.
 */

/**
 * A full workbook export is built on demand by the API, and the default
 * serverless timeout (10s) cuts the stream off mid-file rather than failing
 * loudly. This is the ceiling, not a reservation: a small attachment still
 * returns as fast as it always did.
 */
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const me = await getMe();
  if (!me) return new NextResponse("Not authenticated", { status: 401 });

  const { path } = await context.params;
  const target = `/${path.join("/")}${request.nextUrl.search}`;

  let upstream: Response;
  try {
    upstream = await apiFetch(target, { raw: true });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 502;
    return new NextResponse("Could not fetch that file.", { status });
  }

  if (!upstream.ok) {
    return new NextResponse(
      upstream.status === 404 ? "Not found." : "Could not fetch that file.",
      { status: upstream.status },
    );
  }

  const headers = new Headers();
  // Carry through only what the browser needs to save the file correctly.
  for (const header of ["content-type", "content-disposition", "content-length"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  // These are per-user documents; no shared cache should ever hold one.
  headers.set("Cache-Control", "private, no-store");

  return new NextResponse(upstream.body, { status: 200, headers });
}
