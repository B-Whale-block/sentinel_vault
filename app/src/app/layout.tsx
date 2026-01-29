import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const font = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Sentinel Vault | Dashboard",
  description: "Secure token vault protocol on Solana Devnet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${font.variable}`}>
      <body className="bg-cyber-darker min-h-screen font-mono antialiased">
        <Providers>
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden opacity-[0.03]">
            <div className="animate-scan absolute inset-0 bg-gradient-to-b from-transparent via-cyber-green to-transparent" />
          </div>
          <div className="fixed inset-0 bg-[linear-gradient(rgba(0,255,65,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,65,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="relative z-10">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
