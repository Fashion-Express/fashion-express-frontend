"use client";

import { useActionState, useState } from "react";
import { cn } from "@/lib/cn";
import { Alert, Card } from "@/components/ui/surfaces";
import { SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import { ACCENTS, type Accent, type Theme, type ThemeMode } from "@/lib/theme/tokens";
import { saveThemeAction } from "./actions";

const MODES: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: "light", label: "Light", description: "Always the light palette" },
  { value: "dark", label: "Dark", description: "Always the dark palette" },
  { value: "system", label: "System", description: "Follow the operating system" },
];

export function AppearanceForm({
  theme,
  disabled,
}: {
  theme: Theme;
  disabled: boolean;
}) {
  const [accent, setAccent] = useState<Accent>(theme.accent);
  const [mode, setMode] = useState<ThemeMode>(theme.mode);
  const [state, formAction] = useActionState<ActionState, FormData>(saveThemeAction, {});

  const dirty = accent !== theme.accent || mode !== theme.mode;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="accent" value={accent} />
      <input type="hidden" name="mode" value={mode} />

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}
      {state.ok && !dirty && <Alert tone="success">Appearance saved.</Alert>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Accent colour">
          <fieldset disabled={disabled} className="flex flex-col gap-4">
            <legend className="sr-only">Accent colour</legend>

            <div className="flex flex-wrap gap-3">
              {ACCENTS.map((option) => {
                const selected = option.value === accent;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccent(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-control border px-3 py-2.5 transition-shadow",
                      selected
                        ? "border-ink shadow-[0_0_0_3px_rgb(26_23_20_/_0.12)]"
                        : "border-line hover:bg-subtle",
                      disabled && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <span
                      className="size-5 flex-none rounded-full"
                      style={{ background: option.value }}
                    />
                    <span className="text-[12.5px] font-medium text-ink">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/*
              A live preview, so the choice is judged against the real thing
              rather than a swatch. It uses the pending accent, not the saved
              one, which is why it is inline style rather than a token.
            */}
            <div className="flex flex-col gap-3 rounded-card bg-shell p-4">
              <p className="font-sans text-[12.5px] font-semibold text-shell-ink">
                Preview
              </p>
              <div className="flex flex-col gap-2.5 rounded-[10px] bg-white p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[12px] font-semibold text-[#1A1714]">
                    Sales balance due
                  </span>
                  <span
                    className="size-2 rounded-full"
                    style={{ background: accent }}
                  />
                </div>
                <span className="font-mono text-[22px] font-semibold text-[#1A1714]">
                  ৳5,000
                </span>
                <span
                  className="flex h-[34px] items-center justify-center rounded-lg font-sans text-[12px] font-semibold text-white"
                  style={{ background: accent }}
                >
                  New sale
                </span>
              </div>
            </div>
          </fieldset>
        </Card>

        <Card title="Appearance mode">
          <fieldset disabled={disabled} className="flex flex-col gap-2.5">
            <legend className="sr-only">Appearance mode</legend>

            {MODES.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-control border px-3.5 py-3 transition-colors",
                  mode === option.value
                    ? "border-accent bg-accent/5"
                    : "border-line hover:bg-subtle",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="radio"
                  name="modeChoice"
                  value={option.value}
                  checked={mode === option.value}
                  onChange={() => setMode(option.value)}
                  className="mt-0.5 accent-[var(--accent)]"
                />
                <span>
                  <span className="block text-[12.5px] font-semibold text-ink">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-muted">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
        </Card>
      </div>

      {!disabled && (
        <div className="flex justify-end">
          <SubmitButton disabled={!dirty} pendingLabel="Applying…">
            Save appearance
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
