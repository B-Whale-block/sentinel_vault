import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction, 
  clusterApiUrl 
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddressSync, 
  createAssociatedTokenAccountInstruction 
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

async function main() {
  console.log("🚀 Starting Safe ATA Creation...");

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // --- FIX START: Load the DEFAULT SYSTEM WALLET (id.json) ---
  // This is the wallet you use for 'solana deploy', so it definitely has SOL and is a valid user.
  const homeDir = os.homedir();
  const keypairPath = `${homeDir}/.config/solana/id.json`;
  
  if (!fs.existsSync(keypairPath)) {
    console.error(`❌ Error: Could not find wallet at ${keypairPath}`);
    console.error("Please ensure you have a standard Solana wallet set up.");
    return;
  }

  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
  const wallet = Keypair.fromSecretKey(secretKey);
  // --- FIX END ---

  console.log(`👤 Payer Wallet: ${wallet.publicKey.toBase58()}`);

  const PROGRAM_ID = new PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
  const MINT_ADDRESS = new PublicKey("3jbeJgMDBWz1zbDhqvpBwAu9CLD9o5FjWACZ6LRcq1n3");

  // Derive Vault Authority PDA
  const [vaultAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority")],
    PROGRAM_ID
  );
  console.log(`🔐 Vault Authority PDA: ${vaultAuthority.toBase58()}`);

  // Derive ATA Address
  const vaultTokenAccount = getAssociatedTokenAddressSync(
    MINT_ADDRESS,
    vaultAuthority,
    true // allowOwnerOffCurve = true
  );
  console.log(`🏦 Target ATA Address: ${vaultTokenAccount.toBase58()}`);

  // Check if exists
  const info = await connection.getAccountInfo(vaultTokenAccount);
  if (info) {
    console.log("✅ Account already exists. No action needed.");
    return;
  }

  console.log("⚠️ Account missing. Creating manually...");

  const ix = createAssociatedTokenAccountInstruction(
    wallet.publicKey, // Payer (Now correctly set to your user wallet)
    vaultTokenAccount, 
    vaultAuthority,   
    MINT_ADDRESS      
  );

  const tx = new Transaction().add(ix);

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log(`✅ Success! ATA Created. Signature: ${sig}`);
  } catch (err: any) {
    console.error("❌ ERROR DETAILS:", err);
  }
}

main();