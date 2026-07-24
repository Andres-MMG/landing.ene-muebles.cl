import type { ReactNode } from "react";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getSiteSettings } from "@/lib/strapi";
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
    default: "Ene Muebles · Mobiliario escolar y de oficina",
    template: "%s · Ene Muebles",
  },
  description:
    "Mobiliario escolar y de oficina certificado para instituciones en Chile. Catálogo, despacho a todo el país y cotización en 24 h.",
  openGraph: {
    type: "website",
    locale: "es_CL",
    siteName: "Ene Muebles",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  // site-settings is best-effort: if the CMS is unreachable the layout
  // still renders, just with fallback contact data.
  let settings = null;
  try {
    settings = await getSiteSettings();
  } catch (err) {
    console.warn("[layout] site-setting fetch failed:", err);
  }

  const fallbackName = "Ene Muebles";

  return (
    <html lang="es-CL">
      <body
        className={`${sourceSerif.variable} ${hankenGrotesk.variable} font-body antialiased`}
      >
        <Header
          siteName={settings?.siteName ?? fallbackName}
          whatsappNumber={settings?.whatsappNumber}
          contactPhone={settings?.contactPhone}
          contactEmail={settings?.contactEmail}
        />
        <div className="bg-paper text-ink">{children}</div>
        {settings ? <Footer settings={settings} /> : null}
      </body>
    </html>
  );
}
