import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import "./globals.css";

// 👇 add this import
import { InventoryProvider } from "@/lib/inventory-store";

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Rocker Solar Sales Dashboard",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} antialiased`}
    >
      <body className="font-sans">
        {/* Client provider supplies Firestore-backed inventory state to the whole app */}
        <InventoryProvider>
          <Suspense fallback={null}>{children}</Suspense>
        </InventoryProvider>
        <Analytics />
      </body>
    </html>
  );
}
