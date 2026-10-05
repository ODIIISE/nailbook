import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Providers } from "./providers";
// Astryx CSS must load before globals.css: reset.css declares the canonical
// @layer order (reset, astryx-base, astryx-theme), and astryx.css sets :root
// custom properties (--color-accent, --color-success, …) that globals.css
// re-declares unlayered — unlayered always wins, so the app theme keeps
// precedence everywhere regardless of chunk load order. Used by the
// /astryx-preview route; remove these imports if that route goes away.
import "./astryx-layers.css";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
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
  // <meta name="theme-color"> cannot read CSS variables — #1b1b1b is the
  // documented mirror of the Astryx neutral body, the app's single (dark-only)
  // palette. Update together with globals.css and public/manifest.json.
  themeColor: "#1b1b1b",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `dark` is static on <html>: the app ships a single dark palette, so there
  // is no runtime theme resolution to flash — globals.css `.dark` block and
  // `color-scheme: dark` apply from the first byte of CSS.
  return (
    <html lang="fa" dir="rtl" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        {/* Preload the Persian webfont faces (raw @font-face in globals.css) so
            text never flashes in a fallback font. Estedad FD is the primary
            variable face. */}
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/aminabedi68/Estedad@v7.3/fonts/webfonts/variable/Estedad-FD%5BKSHD%2Cwght%5D.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Homepage hero: the first-frame poster preloads with the HTML so the
            backdrop paints instantly; the clip itself streams via the video
            element (preload="auto") and dissolves in on first frame. (A
            preload as="video" would be ideal but Chrome rejects the
            destination — the element fetch is the loader.) */}
        <link rel="preload" href="/media/forehand-hero-poster.jpg" as="image" type="image/jpeg" />
        {/* Lux homepage faces (Great Vibes script, Playfair Display, Poppins). */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link href="https://cdn.jsdelivr.net/fontsource/css/great-vibes@latest/index.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/fontsource/css/playfair-display@latest/500.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/fontsource/css/playfair-display@latest/600.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/300.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/400.css" rel="stylesheet" />
        <link href="https://cdn.jsdelivr.net/fontsource/css/poppins@latest/500.css" rel="stylesheet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Forehand Nail" />
        <meta name="application-name" content="Forehand Nail" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
