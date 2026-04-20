import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "착착",
  description: "행사 경비 정산 앱",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "착착",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#7b9fe8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
