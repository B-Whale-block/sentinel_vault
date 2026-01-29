"use client";

import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <button className="cyber-btn cyber-btn-purple opacity-50" disabled>
        <span className="flex items-center gap-2">
          <div className="cyber-spinner h-4 w-4 border-cyber-purple/30 border-t-cyber-purple" />
          Loading...
        </span>
      </button>
    ),
  }
);

export default function WalletButton() {
  return <WalletMultiButton />;
}
