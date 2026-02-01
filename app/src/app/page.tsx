"use client";

import { useState } from "react";
import WalletButton from "../components/WalletButton";
import { Toast } from "../components/Toast";
import { ShieldIcon, DownArrowIcon, UpArrowIcon, SettingsIcon, ChevronIcon } from "../components/icons";
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
          <div className="flex flex-col items-center gap-1">
            <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center sm:h-10 sm:w-10">
              <div className="absolute inset-0 animate-pulse rounded-lg bg-cyan-400/20" />
              <ShieldIcon className="relative z-10 h-6 w-6 text-cyan-400 sm:h-8 sm:w-8" />
            </div>
            <span className="font-mono text-[8px] text-cyan-500/50">v0.1.0</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-svalinn-gradient truncate text-xl font-black tracking-widest sm:text-3xl">SVALINN</h1>
            <p className="mt-1 text-xs italic text-slate-400 sm:text-sm">"If Svalinn were to fall, the mountains and sea would burn up."</p>
          </div>
        </div>
        <div className="flex-shrink-0 self-end sm:self-auto">
          <WalletButton />
        </div>
      </header>

      {status && <Toast type={status.type} message={status.message} />}

      <main className="mx-auto max-w-6xl space-y-8">
        {!connected && (
          <div className="cryo-card cryo-card-purple text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="status-dot status-dot-rose" />
              <p className="text-purple-400">WALLET_NOT_CONNECTED // PLEASE AUTHENTICATE</p>
            </div>
          </div>
        )}

        {connected && (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <BalanceCard
                label="Vault Balance"
                value={vaultBalance}
                status="SHIELDED"
                variant="cyan"
                sublabel="PROTECTED_BY_SVALINN"
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
                variant="cyan"
                value={depositInput}
                onChange={setDepositInput}
                onSubmit={onDeposit}
                loading={loading}
                buttonText="SHIELD_TOKENS"
                maxBalance={walletBalance}
              />
              <ActionCard
                title="Withdraw Tokens"
                icon={<UpArrowIcon className="h-6 w-6" />}
                variant="burn"
                value={withdrawInput}
                onChange={setWithdrawInput}
                onSubmit={onWithdraw}
                loading={loading}
                buttonText="RELEASE_TOKENS"
                maxBalance={vaultBalance}
              />
            </div>

            <div className="cryo-card cryo-card-amber">
              <button onClick={() => setShowAdmin(!showAdmin)} className="flex w-full items-center justify-between">
                <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-amber-400">
                  <SettingsIcon className="h-5 w-5" />
                  Admin Controls
                </h2>
                <ChevronIcon className={`h-5 w-5 text-amber-400 transition-transform ${showAdmin ? "rotate-180" : ""}`} />
              </button>

              {showAdmin && (
                <div className="mt-6 space-y-4 border-t border-amber-400/20 pt-6">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-wider text-amber-400/60">
                      Token Mint Address
                    </label>
                    <input
                      type="text"
                      value={mintInput}
                      onChange={(e) => setMintInput(e.target.value)}
                      placeholder="Mint public key..."
                      className="cryo-input border-amber-400/30 text-amber-400 placeholder-amber-400/40 focus:border-amber-400"
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={() => handleInitialize(mintInput)}
                    disabled={loading}
                    className="cryo-btn w-full border-amber-400/50 bg-amber-400/10 text-amber-400 hover:border-amber-400 hover:bg-amber-400/20"
                  >
                    {loading ? <Spinner color="amber" text="Activating..." /> : "ACTIVATE_SVALINN"}
                  </button>
                  <p className="text-center text-xs text-amber-400/40">WARNING: ADMIN_ONLY // ONE_TIME_INITIALIZATION</p>
                </div>
              )}
            </div>

            <div className="cryo-card opacity-60">
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-cyan-400/40">PROGRAM_ID: </span>
                  <span className="text-cyan-400">{PROGRAM_ID.toBase58().slice(0, 16)}...</span>
                </div>
                <div>
                  <span className="text-cyan-400/40">NETWORK: </span>
                  <span className="text-cyan-400">DEVNET</span>
                </div>
                <div>
                  <span className="text-cyan-400/40">WALLET: </span>
                  <span className="text-cyan-400">
                    {publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-8)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="mx-auto mt-16 max-w-6xl text-center">
        <p className="text-xs font-mono text-slate-400">SVALINN_VAULT // SECURE_TOKEN_PROTOCOL // 2026</p>
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
  variant: "cyan" | "purple";
  sublabel: string;
}) {
  const isCyan = variant === "cyan";
  return (
    <div className={`cryo-card ${isCyan ? "" : "cryo-card-purple"}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`text-sm uppercase tracking-wider ${isCyan ? "text-cyan-400/60" : "text-purple-400/60"}`}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          <div
            className={`status-dot ${isCyan ? "status-dot-cyan" : "bg-purple-400"}`}
            style={isCyan ? undefined : { boxShadow: "0 0 10px rgb(168, 85, 247)" }}
          />
          <span className={`text-xs ${isCyan ? "text-cyan-400/60" : "text-purple-400/60"}`}>{status}</span>
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${isCyan ? "text-cyan-400 ice-glow" : "text-purple-400 text-glow-purple"}`}>
          {value}
        </span>
        <span className={isCyan ? "text-cyan-400/60" : "text-purple-400/60"}>TOKENS</span>
      </div>
      <p className={`mt-2 text-xs ${isCyan ? "text-cyan-400/40" : "text-purple-400/40"}`}>{sublabel}</p>
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
  variant: "cyan" | "burn";
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  buttonText: string;
  maxBalance: string;
}) {
  const isBurn = variant === "burn";

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
    <div className={`cryo-card ${isBurn ? "cryo-card-burn" : ""}`}>
      <h2 className={`mb-6 flex items-center gap-3 text-xl font-bold uppercase tracking-wider ${isBurn ? "text-rose-400" : "text-cyan-400"}`}>
        {icon}
        {title}
      </h2>
      <div className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className={`text-xs uppercase tracking-wider ${isBurn ? "text-rose-400/60" : "text-cyan-400/60"}`}>
              Amount
            </label>
            <span className={`text-xs ${isBurn ? "text-rose-400/40" : "text-cyan-400/40"}`}>
              Available: {maxBalance}
            </span>
          </div>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            className={`cryo-input ${isBurn ? "cryo-input-burn" : ""}`}
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
                isBurn
                  ? "border-rose-400/30 text-rose-400/70 hover:border-rose-400 hover:bg-rose-400/10 disabled:opacity-30"
                  : "border-cyan-400/30 text-cyan-400/70 hover:border-cyan-400 hover:bg-cyan-400/10 disabled:opacity-30"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <button onClick={onSubmit} disabled={loading || !value} className={`cryo-btn w-full ${isBurn ? "cryo-btn-burn" : ""}`}>
          {loading ? <Spinner color={isBurn ? "burn" : "cyan"} text="Processing..." /> : buttonText}
        </button>
      </div>
    </div>
  );
}

function Spinner({ color, text }: { color: "cyan" | "burn" | "amber"; text: string }) {
  const spinnerClass = {
    cyan: "cryo-spinner",
    burn: "cryo-spinner-burn",
    amber: "cryo-spinner border-amber-400/30 border-t-amber-400",
  }[color];

  return (
    <span className="flex items-center justify-center gap-2">
      <div className={spinnerClass} />
      {text}
    </span>
  );
}
