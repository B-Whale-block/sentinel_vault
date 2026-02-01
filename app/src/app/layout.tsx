import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const font = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Svalinn Protocol",
  description: "The shield against the burn. Secure Token Migration & Storage on Solana.",
  keywords: ["Solana", "DeFi", "Token Migration", "Vault", "Crypto", "Web3", "Svalinn"],
  authors: [{ name: "Svalinn Protocol" }],
  openGraph: {
    title: "Svalinn Protocol",
    description: "The shield against the burn. Secure Token Migration & Storage on Solana.",
    url: "https://sentinel-vault.vercel.app",
    siteName: "Svalinn Protocol",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Svalinn Protocol",
    description: "The shield against the burn. Secure Token Migration & Storage on Solana.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
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
