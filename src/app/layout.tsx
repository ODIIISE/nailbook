import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Providers } from "./providers";
import { DeviceThemeSync } from "@/components/layout/device-theme-sync";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://forehand.vercel.app"),
  title: "Forehand Nail Studio | رزرو آنلاین",
  description: "Forehand Nail Studio — رزرو آنلاین نوبت ناخن",
  openGraph: {
    title: "Forehand Nail Studio | رزرو آنلاین",
    description: "رزرو آنلاین نوبت ناخن — بدون تماس تلفنی، زمان‌های آزاد همین‌جا",
    type: "website",
    locale: "fa_IR",
    siteName: "Forehand Nail Studio",
    images: [{ url: "/hero-default.jpg", width: 1280, height: 853, alt: "Forehand Nail Studio" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forehand Nail Studio | رزرو آنلاین",
    description: "رزرو آنلاین نوبت ناخن — بدون تماس تلفنی، زمان‌های آزاد همین‌جا",
    images: ["/hero-default.jpg"],
  },
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
  // suppressHydrationWarning: the inline theme script below toggles the
  // `dark` class on <html> before React hydrates (it must, to avoid a theme
  // flash). That intentional pre-hydration mutation makes React's
  // class-attribute diff a false positive, so it is suppressed here — the
  // official Next.js pattern for theme scripts.
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
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
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
