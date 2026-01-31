import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Configuration
// ============================================================================

const PROGRAM_ID = new PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
const OLD_TOKEN_MINT = new PublicKey("3jbeJgMDBWz1zbDhqvpBwAu9CLD9o5FjWACZ6LRcq1n3");

// Jupiter Aggregator v6 on Devnet (placeholder DEX program)
const DEX_PROGRAM_ID = new PublicKey("JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4");

// PDA Seeds
const SEEDS = {
  config: "sentinel_config",
  vaultAuthority: "vault_authority",
};

// ============================================================================
// Load IDL
// ============================================================================

const IDL_PATH = path.join(__dirname, "../target/idl/sentinel_vault.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));

// ============================================================================
// Helper Functions
// ============================================================================

function loadKeypair(filePath: string): Keypair {
  const absolutePath = path.resolve(filePath);
  const secretKey = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function findPDA(seeds: Buffer[]): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);
}

// ============================================================================
// Main Script
// ============================================================================

async function main() {
  console.log("\n🔐 SENTINEL VAULT INITIALIZATION SCRIPT");
  console.log("═".repeat(50));

  // Load authority keypair
  const keypairPath = "./sentinel_vault-keypair.json";
  console.log(`\n📂 Loading keypair from: ${keypairPath}`);

  let authority: Keypair;
  try {
    authority = loadKeypair(keypairPath);
    console.log(`✅ Authority wallet: ${authority.publicKey.toBase58()}`);
  } catch (e) {
    console.error(`❌ Failed to load keypair: ${e}`);
    console.log("\nMake sure sentinel_vault-keypair.json exists in the project root.");
    process.exit(1);
  }

  // Connect to Devnet
  console.log("\n🌐 Connecting to Devnet...");
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  // Check balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log(`💰 Authority balance: ${balance / 1e9} SOL`);

  if (balance < 0.01 * 1e9) {
    console.error("❌ Insufficient balance. Need at least 0.01 SOL.");
    console.log("Run: solana airdrop 1 --url devnet");
    process.exit(1);
  }

  // Create provider and program
  const wallet = new anchor.Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  anchor.setProvider(provider);

  const program = new Program(IDL as Idl, PROGRAM_ID, provider);

  // Derive PDAs
  const [sentinelConfig, configBump] = findPDA([Buffer.from(SEEDS.config)]);
  const [vaultAuthority, vaultBump] = findPDA([Buffer.from(SEEDS.vaultAuthority)]);

  console.log("\n📍 Program Addresses:");
  console.log(`   Program ID:      ${PROGRAM_ID.toBase58()}`);
  console.log(`   Sentinel Config: ${sentinelConfig.toBase58()}`);
  console.log(`   Vault Authority: ${vaultAuthority.toBase58()}`);
  console.log(`   Old Token Mint:  ${OLD_TOKEN_MINT.toBase58()}`);
  console.log(`   DEX Program:     ${DEX_PROGRAM_ID.toBase58()}`);

  // Check if already initialized
  console.log("\n🔍 Checking if vault is already initialized...");
  try {
    const configAccount = await program.account.sentinelConfig.fetch(sentinelConfig);
    console.log("⚠️  Vault is already initialized!");
    console.log(`   Authority: ${(configAccount as any).authority.toBase58()}`);
    console.log(`   Old Token Mint: ${(configAccount as any).oldTokenMint.toBase58()}`);
    process.exit(0);
  } catch (e) {
    console.log("✅ Vault not initialized yet. Proceeding...");
  }

  // Initialize the vault
  console.log("\n🚀 Initializing Sentinel Vault...");

  try {
    const tx = await program.methods
      .initialize(OLD_TOKEN_MINT, DEX_PROGRAM_ID)
      .accounts({
        authority: authority.publicKey,
        sentinelConfig: sentinelConfig,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log(`\n✅ Vault initialized successfully!`);
    console.log(`📝 Transaction: ${tx}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Verify initialization
    console.log("\n🔍 Verifying initialization...");
    const configAccount = await program.account.sentinelConfig.fetch(sentinelConfig);
    console.log("✅ Config verified:");
    console.log(`   Authority: ${(configAccount as any).authority.toBase58()}`);
    console.log(`   Old Token Mint: ${(configAccount as any).oldTokenMint.toBase58()}`);
    console.log(`   DEX Program: ${(configAccount as any).dexProgramId.toBase58()}`);
    console.log(`   Migration Status: ${JSON.stringify((configAccount as any).migrationStatus)}`);

  } catch (e) {
    console.error(`\n❌ Initialization failed: ${e}`);
    process.exit(1);
  }

  // Create Vault Token Account (ATA for vault_authority)
  console.log("\n📦 Creating Vault Token Account...");

  const vaultTokenAccount = await getAssociatedTokenAddress(
    OLD_TOKEN_MINT,
    vaultAuthority,
    true // allowOwnerOffCurve for PDAs
  );

  console.log(`   Vault Token Account: ${vaultTokenAccount.toBase58()}`);

  // Check if ATA already exists
  const ataInfo = await connection.getAccountInfo(vaultTokenAccount);
  if (ataInfo) {
    console.log("✅ Vault Token Account already exists.");
  } else {
    console.log("   Creating Associated Token Account...");

    try {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        authority.publicKey, // payer
        vaultTokenAccount,   // ata
        vaultAuthority,      // owner
        OLD_TOKEN_MINT,      // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const tx = await provider.sendAndConfirm(
        new anchor.web3.Transaction().add(createAtaIx),
        [authority]
      );

      console.log(`✅ Vault Token Account created!`);
      console.log(`📝 Transaction: ${tx}`);
      console.log(`🔗 Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (e) {
      console.error(`❌ Failed to create ATA: ${e}`);
      console.log("You may need to create it manually or the token mint may not exist.");
    }
  }

  console.log("\n" + "═".repeat(50));
  console.log("🎉 INITIALIZATION COMPLETE!");
  console.log("═".repeat(50));
  console.log("\nNext steps:");
  console.log("1. Make sure you have tokens in your wallet");
  console.log("2. Open the frontend and connect your wallet");
  console.log("3. Test deposit and withdraw functions");
  console.log("\n");
}

main().catch(console.error);
