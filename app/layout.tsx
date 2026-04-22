import type { Metadata } from "next";

import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "control-dashboard",
  description:
    "Read-only dashboard over parkingapp-f4edc Firestore, answering the 10 active business questions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning: browser extensions (Grammarly, LanguageTool,
          Dark Reader, etc.) inject attributes on <body> before React hydrates.
          They are benign but otherwise produce a hydration-mismatch warning. */}
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider delayDuration={120}>
            <AppShell>{children}</AppShell>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
