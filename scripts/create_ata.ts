import { 
  Connection, 
  Keypair, 
  PublicKey, 
  clusterApiUrl 
} from "@solana/web3.js";
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccount, 
  getAccount 
} from "@solana/spl-token";
import fs from "fs";
import os from "os";

async function main() {
  // 1. Connect to Devnet
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // 2. Load your Wallet (Admin)
  // Assumes your keypair is at ~/.config/solana/id.json (Standard)
  // OR use the imported file path you used before
  const homeDir = os.homedir();
  const keypairPath = `${homeDir}/.config/solana/id.json`; 
  // IF YOU ARE USING THE 'sentinel_vault-keypair.json', change the line above to that path!
  
  const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairPath, "utf-8")));
  const wallet = Keypair.fromSecretKey(secretKey);

  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  // 3. Define Constants
  const PROGRAM_ID = new PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
  const MINT_ADDRESS = new PublicKey("3jbeJgMDBWz1zbDhqvpBwAu9CLD9o5FjWACZ6LRcq1n3");

  // 4. Derive the Vault Authority PDA
  // Seed is "vault_authority" based on your IDL
  const [vaultAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault_authority")],
    PROGRAM_ID
  );
  console.log(`Vault Authority PDA: ${vaultAuthority.toBase58()}`);

  // 5. Derive the Associated Token Account (ATA) Address
  const vaultTokenAccount = await getAssociatedTokenAddress(
    MINT_ADDRESS,
    vaultAuthority,
    true // allowOwnerOffCurve = true (REQUIRED because owner is a PDA)
  );
  console.log(`Vault Token Account (ATA): ${vaultTokenAccount.toBase58()}`);

  // 6. Check if it exists, if not, create it
  try {
    await getAccount(connection, vaultTokenAccount);
    console.log("✅ Success: Vault Token Account already exists!");
  } catch (e) {
    console.log("⚠️ Account missing. Creating it now...");
    try {
      const tx = await createAssociatedTokenAccount(
        connection,
        wallet,            // Payer
        MINT_ADDRESS,      // Mint
        vaultAuthority     // Owner (The PDA)
      );
      console.log(`✅ Success! Created ATA. TX: ${tx}`);
    } catch (err: any) {
      console.error("❌ Failed to create ATA:", err.message);
    }
  }
}

main();
