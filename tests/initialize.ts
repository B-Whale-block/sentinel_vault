import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

describe("Initialize Vault (Unified Web3)", () => {
  // CRITICAL: We only use the web3 instance inside Anchor.
  // We do NOT import from "@solana/web3.js" separately.
  const web3 = anchor.web3;

  it("Is initialized!", async () => {
    // 1. Setup Wallet and Provider using the internal web3
    const keypairPath = path.resolve(__dirname, "../sentinel_vault-keypair.json");
    const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
    const walletKeypair = web3.Keypair.fromSecretKey(secretKey);
    const wallet = new anchor.Wallet(walletKeypair);

    const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");
    const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
    anchor.setProvider(provider);

    console.log("🚀 Starting Init...");
    console.log("Admin Wallet:", wallet.publicKey.toBase58());

    // 2. Constants
    const PROGRAM_ID = new web3.PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");

    // 3. Derive PDA
    const [sentinelConfig] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sentinel_config")],
      PROGRAM_ID
    );
    console.log("Config PDA:", sentinelConfig.toBase58());

    // 4. Manual Transaction Construction
    // Discriminator for "initialize" (afaf6d1f0d989bed)
    const discriminator = Buffer.from("afaf6d1f0d989bed", "hex");

    const ix = new web3.TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },      // authority
        { pubkey: sentinelConfig, isSigner: false, isWritable: true },       // sentinelConfig
        { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false } // systemProgram
      ],
      data: discriminator
    });

    const tx = new web3.Transaction().add(ix);

    // 5. Send
    try {
      const signature = await provider.sendAndConfirm(tx, [walletKeypair]);
      console.log("🎉 SUCCESS! Vault Initialized.");
      console.log("Tx:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (error: any) {
      // If it says "already in use", that counts as success
      if (JSON.stringify(error).includes("already in use") || error.toString().includes("0x0")) {
         console.log("✅ Vault was ALREADY initialized (Success!)");
      } else {
         console.error("❌ FAILURE:", error);
         throw error;
      }
    }
  });
});