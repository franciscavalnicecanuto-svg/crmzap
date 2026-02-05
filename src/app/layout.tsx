import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast-notification";
import { SettingsProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CRMzap - CRM para quem vende no WhatsApp",
  description: "Organize seus leads, nunca esqueça um follow-up. CRM simples para vendedores que usam WhatsApp.",
  keywords: ["CRM", "WhatsApp", "vendas", "leads", "follow-up", "MEI", "pequenos negócios"],
  openGraph: {
    title: "CRMzap - CRM para quem vende no WhatsApp",
    description: "Organize seus leads, nunca esqueça um follow-up.",
    type: "website",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <SettingsProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
