import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { FluxaChrome } from "@/components/chrome/fluxa-chrome";
import { FluxaRuntimeProvider } from "@/components/providers/fluxa-runtime-provider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Fluxa Live",
  description: "Real-time FX visualization and purchasing power platform.",
  applicationName: "Fluxa Live"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <FluxaRuntimeProvider>
          <FluxaChrome>{children}</FluxaChrome>
        </FluxaRuntimeProvider>
      </body>
    </html>
  );
}
