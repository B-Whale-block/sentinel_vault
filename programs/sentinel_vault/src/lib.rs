use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_lang::solana_program::clock::Clock;

declare_id!("ERjqtieYDomjRpxswqWm5tmZT3LbazL3Zoy42xPdHdBY");

#[program]
pub mod sentinel_vault {
    use super::*;

    /// Initialize the Sentinel Vault with configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        old_token_mint: Pubkey,
        dex_program_id: Pubkey,
    ) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;

        // Set the admin authority
        sentinel_config.authority = ctx.accounts.authority.key();

        // Store the old token mint
        sentinel_config.old_token_mint = old_token_mint;

        // Initialize new token mint as default (will be set during migration)
        sentinel_config.new_token_mint = Pubkey::default();

        // Initialize vault token accounts as default (must be set before deposit/migration)
        sentinel_config.vault_old_token_account = Pubkey::default();
        sentinel_config.vault_new_token_account = Pubkey::default();

        // Initialize totals to zero
        sentinel_config.total_old_deposited = 0;
        sentinel_config.total_new_received = 0;

        // Set initial migration status
        sentinel_config.migration_status = MigrationStatus::NotStarted;

        // Store the whitelisted DEX program ID
        sentinel_config.dex_program_id = dex_program_id;

        // Initialize timestamp
        sentinel_config.migration_timestamp = 0;

        // Store the bump seed
        sentinel_config.bump = ctx.bumps.sentinel_config;

        msg!("Sentinel Vault initialized by authority: {}", sentinel_config.authority);
        msg!("Old token mint: {}", old_token_mint);
        msg!("DEX program ID: {}", dex_program_id);

        Ok(())
    }

    /// Deposit old tokens into the vault
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;
        let user_vault = &mut ctx.accounts.user_vault;

        // ============================================================================
        // Security Checks
        // ============================================================================

        // Check 1: Migration must not have started
        require!(
            sentinel_config.migration_status == MigrationStatus::NotStarted,
            SentinelError::DepositAfterMigration
        );

        // Check 2: Deposit amount must be greater than zero
        require!(
            amount > 0,
            SentinelError::DepositAmountTooSmall
        );

        // Check 3: Validate token mint matches
        require!(
            ctx.accounts.user_old_token_account.mint == sentinel_config.old_token_mint,
            SentinelError::InvalidTokenMint
        );

        require!(
            ctx.accounts.vault_old_token_account.mint == sentinel_config.old_token_mint,
            SentinelError::InvalidTokenMint
        );

        // ============================================================================
        // Transfer Old Tokens from User to Vault (CPI)
        // ============================================================================

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_old_token_account.to_account_info(),
            to: ctx.accounts.vault_old_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        token::transfer(cpi_ctx, amount)?;

        // ============================================================================
        // Update User Vault State
        // ============================================================================

        // If this is the first deposit, initialize the user vault
        if user_vault.old_token_deposited == 0 {
            user_vault.user = ctx.accounts.user.key();
            user_vault.has_claimed = false;
            user_vault.deposit_timestamp = Clock::get()?.unix_timestamp;
            user_vault.bump = ctx.bumps.user_vault;
        }

        // Add to user's deposited amount (use checked math to prevent overflow)
        user_vault.old_token_deposited = user_vault
            .old_token_deposited
            .checked_add(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        // ============================================================================
        // Update Sentinel Config State
        // ============================================================================

        // Add to total deposited (use checked math to prevent overflow)
        sentinel_config.total_old_deposited = sentinel_config
            .total_old_deposited
            .checked_add(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        msg!("User {} deposited {} old tokens", ctx.accounts.user.key(), amount);
        msg!("User total: {}", user_vault.old_token_deposited);
        msg!("Vault total: {}", sentinel_config.total_old_deposited);

        Ok(())
    }

    /// Migrate old tokens to new tokens via DEX CPI
    pub fn migrate(
        ctx: Context<Migrate>,
        new_token_mint: Pubkey,
        min_new_tokens_out: u64,
    ) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;

        // ============================================================================
        // Security Checks
        // ============================================================================

        // Check 1: Only admin can trigger migration
        require!(
            ctx.accounts.authority.key() == sentinel_config.authority,
            SentinelError::Unauthorized
        );

        // Check 2: Migration must not have already been completed
        require!(
            sentinel_config.migration_status == MigrationStatus::NotStarted,
            SentinelError::MigrationAlreadyCompleted
        );

        // Check 3: Must have deposits to migrate
        require!(
            sentinel_config.total_old_deposited > 0,
            SentinelError::NoDepositsToMigrate
        );

        // Check 4: Validate DEX program (prevent malicious program substitution)
        require!(
            ctx.accounts.dex_program.key() == sentinel_config.dex_program_id,
            SentinelError::InvalidDexProgram
        );

        // ============================================================================
        // DEX Swap via CPI (Placeholder Structure)
        // ============================================================================

        // Get the amount of old tokens to swap (entire vault balance)
        let old_token_amount = ctx.accounts.vault_old_token_account.amount;

        // Record new token balance before swap
        let new_token_balance_before = ctx.accounts.vault_new_token_account.amount;

        msg!("Starting migration: {} old tokens to swap", old_token_amount);

        // ============================================================================
        // CPI SWAP STRUCTURE (Raydium/Pump.fun Integration)
        // ============================================================================
        // NOTE: This is a placeholder structure. In production, you would:
        // 1. Build the proper accounts for Raydium's swap instruction
        // 2. Call invoke_signed with the vault_authority PDA signer
        // 3. Handle slippage protection with min_new_tokens_out
        //
        // Example structure for Raydium swap:
        // let swap_accounts = /* Raydium swap accounts */;
        // let seeds = &[b"vault_authority", &[ctx.bumps.vault_authority]];
        // let signer_seeds = &[&seeds[..]];
        // invoke_signed(
        //     &swap_instruction,
        //     &swap_accounts,
        //     signer_seeds,
        // )?;
        // ============================================================================

        // For now, we'll simulate the swap by checking the balance change
        // In production, this would be replaced with actual DEX CPI call

        ctx.accounts.vault_old_token_account.reload()?;
        ctx.accounts.vault_new_token_account.reload()?;

        // Calculate new tokens received from the swap
        let new_token_balance_after = ctx.accounts.vault_new_token_account.amount;
        let new_tokens_received = new_token_balance_after
            .checked_sub(new_token_balance_before)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        msg!("Migration completed: {} new tokens received", new_tokens_received);

        // Validate minimum output (slippage protection)
        require!(
            new_tokens_received >= min_new_tokens_out,
            SentinelError::InsufficientNewTokens
        );

        // ============================================================================
        // Update State
        // ============================================================================

        sentinel_config.new_token_mint = new_token_mint;
        sentinel_config.total_new_received = new_tokens_received;
        sentinel_config.migration_status = MigrationStatus::Completed;
        sentinel_config.migration_timestamp = Clock::get()?.unix_timestamp;
        sentinel_config.vault_new_token_account = ctx.accounts.vault_new_token_account.key();

        msg!("Migration status set to Completed");
        msg!("Total new tokens available for claims: {}", new_tokens_received);

        Ok(())
    }

    /// Withdraw old tokens before migration (emergency exit)
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;
        let user_vault = &mut ctx.accounts.user_vault;

        // ============================================================================
        // Security Checks
        // ============================================================================

        // Check 1: Withdrawals only allowed before migration starts
        require!(
            sentinel_config.migration_status == MigrationStatus::NotStarted,
            SentinelError::DepositAfterMigration
        );

        // Check 2: Withdraw amount must be greater than zero
        require!(
            amount > 0,
            SentinelError::DepositAmountTooSmall
        );

        // Check 3: User must have sufficient deposited tokens
        require!(
            user_vault.old_token_deposited >= amount,
            SentinelError::InsufficientNewTokens
        );

        // Check 4: Validate user vault ownership
        require!(
            user_vault.user == ctx.accounts.user.key(),
            SentinelError::Unauthorized
        );

        // Check 5: Validate token mint matches
        require!(
            ctx.accounts.user_old_token_account.mint == sentinel_config.old_token_mint,
            SentinelError::InvalidTokenMint
        );

        require!(
            ctx.accounts.vault_old_token_account.mint == sentinel_config.old_token_mint,
            SentinelError::InvalidTokenMint
        );

        msg!("User {} withdrawing {} old tokens", ctx.accounts.user.key(), amount);
        msg!("User deposited before withdraw: {}", user_vault.old_token_deposited);

        // ============================================================================
        // Transfer Old Tokens from Vault to User (CPI with PDA Signer)
        // ============================================================================

        let seeds = &[
            b"vault_authority" as &[u8],
            &[ctx.bumps.vault_authority],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_old_token_account.to_account_info(),
            to: ctx.accounts.user_old_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token::transfer(cpi_ctx, amount)?;

        // ============================================================================
        // Update State
        // ============================================================================

        // Subtract from user's deposited amount (use checked math)
        user_vault.old_token_deposited = user_vault
            .old_token_deposited
            .checked_sub(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        // Subtract from total deposited (use checked math)
        sentinel_config.total_old_deposited = sentinel_config
            .total_old_deposited
            .checked_sub(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        msg!("Withdraw successful: {} old tokens returned", amount);
        msg!("User remaining deposit: {}", user_vault.old_token_deposited);
        msg!("Vault total remaining: {}", sentinel_config.total_old_deposited);

        Ok(())
    }

    /// Claim new tokens based on share percentage
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;
        let user_vault = &mut ctx.accounts.user_vault;

        // ============================================================================
        // Security Checks
        // ============================================================================

        // Check 1: Migration must be completed
        require!(
            sentinel_config.migration_status == MigrationStatus::Completed,
            SentinelError::MigrationNotCompleted
        );

        // Check 2: User must not have already claimed
        require!(
            !user_vault.has_claimed,
            SentinelError::AlreadyClaimed
        );

        // Check 3: Admin cannot claim tokens (prevent admin from claiming as a user)
        require!(
            ctx.accounts.user.key() != sentinel_config.authority,
            SentinelError::AdminCannotClaim
        );

        // Check 4: User must have deposited tokens
        require!(
            user_vault.old_token_deposited > 0,
            SentinelError::DepositAmountTooSmall
        );

        // Check 5: Validate user vault ownership
        require!(
            user_vault.user == ctx.accounts.user.key(),
            SentinelError::Unauthorized
        );

        // ============================================================================
        // Calculate User's Share (High Precision Math)
        // ============================================================================

        // Formula: user_share = (user_deposited * total_new_received) / total_old_deposited
        // Use u128 to prevent overflow during multiplication

        let user_deposited = user_vault.old_token_deposited as u128;
        let total_new_received = sentinel_config.total_new_received as u128;
        let total_old_deposited = sentinel_config.total_old_deposited as u128;

        // Calculate share with precision
        let user_share_u128 = user_deposited
            .checked_mul(total_new_received)
            .ok_or(SentinelError::ArithmeticOverflow)?
            .checked_div(total_old_deposited)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        // Convert back to u64
        let user_share = user_share_u128 as u64;

        msg!("User {} claiming {} new tokens", ctx.accounts.user.key(), user_share);
        msg!("User deposited: {} old tokens", user_vault.old_token_deposited);
        msg!("Share percentage: {}%", (user_deposited * 100) / total_old_deposited);

        // Validate vault has sufficient tokens
        require!(
            ctx.accounts.vault_new_token_account.amount >= user_share,
            SentinelError::InsufficientNewTokens
        );

        // ============================================================================
        // Transfer New Tokens to User (CPI with PDA Signer)
        // ============================================================================

        let seeds = &[
            b"vault_authority" as &[u8],  
            &[ctx.bumps.vault_authority],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_new_token_account.to_account_info(),
            to: ctx.accounts.user_new_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };

        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

        token::transfer(cpi_ctx, user_share)?;

        // ============================================================================
        // Update State
        // ============================================================================

        user_vault.has_claimed = true;

        msg!("Claim successful: {} new tokens transferred", user_share);

        Ok(())
    }
}

// ============================================================================
// Account Structs
// ============================================================================

#[account]
pub struct SentinelConfig {
    /// The Sentinel admin authority
    pub authority: Pubkey,
    /// Old token mint to migrate from
    pub old_token_mint: Pubkey,
    /// New token mint to migrate to
    pub new_token_mint: Pubkey,
    /// PDA token account holding old tokens
    pub vault_old_token_account: Pubkey,
    /// PDA token account holding new tokens for claims
    pub vault_new_token_account: Pubkey,
    /// Total old tokens deposited by all users
    pub total_old_deposited: u64,
    /// Total new tokens received from migration
    pub total_new_received: u64,
    /// Current migration status
    pub migration_status: MigrationStatus,
    /// Whitelisted DEX program ID for CPI
    pub dex_program_id: Pubkey,
    /// Timestamp when migration occurred
    pub migration_timestamp: i64,
    /// PDA bump seed
    pub bump: u8,
}

#[account]
pub struct UserVault {
    /// User's wallet address
    pub user: Pubkey,
    /// Amount of old tokens deposited
    pub old_token_deposited: u64,
    /// Whether user has claimed their new tokens
    pub has_claimed: bool,
    /// Timestamp of deposit
    pub deposit_timestamp: i64,
    /// PDA bump seed
    pub bump: u8,
}

// ============================================================================
// Enums
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MigrationStatus {
    NotStarted,
    Completed,
}

// ============================================================================
// Context Structs
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<SentinelConfig>(),
        seeds = [b"sentinel_config"],
        bump
    )]
    pub sentinel_config: Account<'info, SentinelConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + std::mem::size_of::<UserVault>(),
        seeds = [b"user_vault", user.key().as_ref()],
        bump
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(mut)]
    pub sentinel_config: Account<'info, SentinelConfig>,

    #[account(mut)]
    pub user_old_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_old_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Migrate<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"sentinel_config"],
        bump = sentinel_config.bump
    )]
    pub sentinel_config: Account<'info, SentinelConfig>,

    /// CHECK: Vault authority PDA that signs for token transfers
    #[account(
        seeds = [b"vault_authority"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub vault_old_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault_new_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    /// CHECK: DEX program validated against sentinel_config.dex_program_id
    pub dex_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_vault", user.key().as_ref()],
        bump = user_vault.bump
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        mut,
        seeds = [b"sentinel_config"],
        bump = sentinel_config.bump
    )]
    pub sentinel_config: Account<'info, SentinelConfig>,

    /// CHECK: Vault authority PDA that signs for token transfers
    #[account(
        seeds = [b"vault_authority"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub vault_old_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_old_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_vault", user.key().as_ref()],
        bump = user_vault.bump
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        mut,
        seeds = [b"sentinel_config"],
        bump = sentinel_config.bump
    )]
    pub sentinel_config: Account<'info, SentinelConfig>,

    /// CHECK: Vault authority PDA that signs for token transfers
    #[account(
        seeds = [b"vault_authority"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub vault_new_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_new_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ============================================================================
// Error Codes
// ============================================================================

#[error_code]
pub enum SentinelError {
    #[msg("Deposits are not allowed after migration has started")]
    DepositAfterMigration,

    #[msg("No deposits to migrate")]
    NoDepositsToMigrate,

    #[msg("User has already claimed their tokens")]
    AlreadyClaimed,

    #[msg("Migration has not been completed yet")]
    MigrationNotCompleted,

    #[msg("Deposit amount must be greater than zero")]
    DepositAmountTooSmall,

    #[msg("Migration has already been completed")]
    MigrationAlreadyCompleted,

    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Unauthorized: only admin can perform this action")]
    Unauthorized,

    #[msg("New token mint has not been configured")]
    NewTokenMintNotConfigured,

    #[msg("Invalid DEX program")]
    InvalidDexProgram,

    #[msg("Insufficient new tokens in vault")]
    InsufficientNewTokens,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Admin cannot claim tokens")]
    AdminCannotClaim,
}
