import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppProvider } from "@/components/app/app-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Unify",
    template: "%s — Unify",
  },
  description:
    "Ứng dụng tổng hợp lịch học từ Outlook, Phoenix và nguồn .ics.",
  applicationName: "Unify",
  appleWebApp: {
    capable: true,
    title: "Unify",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF9F4",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background text-text-primary font-sans antialiased flex flex-col">
        <PwaProvider>
          <AppProvider>{children}</AppProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
