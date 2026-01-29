"use client";

import { ReactNode, useMemo, useState, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { RPC_ENDPOINT } from "../utils/program";

import "@solana/wallet-adapter-react-ui/styles.css";

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const wallets = useMemo(
    () => (typeof window === "undefined" ? [] : [new PhantomWalletAdapter(), new SolflareWalletAdapter()]),
    []
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cyber-darker">
        <div className="cyber-spinner h-8 w-8" />
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
