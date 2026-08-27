"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * The console's error boundary. It deliberately does not print `error.message`:
 * a failure here is usually an API error whose text was written for a
 * developer, and in production React replaces it with a digest anyway.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[orgms]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="flex max-w-md flex-col items-start gap-4 rounded-card border border-line bg-surface p-8">
        <p className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
          Something went wrong
        </p>
        <h1 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
          This page could not be loaded
        </h1>
        <p className="text-[12.5px] leading-relaxed text-muted">
          The API may be unreachable, or the session may have expired. Try again, and
          sign in again if the problem continues.
        </p>
        {error.digest && (
          <p className="font-mono text-[11px] text-faint">Reference: {error.digest}</p>
        )}
        <div className="flex gap-2.5 pt-1">
          <Button onClick={reset}>Try again</Button>
          <a
            href="/login"
            className="inline-flex h-control items-center rounded-control border border-line px-4 text-[12.5px] font-semibold text-ink-soft no-underline hover:bg-subtle"
          >
            Sign in again
          </a>
        </div>
      </div>
    </div>
  );
}
