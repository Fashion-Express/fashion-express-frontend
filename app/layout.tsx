import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { readTheme } from "@/lib/theme/theme";
import { themeAttribute } from "@/lib/theme/tokens";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Every amount, quantity, date and record ID in this console is monospaced, so
 * figures line up down a column. That is a legibility requirement, not styling.
 */
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Fashion Express",
    template: "%s · Fashion Express",
  },
  description:
    "Customers, inventory, suppliers and sales — run from one place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0d0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Read on the server so the first paint already carries the right palette —
  // no flash of the default theme before hydration.
  const theme = await readTheme();

  return (
    <html
      lang="en"
      data-theme={themeAttribute(theme.mode)}
      style={{ "--accent": theme.accent } as React.CSSProperties}
      className={`${plusJakarta.variable} ${ibmPlexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
