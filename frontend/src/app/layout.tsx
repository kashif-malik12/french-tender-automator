import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marchés Publics AI — Veille BOAMP & Mémoires Techniques",
  description:
    "Plateforme auto-hébergée d'automatisation des marchés publics français (Veille BOAMP, Analyse DCE, Rédaction assistée de mémoires techniques).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
