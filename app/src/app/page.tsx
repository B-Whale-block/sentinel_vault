"use client";

import { useState } from "react";
import WalletButton from "../components/WalletButton";
import { Toast } from "../components/Toast";
import { LockIcon, DownArrowIcon, UpArrowIcon, SettingsIcon, ChevronIcon } from "../components/icons";
import { useVault } from "../hooks/useVault";
import { PROGRAM_ID, TOKEN_MINT } from "../utils/program";

export default function Dashboard() {
  const {
    publicKey,
    connected,
    vaultBalance,
    walletBalance,
    loading,
    status,
    handleInitialize,
    handleDeposit,
    handleWithdraw,
  } = useVault();

  const [depositInput, setDepositInput] = useState("");
  const [withdrawInput, setWithdrawInput] = useState("");
  const [mintInput, setMintInput] = useState(TOKEN_MINT.toBase58());
  const [showAdmin, setShowAdmin] = useState(false);

  const onDeposit = async () => {
    if (await handleDeposit(depositInput)) setDepositInput("");
  };

  const onWithdraw = async () => {
    if (await handleWithdraw(withdrawInput)) setWithdrawInput("");
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <header className="mx-auto mb-8 flex max-w-6xl flex-col gap-4 sm:mb-12 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center sm:h-12 sm:w-12">
            <div className="absolute inset-0 animate-pulse rounded-lg bg-cyber-green/20" />
            <LockIcon className="relative z-10 h-6 w-6 text-cyber-green sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <h1 className="text-glow truncate text-lg font-bold tracking-wider text-cyber-green sm:text-2xl">SENTINEL VAULT</h1>
            <p className="text-xs text-cyber-green/60 sm:text-sm">DEVNET // v0.1.0</p>
          </div>
        </div>
        <div className="flex-shrink-0 self-end sm:self-auto">
          <WalletButton />
        </div>
      </header>

      {status && <Toast type={status.type} message={status.message} />}

      <main className="mx-auto max-w-6xl space-y-8">
        {!connected && (
          <div className="cyber-card cyber-card-purple text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="status-dot status-dot-red" />
              <p className="text-cyber-purple">WALLET_NOT_CONNECTED // PLEASE AUTHENTICATE</p>
            </div>
          </div>
        )}

        {connected && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <BalanceCard
                label="Vault Balance"
                value={vaultBalance}
                status="ACTIVE"
                variant="green"
                sublabel="DEPOSITED_IN_SENTINEL_VAULT"
              />
              <BalanceCard
                label="Wallet Balance"
                value={walletBalance}
                status="SYNCED"
                variant="purple"
                sublabel="AVAILABLE_FOR_DEPOSIT"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <ActionCard
                title="Deposit Tokens"
                icon={<DownArrowIcon className="h-6 w-6" />}
                variant="green"
                value={depositInput}
                onChange={setDepositInput}
                onSubmit={onDeposit}
                loading={loading}
                buttonText="EXECUTE_DEPOSIT"
                maxBalance={walletBalance}
              />
              <ActionCard
                title="Withdraw Tokens"
                icon={<UpArrowIcon className="h-6 w-6" />}
                variant="red"
                value={withdrawInput}
                onChange={setWithdrawInput}
                onSubmit={onWithdraw}
                loading={loading}
                buttonText="EXECUTE_WITHDRAW"
                maxBalance={vaultBalance}
              />
            </div>

            <div className="cyber-card border-cyber-yellow/30">
              <button onClick={() => setShowAdmin(!showAdmin)} className="flex w-full items-center justify-between">
                <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-cyber-yellow">
                  <SettingsIcon className="h-5 w-5" />
                  Admin Controls
                </h2>
                <ChevronIcon className={`h-5 w-5 text-cyber-yellow transition-transform ${showAdmin ? "rotate-180" : ""}`} />
              </button>

              {showAdmin && (
                <div className="mt-6 space-y-4 border-t border-cyber-yellow/20 pt-6">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wider text-cyber-yellow/60">
                      Token Mint Address
                    </label>
                    <input
                      type="text"
                      value={mintInput}
                      onChange={(e) => setMintInput(e.target.value)}
                      placeholder="Mint public key..."
                      className="cyber-input border-cyber-yellow/30 text-cyber-yellow placeholder-cyber-yellow/40 focus:border-cyber-yellow"
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={() => handleInitialize(mintInput)}
                    disabled={loading}
                    className="cyber-btn w-full border-cyber-yellow/50 bg-cyber-yellow/10 text-cyber-yellow hover:border-cyber-yellow hover:bg-cyber-yellow/20"
                  >
                    {loading ? <Spinner color="yellow" text="Initializing..." /> : "INITIALIZE_VAULT"}
                  </button>
                  <p className="text-center text-xs text-cyber-yellow/40">WARNING: ADMIN_ONLY // ONE_TIME_INITIALIZATION</p>
                </div>
              )}
            </div>

            <div className="cyber-card opacity-60">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-cyber-green/40">PROGRAM_ID: </span>
                  <span className="text-cyber-green">{PROGRAM_ID.toBase58().slice(0, 16)}...</span>
                </div>
                <div>
                  <span className="text-cyber-green/40">NETWORK: </span>
                  <span className="text-cyber-green">DEVNET</span>
                </div>
                <div>
                  <span className="text-cyber-green/40">WALLET: </span>
                  <span className="text-cyber-green">
                    {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto mt-16 max-w-6xl text-center">
        <p className="text-xs text-cyber-green/30">SENTINEL_VAULT // SECURE_TOKEN_PROTOCOL // 2026</p>
      </footer>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  status,
  variant,
  sublabel,
}: {
  label: string;
  value: string;
  status: string;
  variant: "green" | "purple";
  sublabel: string;
}) {
  const isGreen = variant === "green";
  return (
    <div className={`cyber-card ${isGreen ? "" : "cyber-card-purple"}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`text-sm uppercase tracking-wider ${isGreen ? "text-cyber-green/60" : "text-cyber-purple/60"}`}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`status-dot ${isGreen ? "status-dot-green" : "bg-cyber-purple"}`}
            style={isGreen ? undefined : { boxShadow: "0 0 10px var(--cyber-purple)" }}
          />
          <span className={`text-xs ${isGreen ? "text-cyber-green/60" : "text-cyber-purple/60"}`}>{status}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${isGreen ? "text-glow text-cyber-green" : "text-glow-purple text-cyber-purple"}`}>
          {value}
        </span>
        <span className={isGreen ? "text-cyber-green/60" : "text-cyber-purple/60"}>TOKENS</span>
      </div>
      <p className={`mt-2 text-xs ${isGreen ? "text-cyber-green/40" : "text-cyber-purple/40"}`}>{sublabel}</p>
    </div>
  );
}

function ActionCard({
  title,
  icon,
  variant,
  value,
  onChange,
  onSubmit,
  loading,
  buttonText,
  maxBalance,
}: {
  title: string;
  icon: React.ReactNode;
  variant: "green" | "red";
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  buttonText: string;
  maxBalance: string;
}) {
  const isRed = variant === "red";

  // Parse the balance string (handles comma formatting)
  const parseBalance = (bal: string) => {
    const num = parseFloat(bal.replace(/,/g, ""));
    return isNaN(num) ? 0 : num;
  };

  const setPercentage = (percent: number) => {
    const max = parseBalance(maxBalance);
    const amount = (max * percent) / 100;
    if (amount > 0) {
      onChange(amount.toFixed(4).replace(/\.?0+$/, ""));
    }
  };

  const percentButtons = [
    { label: "25%", value: 25 },
    { label: "50%", value: 50 },
    { label: "75%", value: 75 },
    { label: "MAX", value: 100 },
  ];

  return (
    <div className={`cyber-card ${isRed ? "cyber-card-red" : ""}`}>
      <h2 className={`mb-6 flex items-center gap-3 text-xl font-bold uppercase tracking-wider ${isRed ? "text-cyber-red" : "text-cyber-green"}`}>
        {icon}
        {title}
      </h2>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={`text-xs uppercase tracking-wider ${isRed ? "text-cyber-red/60" : "text-cyber-green/60"}`}>
              Amount
            </label>
            <span className={`text-xs ${isRed ? "text-cyber-red/40" : "text-cyber-green/40"}`}>
              Available: {maxBalance}
            </span>
          </div>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            className={`cyber-input ${isRed ? "cyber-input-red" : ""}`}
            disabled={loading}
          />
        </div>
        <div className="flex gap-2">
          {percentButtons.map((btn) => (
            <button
              key={btn.label}
              onClick={() => setPercentage(btn.value)}
              disabled={loading || parseBalance(maxBalance) === 0}
              className={`flex-1 rounded border px-2 py-1.5 text-xs font-semibold uppercase transition-all ${
                isRed
                  ? "border-cyber-red/30 text-cyber-red/70 hover:border-cyber-red hover:bg-cyber-red/10 disabled:opacity-30"
                  : "border-cyber-green/30 text-cyber-green/70 hover:border-cyber-green hover:bg-cyber-green/10 disabled:opacity-30"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <button onClick={onSubmit} disabled={loading || !value} className={`cyber-btn w-full ${isRed ? "cyber-btn-red" : ""}`}>
          {loading ? <Spinner color={variant} text="Processing..." /> : buttonText}
        </button>
      </div>
    </div>
  );
}

function Spinner({ color, text }: { color: "green" | "red" | "yellow"; text: string }) {
  const borderClass = {
    green: "",
    red: "border-cyber-red/30 border-t-cyber-red",
    yellow: "border-cyber-yellow/30 border-t-cyber-yellow",
  }[color];

  return (
    <span className="flex items-center justify-center gap-2">
      <div className={`cyber-spinner ${borderClass}`} />
      {text}
    </span>
  );
}
