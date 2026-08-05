import type { ReactNode } from "react";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
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

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:4780"
  ),
  title: {
    default: "ENE-MUEBLES · Mobiliario escolar y de oficina",
    template: "%s · ENE-MUEBLES",
  },
  description:
    "Mobiliario escolar y de oficina certificado para instituciones en Chile. Catálogo, despacho desde la región de Valparaíso hasta Los Lagos y cotización en 24 h.",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "ENE-MUEBLES",
  },
  robots: {
    index: true,
    follow: true,
  },
};

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
