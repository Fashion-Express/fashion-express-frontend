import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="flex max-w-md flex-col items-start gap-4 rounded-card border border-line bg-surface p-8">
        <p className="font-mono text-[10.5px] tracking-[0.1em] text-muted uppercase">
          404
        </p>
        <h1 className="font-sans text-[20px] font-semibold tracking-[-0.02em] text-ink">
          Not found
        </h1>
        <p className="text-[12.5px] leading-relaxed text-muted">
          This record does not exist, or your account cannot see it.
        </p>
        <Link
          href="/dashboard"
          className="mt-1 inline-flex h-control items-center rounded-control bg-ink px-4 text-[12.5px] font-semibold text-canvas no-underline"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
