import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "@/components/providers/DemoProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ronda Warga · RT 05 / RW 03 Sukamaju",
  manifest: "/manifest.webmanifest",
  // Ikon tab browser (favicon) memakai ikon aplikasi, bukan globe bawaan browser.
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ikon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/ikon-192.png",
  },
  appleWebApp: { capable: true, title: "Ronda Warga", statusBarStyle: "default" },
  description:
    "Sistem Informasi Manajemen Ronda Malam Berbasis Mobile untuk lingkungan RT.",
};

export const viewport: Viewport = {
  themeColor: "#1e4d3a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#f6f7f4] text-[#1c2b24]">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
