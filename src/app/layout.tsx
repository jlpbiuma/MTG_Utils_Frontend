import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SectionNav } from "@/components/section-nav";
import { Navbar } from "@/components/navbar";
import { EnrichmentProgressBanner } from "@/components/enrichment-progress-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MTG Utils | Gestor de Mazos y Colección de Cartas Magic",
  description:
    "Aplicación fullstack para gestionar mazos de Magic: The Gathering, inventario de colección física y cálculo automático de completitud de mazos.",
};

// viewport-fit=cover lets env(safe-area-inset-*) keep the bottom navigation and
// sheets clear of the home indicator and notch on phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-foreground/15 selection:text-foreground">
        <Navbar />
        <EnrichmentProgressBanner />
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        <footer className="hidden border-t border-border py-8 mt-auto md:block">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>MTG Utils © 2026 · Datos de Scryfall</p>
            <p className="text-muted-foreground/60">
              Magic: The Gathering es marca registrada de Wizards of the Coast.
            </p>
          </div>
        </footer>
        <SectionNav mobile />
      </body>
    </html>
  );
}
