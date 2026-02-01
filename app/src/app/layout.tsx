import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const font = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

/*
 * Social Preview Image:
 * Place a file named `opengraph-image.png` (1200x630px) in the `app/` directory
 * for the social preview to work automatically on Telegram/Twitter/etc.
 * Next.js will automatically detect and use it for OpenGraph meta tags.
 */

export const metadata: Metadata = {
  title: "// Svalinn Vault",
  description: "The shield against the burn.",
  keywords: ["Solana", "DeFi", "Token Migration", "Vault", "Crypto", "Web3", "Svalinn"],
  authors: [{ name: "Svalinn Vault" }],
  openGraph: {
    title: "Svalinn Vault",
    description: "The shield against the burn.",
    url: "https://svalinn.app",
    siteName: "Svalinn Vault",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Svalinn Vault",
    description: "The shield against the burn.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${font.variable}`}>
      <body className="min-h-screen bg-slate-950 font-mono antialiased">
        <Providers>
          {/* Scanner Beam - Cyan sweep effect */}
          <div className="scanner-beam" />
          {/* Cryo Grid Background */}
          <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(8,51,68,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(8,51,68,0.4)_1px,transparent_1px)] bg-[size:50px_50px]" />
          {/* Content */}
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
