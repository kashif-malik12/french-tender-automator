import type { Metadata, Viewport } from "next";
import { PwaManager } from "@/components/PwaManager";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "TRADISTER AO — Veille Marchés Publics FR & UE",
  description:
    "Plateforme mobile & web de veille des marchés publics France (BOAMP) & UE (TED), scoring d'adéquation et mémoires techniques pour TRADISTER SASU.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TRADISTER AO",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <PwaManager />
        {children}
      </body>
    </html>
  );
}
