use anchor_lang::prelude::*;
use anchor_lang::prelude::borsh;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_lang::solana_program::clock::Clock;

declare_id!("FqtRBu34yQx6dSi1xKjZSMsuGvzEpviGjeu65xKYVdmW");

#[program]
pub mod sentinel_vault {
    use super::*;

    /// Initialize the Sentinel Vault with configuration.
    pub fn initialize(
        ctx: Context<Initialize>,
        old_token_mint: Pubkey,
        dex_program_id: Pubkey,
    ) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;

        sentinel_config.authority = ctx.accounts.authority.key();
        sentinel_config.old_token_mint = old_token_mint;
        sentinel_config.new_token_mint = Pubkey::default();
        sentinel_config.vault_old_token_account = Pubkey::default();
        sentinel_config.vault_new_token_account = Pubkey::default();
        sentinel_config.total_old_deposited = 0;
        sentinel_config.total_new_received = 0;
        sentinel_config.migration_status = MigrationStatus::NotStarted;
        sentinel_config.dex_program_id = dex_program_id;
        sentinel_config.migration_timestamp = 0;
        sentinel_config.bump = ctx.bumps.sentinel_config;

        msg!("Svalinn initialized: authority={}", sentinel_config.authority);

        Ok(())
    }

    /// Deposit old tokens into the vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;
        let user_vault = &mut ctx.accounts.user_vault;

        require!(
            sentinel_config.migration_status == MigrationStatus::NotStarted,
            SentinelError::DepositAfterMigration
        );
        require!(amount > 0, SentinelError::DepositAmountTooSmall);

        let cpi_accounts = Transfer {
            from: ctx.accounts.user_old_token_account.to_account_info(),
            to: ctx.accounts.vault_old_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        if user_vault.old_token_deposited == 0 {
            user_vault.user = ctx.accounts.user.key();
            user_vault.has_claimed = false;
            user_vault.deposit_timestamp = Clock::get()?.unix_timestamp;
            user_vault.bump = ctx.bumps.user_vault;
        }

        user_vault.old_token_deposited = user_vault
            .old_token_deposited
            .checked_add(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        sentinel_config.total_old_deposited = sentinel_config
            .total_old_deposited
            .checked_add(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        msg!("Deposit: user={}, amount={}", ctx.accounts.user.key(), amount);

        Ok(())
    }

    /// Migrate old tokens to new tokens via DEX CPI.
    pub fn migrate(
        ctx: Context<Migrate>,
        new_token_mint: Pubkey,
        min_new_tokens_out: u64,
    ) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;

        require!(
            ctx.accounts.authority.key() == sentinel_config.authority,
            SentinelError::Unauthorized
        );
        require!(
            sentinel_config.migration_status == MigrationStatus::NotStarted,
            SentinelError::MigrationAlreadyCompleted
        );
        require!(
            sentinel_config.total_old_deposited > 0,
            SentinelError::NoDepositsToMigrate
        );
        require!(
            ctx.accounts.dex_program.key() == sentinel_config.dex_program_id,
            SentinelError::InvalidDexProgram
        );

        let old_token_amount = ctx.accounts.vault_old_token_account.amount;
        let new_token_balance_before = ctx.accounts.vault_new_token_account.amount;

        msg!("Migration started: {} old tokens", old_token_amount);

        // DEX swap CPI would be executed here
        // Production implementation requires Raydium/DEX-specific instruction building

        ctx.accounts.vault_old_token_account.reload()?;
        ctx.accounts.vault_new_token_account.reload()?;

        let new_token_balance_after = ctx.accounts.vault_new_token_account.amount;
        let new_tokens_received = new_token_balance_after
            .checked_sub(new_token_balance_before)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        require!(
            new_tokens_received >= min_new_tokens_out,
            SentinelError::InsufficientNewTokens
        );

        sentinel_config.new_token_mint = new_token_mint;
        sentinel_config.total_new_received = new_tokens_received;
        sentinel_config.migration_status = MigrationStatus::Completed;
        sentinel_config.migration_timestamp = Clock::get()?.unix_timestamp;
        sentinel_config.vault_new_token_account = ctx.accounts.vault_new_token_account.key();

        msg!("Migration completed: {} new tokens received", new_tokens_received);

        Ok(())
    }

    /// Withdraw old tokens before migration.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;
        let user_vault = &mut ctx.accounts.user_vault;

        require!(
            sentinel_config.migration_status == MigrationStatus::NotStarted,
            SentinelError::DepositAfterMigration
        );
        require!(amount > 0, SentinelError::DepositAmountTooSmall);
        require!(
            user_vault.old_token_deposited >= amount,
            SentinelError::InsufficientNewTokens
        );
        require!(
            user_vault.user == ctx.accounts.user.key(),
            SentinelError::Unauthorized
        );

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
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        user_vault.old_token_deposited = user_vault
            .old_token_deposited
            .checked_sub(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        sentinel_config.total_old_deposited = sentinel_config
            .total_old_deposited
            .checked_sub(amount)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        msg!("Withdraw: user={}, amount={}", ctx.accounts.user.key(), amount);

        Ok(())
    }

    /// Claim new tokens based on proportional share.
    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let sentinel_config = &mut ctx.accounts.sentinel_config;
        let user_vault = &mut ctx.accounts.user_vault;

        require!(
            sentinel_config.migration_status == MigrationStatus::Completed,
            SentinelError::MigrationNotCompleted
        );
        require!(!user_vault.has_claimed, SentinelError::AlreadyClaimed);
        require!(
            ctx.accounts.user.key() != sentinel_config.authority,
            SentinelError::AdminCannotClaim
        );
        require!(
            user_vault.old_token_deposited > 0,
            SentinelError::DepositAmountTooSmall
        );
        require!(
            user_vault.user == ctx.accounts.user.key(),
            SentinelError::Unauthorized
        );

        let user_deposited = user_vault.old_token_deposited as u128;
        let total_new_received = sentinel_config.total_new_received as u128;
        let total_old_deposited = sentinel_config.total_old_deposited as u128;

        let user_share_u128 = user_deposited
            .checked_mul(total_new_received)
            .ok_or(SentinelError::ArithmeticOverflow)?
            .checked_div(total_old_deposited)
            .ok_or(SentinelError::ArithmeticOverflow)?;

        let user_share = user_share_u128 as u64;

        require!(
            ctx.accounts.vault_new_token_account.amount >= user_share,
            SentinelError::InsufficientNewTokens
        );

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
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, user_share)?;

        user_vault.has_claimed = true;

        msg!("Claim: user={}, amount={}", ctx.accounts.user.key(), user_share);

        Ok(())
    }
}

#[account]
pub struct SentinelConfig {
    pub authority: Pubkey,
    pub old_token_mint: Pubkey,
    pub new_token_mint: Pubkey,
    pub vault_old_token_account: Pubkey,
    pub vault_new_token_account: Pubkey,
    pub total_old_deposited: u64,
    pub total_new_received: u64,
    pub migration_status: MigrationStatus,
    pub dex_program_id: Pubkey,
    pub migration_timestamp: i64,
    pub bump: u8,
}

#[account]
pub struct UserVault {
    pub user: Pubkey,
    pub old_token_deposited: u64,
    pub has_claimed: bool,
    pub deposit_timestamp: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MigrationStatus {
    NotStarted,
    Completed,
}

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

    #[account(
        mut,
        constraint = user_old_token_account.mint == sentinel_config.old_token_mint @ SentinelError::InvalidTokenMint
    )]
    pub user_old_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = vault_old_token_account.mint == sentinel_config.old_token_mint @ SentinelError::InvalidTokenMint
    )]
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

    /// CHECK: Vault authority PDA for token transfers
    #[account(seeds = [b"vault_authority"], bump)]
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

    /// CHECK: Vault authority PDA for token transfers
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: AccountInfo<'info>,

    #[account(
        mut,
        constraint = vault_old_token_account.mint == sentinel_config.old_token_mint @ SentinelError::InvalidTokenMint
    )]
    pub vault_old_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_old_token_account.mint == sentinel_config.old_token_mint @ SentinelError::InvalidTokenMint
    )]
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

    /// CHECK: Vault authority PDA for token transfers
    #[account(seeds = [b"vault_authority"], bump)]
    pub vault_authority: AccountInfo<'info>,

    #[account(mut)]
    pub vault_new_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user_new_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

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
