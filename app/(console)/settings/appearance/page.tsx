import type { Metadata } from "next";
import { isManager, requireSession } from "@/lib/auth/session";
import { readTheme } from "@/lib/theme/theme";
import { Alert, Card, PageBody, PageHeader } from "@/components/ui/surfaces";
import { AppearanceForm } from "./appearance-form";

export const metadata: Metadata = { title: "Appearance" };

export default async function AppearancePage() {
  const me = await requireSession();
  const theme = await readTheme();
  const admin = isManager(me);

  return (
    <>
      <PageHeader
        eyebrow="Settings / Appearance"
        title="Appearance"
        meta="The accent colour and light/dark mode for this console."
      />

      <PageBody>
        {!admin && (
          <Alert tone="info">
            Only managers and owners can change the appearance. These are the current
            settings.
          </Alert>
        )}

        {/*
          The mockup says this "updates the accent colour for every user's
          console". The API cannot store that yet — business settings hold the
          name, address, phone, email, logo and invoice footer, and nothing about
          theming — so this is saved per browser instead. Said plainly rather
          than implied, because the difference matters to whoever changes it.
        */}
        <Alert tone="warning">
          This preference is stored in this browser only. It does not change what other
          people see — the API has no field for a shared theme yet.
        </Alert>

        {/*
          Keyed on the saved theme so a successful save remounts the controls.
          Without this the form keeps its own state across the action's
          `refresh()`, and a controlled radio group leaves the native `checked`
          on the previously selected option — the palette changes but the radio
          still points at the old mode.
        */}
        <AppearanceForm
          key={`${theme.accent}:${theme.mode}`}
          theme={theme}
          disabled={!admin}
        />

        <Card title="Where the accent is used">
          <ul className="flex flex-col gap-2 text-[12.5px] leading-relaxed text-muted">
            <li>— Primary buttons, the active navigation item, and focus rings</li>
            <li>— KPI highlights and status indicators</li>
            <li>— Record identifiers in tables, and the sign-in screen key art</li>
          </ul>
        </Card>
      </PageBody>
    </>
  );
}
