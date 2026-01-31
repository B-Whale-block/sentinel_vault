import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "../idl/sentinel_vault.json";

export const PROGRAM_ID = new PublicKey("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");
export const RPC_ENDPOINT = "https://api.devnet.solana.com";
export const TOKEN_MINT = new PublicKey("3jbeJgMDBWz1zbDhqvpBwAu9CLD9o5FjWACZ6LRcq1n3");

const SEEDS = {
  config: "sentinel_config",
  userVault: "user_vault",
  vaultAuthority: "vault_authority",
  vaultToken: "vault_token",
} as const;

export interface SentinelConfig {
  authority: PublicKey;
  oldTokenMint: PublicKey;
}

export interface UserVault {
  user: PublicKey;
  oldTokenDeposited: BN;
}

export const createProvider = (connection: Connection, wallet: AnchorWallet): AnchorProvider =>
  new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });

export const createProgram = (provider: AnchorProvider): Program =>
  new Program(IDL as Idl, PROGRAM_ID, provider);

const findPDA = (seeds: Buffer[]) => PublicKey.findProgramAddressSync(seeds, PROGRAM_ID);

export const pda = {
  config: () => findPDA([Buffer.from(SEEDS.config)]),
  userVault: (user: PublicKey) => findPDA([Buffer.from(SEEDS.userVault), user.toBuffer()]),
  vaultAuthority: () => findPDA([Buffer.from(SEEDS.vaultAuthority)]),
  vaultToken: () => findPDA([Buffer.from(SEEDS.vaultToken)]),
};

export async function initialize(
  program: Program,
  admin: PublicKey,
  oldTokenMint: PublicKey
): Promise<string> {
  const [sentinelConfig] = pda.config();

  return program.methods
    .initialize(oldTokenMint)
    .accounts({
      admin,
      sentinelConfig,
      oldTokenMint,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function deposit(
  program: Program,
  user: PublicKey,
  amount: BN,
  mint: PublicKey
): Promise<string> {
  const [sentinelConfig] = pda.config();
  const [userVault] = pda.userVault(user);
  const [vaultTokenAccount] = pda.vaultToken();
  const userTokenAccount = await getAssociatedTokenAddress(mint, user);

  return program.methods
    .deposit(amount)
    .accounts({
      user,
      sentinelConfig,
      userVault,
      vaultTokenAccount,
      userTokenAccount,
      oldTokenMint: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function withdraw(
  program: Program,
  user: PublicKey,
  amount: BN,
  mint: PublicKey
): Promise<string> {
  const [sentinelConfig] = pda.config();
  const [userVault] = pda.userVault(user);
  const [vaultTokenAccount] = pda.vaultToken();
  const [vaultAuthority] = pda.vaultAuthority();
  const userTokenAccount = await getAssociatedTokenAddress(mint, user);

  return program.methods
    .withdraw(amount)
    .accounts({
      user,
      sentinelConfig,
      userVault,
      vaultTokenAccount,
      userTokenAccount,
      vaultAuthority,
      oldTokenMint: mint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function fetchConfig(program: Program): Promise<SentinelConfig | null> {
  try {
    const [configPDA] = pda.config();
    return (await program.account.sentinelConfig.fetch(configPDA)) as SentinelConfig;
  } catch {
    return null;
  }
}

export async function fetchUserVault(program: Program, user: PublicKey): Promise<UserVault | null> {
  try {
    const [vaultPDA] = pda.userVault(user);
    return (await program.account.userVault.fetch(vaultPDA)) as UserVault;
  } catch {
    return null;
  }
}

export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<number> {
  try {
    const ata = await getAssociatedTokenAddress(mint, owner);
    const account = await getAccount(connection, ata);
    return Number(account.amount);
  } catch {
    return 0;
  }
}

const TOKEN_DECIMALS = 9;

export const formatAmount = (amount: number | BN): string => {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  return (value / 10 ** TOKEN_DECIMALS).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
};

export const parseAmount = (input: string): BN => {
  const value = parseFloat(input);
  return isNaN(value) ? new BN(0) : new BN(Math.floor(value * 10 ** TOKEN_DECIMALS));
};
