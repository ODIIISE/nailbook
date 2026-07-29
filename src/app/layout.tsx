import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Providers } from "./providers";
import { SplashScreen } from "@/components/layout/splash-screen";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forehand Nail Studio | رزرو آنلاین",
  description: "Forehand Nail Studio — رزرو آنلاین نوبت ناخن",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  // Two theme-colors: Next 15+ maps `themeColor` as the light-mode default
  // and accepts a media array so Safari/Chrome pick the right one without
  // needing a hand-rolled <meta> in <head>.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Native PWA shell: hides Safari/Chrome URL bar and lets the status
            bar blend into the header so the app feels installed, not browsed. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Forehand Nail" />
        <meta name="application-name" content="Forehand Nail" />
        <meta name="format-detection" content="telephone=no" />
        {/* Pre-hydration theme bootstrap: prevents flash of wrong theme when user has persisted dark mode. Must run before React mounts. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('nailbook-theme');var mq=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(t==null&&mq);if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        <Providers>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
