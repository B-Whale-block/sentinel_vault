"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  createProvider,
  createProgram,
  initialize,
  deposit,
  withdraw,
  fetchUserVault,
  getTokenBalance,
  getVaultTokenAccount,
  formatAmount,
  parseAmount,
  TOKEN_MINT,
} from "../utils/program";

// 1. FIX: Define the status type separately so we can use it easily
type StatusType = "success" | "error" | "info";
type TxStatus = { type: StatusType; message: string } | null;

export function useVault() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const [vaultBalance, setVaultBalance] = useState("0");
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TxStatus>(null);

  // 2. FIX: Use the specific "StatusType" here
  const showStatus = useCallback((type: StatusType, message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 5000);
  }, []);

  const getProgram = useCallback(() => {
    if (!publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    const provider = createProvider(connection, {
      publicKey,
      signTransaction: wallet.signTransaction,
      signAllTransactions: wallet.signAllTransactions,
    });
    return createProgram(provider);
  }, [connection, publicKey, wallet]);

  const refresh = useCallback(async () => {
    const program = getProgram();
    if (!program || !publicKey) return;

    try {
      const vault = await fetchUserVault(program, publicKey);
      setVaultBalance(vault ? formatAmount(vault.oldTokenDeposited) : "0");

      const balance = await getTokenBalance(connection, publicKey, TOKEN_MINT);
      setWalletBalance(formatAmount(balance));
    } catch (e) {
      console.error("Failed to fetch balances:", e);
    }
  }, [connection, publicKey, getProgram]);

  useEffect(() => {
    if (connected) {
      refresh();
    } else {
      setVaultBalance("0");
      setWalletBalance("0");
    }
  }, [connected, refresh]);

  const execTx = async (
    action: () => Promise<string>,
    successMsg: string,
    infoMsg: string
  ) => {
    setLoading(true);
    showStatus("info", infoMsg);

    try {
      const tx = await action();
      showStatus("success", `${successMsg} TX: ${tx.slice(0, 8)}...`);
      await refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      showStatus("error", `Failed: ${msg.slice(0, 50)}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async (mintAddress: string) => {
    const program = getProgram();
    if (!program || !publicKey) return false;

    let mint: PublicKey;
    try {
      mint = new PublicKey(mintAddress);
    } catch {
      showStatus("error", "Invalid mint address");
      return false;
    }

    return execTx(
      () => program.methods
        .initialize(mint, SystemProgram.programId) 
        .accounts({
          authority: publicKey,
          sentinelConfig: PublicKey.findProgramAddressSync(
            [Buffer.from("sentinel_config")],
            program.programId
          )[0],
          systemProgram: SystemProgram.programId,
        })
        .rpc(),
      "Initialized!",
      "Initializing vault..."
    );
  };

  const handleDeposit = async (amount: string) => {
    const program = getProgram();
    if (!program || !publicKey) return false;

    const value = parseFloat(amount);
    if (!amount || value <= 0) {
      showStatus("error", "Enter a valid amount");
      return false;
    }

    // Pass the vault token account (PDA) if needed, or let program resolve it
    const vaultTokenAccount = await getVaultTokenAccount(TOKEN_MINT);

    return execTx(
      () => deposit(program, publicKey, parseAmount(amount), TOKEN_MINT, vaultTokenAccount),
      "Deposited!",
      "Processing deposit..."
    );
  };

  const handleWithdraw = async (amount: string) => {
    const program = getProgram();
    if (!program || !publicKey) return false;

    const value = parseFloat(amount);
    if (!amount || value <= 0) {
      showStatus("error", "Enter a valid amount");
      return false;
    }

    const vaultTokenAccount = await getVaultTokenAccount(TOKEN_MINT);

    return execTx(
      () => withdraw(program, publicKey, parseAmount(amount), TOKEN_MINT, vaultTokenAccount),
      "Withdrawn!",
      "Processing withdrawal..."
    );
  };

  return {
    publicKey,
    connected,
    vaultBalance,
    walletBalance,
    loading,
    status,
    handleInitialize,
    handleDeposit,
    handleWithdraw,
  };
}