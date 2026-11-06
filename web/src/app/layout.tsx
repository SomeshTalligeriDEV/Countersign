import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";

import "./countersign.css";

const DESCRIPTION =
  "Countersign gives AI agents USDT spending mandates enforced by a smart contract on Whitechain, with World ID human approval for larger payments and an ENS agent identity. Testnet preview.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Countersign: spending mandates for AI agents", template: "%s · Countersign" },
  description: DESCRIPTION,
  applicationName: "Countersign",
  keywords: ["AI agent payments", "spending mandate", "USDT", "Whitechain", "World ID", "ENS", "ENSv2", "agent identity", "stablecoin payments", "human approval"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { type: "website", url: "/", siteName: "Countersign", title: "Countersign: spending mandates for AI agents", description: DESCRIPTION, locale: "en_US" },
  twitter: { card: "summary_large_image", title: "Countersign: spending mandates for AI agents", description: DESCRIPTION },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Inter matches Pactra; Doto stands in for Pactra's self-hosted pixel display face. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Doto:wght@700&family=Inter:wght@400;500;600&display=swap" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
