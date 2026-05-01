import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://panel.mrcreditmind.com"),
  title: "Nancy Monitor | Panel interno de conversaciones de Mr.CREDITMIND",
  description:
    "Nancy Monitor es el panel interno de Mr.CREDITMIND para monitorear conversaciones, actividad comercial y seguimiento de leads en tiempo real.",
  applicationName: "Nancy Monitor",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "Nancy Monitor | Panel interno de conversaciones de Mr.CREDITMIND",
    description:
      "Nancy Monitor es el panel interno de Mr.CREDITMIND para monitorear conversaciones, actividad comercial y seguimiento de leads en tiempo real.",
    siteName: "Nancy Monitor",
    locale: "es_PR",
    type: "website",
    images: [
      {
        url: "/brand/nancy-og.jpg",
        width: 1200,
        height: 630,
        alt: "Nancy Monitor | Mr.CREDITMIND",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nancy Monitor | Panel interno de conversaciones de Mr.CREDITMIND",
    description:
      "Nancy Monitor es el panel interno de Mr.CREDITMIND para monitorear conversaciones, actividad comercial y seguimiento de leads en tiempo real.",
    images: ["/brand/nancy-og.jpg"],
  },
};

const themeScript = `
(function () {
  try {
    var storedTheme = localStorage.getItem("nancy-theme");
    var theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (error) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
        <Script id="nancy-theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
