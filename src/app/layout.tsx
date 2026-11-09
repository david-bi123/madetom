import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Madetom — Your trade, under control",
    template: "%s · Madetom",
  },
  description:
    "Madetom is the point of sale and inventory system for Ghanaian shops and distributors. Sell faster, know your stock, and see your business clearly.",
  applicationName: "Madetom",
  authors: [{ name: "SamTech Labs" }],
  creator: "SamTech Labs",
  openGraph: {
    title: "Madetom — Your trade, under control",
    description:
      "Point of sale, inventory and business reporting for growing Ghanaian businesses.",
    type: "website",
    locale: "en_GH",
    siteName: "Madetom",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f5c47",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

/**
 * Madetom is an authenticated, request-time SaaS: every workspace screen reads
 * the session cookie and the tenant's live data before it can render, so no
 * route in the tree can be prerendered into a static shell. Opting the root
 * layout out of instant-navigation validation keeps the dev overlay (and the
 * console) free of blocking-route warnings for every page below it.
 */
export const instant = false;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-GH"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background">
        <TooltipProvider delay={300}>
          {children}
          <Toaster position="top-right" closeButton richColors={false} />
        </TooltipProvider>
      </body>
    </html>
  );
}
