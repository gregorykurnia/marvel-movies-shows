import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import {
  Bricolage_Grotesque,
  JetBrains_Mono,
  Plus_Jakarta_Sans,
} from "next/font/google";

import "./globals.css";

import { ThemeBoot } from "@/components/layout/theme-boot";

// Fonts are self-hosted at build time (no layout shift). Each one feeds a token in styles/tokens.css.
const display = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body-face",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
});

// Personal app: keep it out of search engines on every page (IMPLEMENTATION_PLAN §2).
export const metadata: Metadata = {
  title: { default: "Marvel Directory", template: "%s · Marvel Directory" },
  description: "A personal directory of Marvel movies and shows.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <ThemeBoot />
        {children}
      </body>
    </html>
  );
}
