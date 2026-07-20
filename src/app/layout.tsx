import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/modules/i18n/context";
import { ThemeProvider } from "@/modules/theme/context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HelixaraAI — Sovereign OSINT & Stealth Command",
  description:
    "HelixaraAI — modular production console: ethical OSINT, stealth crawl, Hermes/OpenClaw agents, live SSA/ADS-B, quantum hybrids, digital twins, 20-language i18n.",
};

/** Avoid flash of wrong theme before hydration */
const themeBootScript = `
(function(){
  try {
    var p = localStorage.getItem('helixara.theme') || 'system';
    var r = p === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : p;
    document.documentElement.dataset.theme = r;
    document.documentElement.dataset.themePref = p;
    document.documentElement.style.colorScheme = r;
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
