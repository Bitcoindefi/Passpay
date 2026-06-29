import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SplashScreen from "@/components/splash-screen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Passpay — Cobrá en pesos, ahorrá en dólares",
  description:
    "Passpay conecta Transferencias 3.0 (Argentina) con Stellar: cobrá con un QR que escanea cualquier billetera o banco, y guardá el valor en dólares al instante.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
