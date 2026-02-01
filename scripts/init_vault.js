const web3 = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// 1. Helper to calculate the "Discriminator" (Function ID)
// "global:initialize" -> sha256 -> first 8 bytes
function getDiscriminator(instructionName) {
  const hash = crypto.createHash("sha256").update(`global:${instructionName}`).digest();
  return hash.slice(0, 8);
}

async function main() {
  console.log("🚀 Starting Pure JS Init Script...");

  // 2. Setup Connection
  const connection = new web3.Connection("https://api.devnet.solana.com", "confirmed");

  // 3. Load Wallet
  const keypairPath = path.resolve(__dirname, "../sentinel_vault-keypair.json");
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
  const walletKeypair = web3.Keypair.fromSecretKey(secretKey);
  console.log("Wallet:", walletKeypair.publicKey.toBase58());

  // 4. IDs
  const PROGRAM_ID = new web3.PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
  const SYSTEM_PROGRAM_ID = new web3.PublicKey("11111111111111111111111111111111");

  // 5. Derive Config PDA
  const [sentinelConfig] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("sentinel_config")],
    PROGRAM_ID
  );
  console.log("Config PDA:", sentinelConfig.toBase58());

  // 6. Build Instruction
  const discriminator = getDiscriminator("initialize");
  
  const instruction = new web3.TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      // authority
      { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
      // sentinelConfig
      { pubkey: sentinelConfig, isSigner: false, isWritable: true },
      // systemProgram
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: discriminator,
  });

  // 7. Send Transaction
  const transaction = new web3.Transaction().add(instruction);
  
  try {
    const signature = await web3.sendAndConfirmTransaction(
      connection,
      transaction,
      [walletKeypair]
    );
    console.log("✅ SUCCESS! Vault Initialized.");
    console.log("Tx:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.error("❌ FAILURE:", error);
    if (error.logs) console.log("Logs:", error.logs);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
