import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { siteConfig } from "../config";

// Fallback de fuentes locales para permitir compilación sin internet
const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BotMaRe",
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
};

import { BotDataProvider } from "./BotDataProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { PwaRegister } from "@/components/PwaRegister";

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
        <PwaRegister />
        <BotDataProvider>
          <Suspense fallback={<div className="p-8 text-center text-cyan-400">Cargando interfaz del Bot...</div>}>
            <NavigationProgressBar />
            <DashboardLayout>
                {children}
            </DashboardLayout>
          </Suspense>
        </BotDataProvider>
      </body>
    </html>
  );
}
