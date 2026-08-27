import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

/**
 * The mockup's split screen: dark key art on the left, the form on the right.
 * Below `md` the key art is dropped rather than stacked — on a phone it would
 * push the form below the fold for no gain.
 */
export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[46%] max-w-[620px] flex-col justify-between bg-shell p-11 md:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-[9px] bg-accent font-sans text-[13px] font-bold text-accent-ink">
            O
          </span>
          <span className="font-sans text-sm font-semibold text-shell-ink">OrgMS</span>
        </div>

        <div className="flex flex-col gap-6">
          <p className="max-w-[400px] font-sans text-[26px] leading-[1.35] font-medium tracking-[-0.02em] text-shell-ink text-pretty">
            Customers, inventory, suppliers and sales — run from one place.
          </p>
          <p className="max-w-[400px] font-mono text-[11px] leading-relaxed text-shell-faint">
            Fashion Express · one ledger, one stock position, one set of numbers.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 sm:p-11">
        <div className="w-full max-w-[380px] animate-fade-up">
          <LoginForm next={next} />
        </div>
      </main>
    </div>
  );
}
