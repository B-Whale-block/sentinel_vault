const web3 = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Clean-Room Init...");

  // 1. Connect to Devnet
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");

  // 2. Load your Keypair (Adjusting path to go up one level)
  // We assume we are in 'temp_init', so keypair is at '../sentinel_vault-keypair.json'
  const keypairPath = path.resolve(__dirname, "../sentinel_vault-keypair.json");
  if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair not found at: ${keypairPath}`);
  }
  
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
  const walletKeypair = web3.Keypair.fromSecretKey(secretKey);
  console.log("Admin Wallet:", walletKeypair.publicKey.toBase58());

  // 3. Define Addresses
  const PROGRAM_ID = new web3.PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
  const SYSTEM_PROGRAM_ID = new web3.PublicKey("11111111111111111111111111111111");

  // 4. Derive Config PDA
  const [sentinelConfig] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("sentinel_config")],
    PROGRAM_ID
  );
  console.log("Config PDA:", sentinelConfig.toBase58());

  // 5. Build the Transaction
  // This Hex Code is the Anchor Discriminator for "global:initialize"
  const discriminator = Buffer.from("afaf6d1f0d989bed", "hex");

  const instruction = new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },      // authority
      { pubkey: sentinelConfig, isSigner: false, isWritable: true },       // sentinelConfig
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },   // systemProgram
    ],
    data: discriminator,
  });

  const transaction = new web3.Transaction().add(instruction);

  // 6. Send It
  try {
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair]
    );
    console.log("🎉 SUCCESS! Vault Initialized.");
    console.log("Tx:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    // If we get an error log, print it
    console.error("❌ Failed:", error);
    if (error.logs) {
        console.log("Logs:", error.logs);
        if (error.logs.some(log => log.includes("already in use"))) {
            console.log("✅ GOOD NEWS: The Vault was ALREADY initialized!");
        }
    }
  }
}

main();
