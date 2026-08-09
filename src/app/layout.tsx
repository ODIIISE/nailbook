import type { Metadata, Viewport } from "next";
import { Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Providers } from "./providers";
import { SplashScreen } from "@/components/layout/splash-screen";
import { DeviceThemeSync } from "@/components/layout/device-theme-sync";
import { PageTransition } from "@/components/layout/page-transition";
import "./globals.css";

// Next.js-managed display serif for all English / Latin text — the elegant,
// high-contrast boutique serif for the wordmark and brand treatments. Persian
// text stays on Vazirmatn (loaded via @font-face in globals.css). The variable
// name is kept as --qhp-serif-font so every existing display rule picks it up.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
    <html lang="fa" dir="rtl" className={`${playfair.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {/* Preload the Persian webfont faces (raw @font-face in globals.css) so
            text never flashes in a fallback font. Playfair is preloaded by
            next/font itself. */}
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/fonts/webfonts/Vazirmatn-ExtraBold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
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
