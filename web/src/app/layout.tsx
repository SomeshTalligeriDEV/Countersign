import type { Metadata } from "next";

import "./countersign.css";




export const metadata: Metadata = {
  title: "Countersign: bounded payments for AI agents",
  description:
    "Contract-enforced agent spending with transaction-bound human approval. Testnet development preview.",
};

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
