import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Providers } from "./providers";
import { SplashScreen } from "@/components/layout/splash-screen";
import { DeviceThemeSync } from "@/components/layout/device-theme-sync";
import { PageTransition } from "@/components/layout/page-transition";
import "./globals.css";

// Next.js-managed serif for the boutique brand treatments. Italic loaded for
// the "Forehand Nail" wordmark and the sheet/section titles.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--qhp-serif-font",
});

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
    <html lang="fa" dir="rtl" className={`${cormorant.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Forehand Nail" />
        <meta name="application-name" content="Forehand Nail" />
        <meta name="format-detection" content="telephone=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=null;try{t=localStorage.getItem("nailbook-theme");}catch(e){}var dark;if(t==="dark"){dark=true}else if(t==="light"){dark=false}else{dark=window.matchMedia("(prefers-color-scheme: dark)").matches}document.documentElement.classList.toggle("dark",dark);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <DeviceThemeSync />
        <Providers>
          <SplashScreen />
          <ErrorBoundary>
            <PageTransition>{children}</PageTransition>
          </ErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
