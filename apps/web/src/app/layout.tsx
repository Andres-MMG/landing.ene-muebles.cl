import type { ReactNode } from "react";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import { siteMetadata } from "@/lib/site-metadata";
import "./globals.css";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-source-serif-4",
  fallback: ["Georgia", "serif"],
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-hanken-grotesk",
  fallback: ["system-ui", "sans-serif"],
});

// B2/U11 — root metadata (Open Graph + Twitter + metadataBase) lives in
// `@/lib/site-metadata` so the contract is unit-testable. The OG image
// is generated at `app/opengraph-image.tsx` (file convention).
export const metadata = siteMetadata;

/**
 * Root layout: minimal shell (html + body + fonts). The marketing pages
 * render the public Header + Footer via app/(marketing)/layout.tsx, and
 * the admin pages render their own chrome via app/admin/(authenticated)/
 * layout.tsx. Both groups intentionally live OUTSIDE this root so they
 * don't double-render the public chrome.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es-CL">
      <body
        className={`${sourceSerif.variable} ${hankenGrotesk.variable} font-body antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
