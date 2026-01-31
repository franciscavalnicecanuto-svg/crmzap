import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "WhatsZap - CRM para quem vende no WhatsApp",
  description: "Organize seus leads, nunca esqueça um follow-up. CRM simples para vendedores que usam WhatsApp.",
  keywords: ["CRM", "WhatsApp", "vendas", "leads", "follow-up", "MEI", "pequenos negócios"],
  openGraph: {
    title: "WhatsZap - CRM para quem vende no WhatsApp",
    description: "Organize seus leads, nunca esqueça um follow-up.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
