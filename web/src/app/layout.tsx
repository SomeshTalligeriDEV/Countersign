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

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0b" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
