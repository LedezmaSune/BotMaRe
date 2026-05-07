import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { siteConfig } from "../config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
};

import { BotDataProvider } from "./BotDataProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col overflow-x-hidden" suppressHydrationWarning>
        <Suspense fallback={null}>
            <NavigationProgressBar />
        </Suspense>
        <BotDataProvider>
            <DashboardLayout>
                {children}
            </DashboardLayout>
        </BotDataProvider>
      </body>
    </html>
  );
}
