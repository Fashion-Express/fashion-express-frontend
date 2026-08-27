import "server-only";

import { cookies } from "next/headers";
import { toApiError } from "./errors";

/**
 * The single door onto the NestJS API.
 *
 * Everything here runs on the Next.js server, never in the browser. That is
 * forced by the backend's design, not a preference: authentication is an
 * HttpOnly `better-auth.session_token` cookie with no bearer-token equivalent,
 * so browser JavaScript cannot read or attach it. Keeping the calls server-side
 * also means CORS never enters the picture — it constrains browsers, not
 * server-to-server requests.
 */

export const SESSION_COOKIE = "better-auth.session_token";

function baseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error(
      "API_BASE_URL is not set. Copy .env.example to .env.local — it must point at the NestJS API, e.g. http://localhost:3000/api",
    );
  }
  return url.replace(/\/$/, "");
}

/** Deliberately not NEXT_PUBLIC_: the browser never calls the API directly. */
function appOrigin(): string {
  return process.env.APP_ORIGIN ?? "http://localhost:5173";
}

export type Query = Record<
  string,
  string | number | boolean | null | undefined
>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Send no session cookie — sign-in, and only sign-in. */
  anonymous?: boolean;
  /** Return the raw Response instead of parsed JSON (file exports, Set-Cookie). */
  raw?: boolean;
};

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    // An absent filter and an empty filter mean the same thing to these
    // endpoints, and sending `?search=` would be a search for nothing.
    if (value === null || value === undefined || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export async function apiFetch(
  path: string,
  options: RequestOptions & { raw: true },
): Promise<Response>;
export async function apiFetch<T>(
  path: string,
  options?: RequestOptions,
): Promise<T>;
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T | Response> {
  const { method = "GET", body, query, anonymous = false, raw = false } = options;

  const headers = new Headers({ Accept: "application/json" });

  // FormData carries its own multipart Content-Type with a generated boundary.
  // Setting the header by hand would overwrite that boundary and the upload
  // would arrive unparseable.
  const isMultipart = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isMultipart) {
    headers.set("Content-Type", "application/json");
  }

  if (!anonymous) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) headers.set("Cookie", `${SESSION_COOKIE}=${token}`);
  }

  /**
   * better-auth guards its OWN routes with an origin check that fires as soon
   * as a session cookie is present — a missing Origin is a 403
   * MISSING_OR_NULL_ORIGIN, which looks baffling because the same call worked
   * before you were signed in. Nest's routes never want the header, so it is
   * sent only where it is required, and the value has to be listed in the
   * backend's TRUSTED_ORIGINS.
   */
  if (path.startsWith("/auth/")) headers.set("Origin", appOrigin());

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : isMultipart
          ? (body as FormData)
          : JSON.stringify(body),
    // Every response here is per-user and authenticated. There is nothing to
    // cache and caching it would leak one user's data to the next.
    cache: "no-store",
  });

  if (raw) return response;

  if (!response.ok) {
    throw toApiError(
      response.status,
      await readJson(response),
      `Request failed with status ${response.status}.`,
    );
  }

  // 204 from every DELETE, and better-auth's sign-out sends no body either.
  if (response.status === 204) return undefined as T;

  return (await readJson(response)) as T;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // An HTML error page from a proxy, or the API being down. Keep the body as
    // the message rather than throwing a parse error over the real problem.
    return { message: text.slice(0, 300) };
  }
}
