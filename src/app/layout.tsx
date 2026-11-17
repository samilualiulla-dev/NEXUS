import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { APP_CONFIG } from "@/config/app";
import { AppShell } from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: APP_CONFIG.name,
  description: APP_CONFIG.tagline,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

// Applies the saved theme before the first paint (no flash).
const themeScript = `(function(){try{var t=localStorage.getItem('nexus-theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-dvh overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
