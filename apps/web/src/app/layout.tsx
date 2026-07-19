import type { ReactNode } from "react";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import "@ui-tokens/tokens.css";
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

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
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
