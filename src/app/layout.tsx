import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "@/components/providers/DemoProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ronda Warga · RT 05 / RW 03 Sukamaju",
  description:
    "Sistem Informasi Manajemen Ronda Malam Berbasis Mobile untuk lingkungan RT.",
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
