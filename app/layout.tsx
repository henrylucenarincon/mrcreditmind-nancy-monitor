import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nancy Monitor | Mr.CREDITMIND",
  description: "Panel interno de monitoreo de conversaciones de Mr.CREDITMIND.",
  applicationName: "Nancy Monitor",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Nancy Monitor | Mr.CREDITMIND",
    description: "Panel interno de monitoreo de conversaciones de Mr.CREDITMIND.",
    siteName: "Nancy Monitor",
    locale: "es_PR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full bg-black text-white flex flex-col">{children}</body>
    </html>
  );
}
