import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";
import EnregistrerSW from "@/components/EnregistrerSW";

export const metadata: Metadata = {
  title: "SC Lions d'Eugies",
  description: "LEAW – Lions Eugies Around the World · espace membres du club de Subbuteo",
  applicationName: "Lions Eugies",
  icons: { icon: [{ url: "/favicon-64.png", sizes: "64x64" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Lions Eugies", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b0a0a", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <EnregistrerSW />
      </body>
    </html>
  );
}
