import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AstraVoice (Merchant & Sales Teammate) — AstraShield Engine 1",
  description: "Voice-to-Paytm Dynamic UPI QR, Kirana Brand Catalog Manager, Sarvam AI Speech & 60 FPS AG Grid Ledger.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f6f1e7" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
