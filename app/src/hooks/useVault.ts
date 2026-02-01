"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import {
  createProvider,
  createProgram,
  deposit,
  withdraw,
  fetchUserVault,
  getTokenBalance,
  getVaultTokenAccount,
  formatAmount,
  parseAmount,
  TOKEN_MINT,
} from "../utils/program";

type TxStatus = { type: "success" | "error" | "info"; message: string } | null;

export function useVault() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey, connected } = wallet;

  const [vaultBalance, setVaultBalance] = useState("0");
  const [walletBalance, setWalletBalance] = useState("0");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TxStatus>(null);

  const showStatus = useCallback((type: TxStatus["type"], message: string) => {
    setStatus({ type: type!, message });
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

  // --- MANUAL INITIALIZE BYPASS (IGNORES IDL) ---
  const handleInitialize = async (mintAddress: string) => {
    if (!publicKey || !wallet.signTransaction) return false;

    setLoading(true);
    showStatus("info", "Initializing vault (Manual Mode)...");

    try {
      // 1. Setup Keys
      const mint = new PublicKey(mintAddress);
      const PROGRAM_ID = new PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
      
      const [sentinelConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from("sentinel_config")],
        PROGRAM_ID
      );

      // 2. Construct Data Manually
      // Discriminator for "initialize": [175, 175, 109, 31, 13, 152, 155, 237]
      const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
      
      // Argument: oldTokenMint (32 bytes)
      const data = Buffer.concat([discriminator, mint.toBuffer()]);

      // 3. Build Instruction
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },       // authority
          { pubkey: sentinelConfig, isSigner: false, isWritable: true }, // sentinelConfig
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false } // systemProgram
        ],
        data: data
      });

      // 4. Send Transaction directly via Wallet Adapter
      const tx = new Transaction().add(ix);
      
      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      // Sign and Send
      const signature = await wallet.sendTransaction(tx, connection);
      
      // Confirm
      await connection.confirmTransaction(signature, "confirmed");

      showStatus("success", `Initialized! TX: ${signature.slice(0, 8)}...`);
      await refresh();
      return true;

    } catch (e: any) {
      console.error("Manual Init Error:", e);
      showStatus("error", `Failed: ${e.toString()}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async (amount: string) => {
    const program = getProgram();
    if (!program || !publicKey) return false;

    const value = parseFloat(amount);
    if (!amount || value <= 0) {
      showStatus("error", "Enter a valid amount");
      return false;
    }

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