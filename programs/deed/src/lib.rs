use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    clock::Clock,
    system_instruction,
};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod deed {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>, lawyer: Pubkey, beneficiary: Pubkey, from_now: u64, amount: u64) -> ProgramResult {
        {
            let deed = &mut ctx.accounts.deed;
            deed.lawyer = lawyer;
            deed.beneficiary = beneficiary;
            deed.earliest = (Clock::get()?.unix_timestamp).saturating_add(from_now as i64);
        }

        let deed_lamport = ctx.accounts.deed.to_account_info().lamports();

        if deed_lamport < amount
        {
            let ix = system_instruction::transfer(&ctx.accounts.user.key(), &ctx.accounts.deed.key(), amount - deed_lamport);
            anchor_lang::solana_program::program::invoke(
                &ix, &[
                    ctx.accounts.user.to_account_info(),
                    ctx.accounts.deed.to_account_info(),
            ])?;
        }

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> ProgramResult {
        require!(Clock::get()?.unix_timestamp >= ctx.accounts.deed.earliest, DeedError::TooEarly);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = user)]
    pub deed: Account<'info, Deed>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, close = beneficiary, constraint = deed.lawyer == lawyer.key() && deed.beneficiary == beneficiary.key())]
    pub deed: Account<'info, Deed>,
    pub lawyer: Signer<'info>,
    #[account(mut)]
    pub beneficiary: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct Deed {
    pub lawyer : Pubkey,
    pub beneficiary: Pubkey,
    pub earliest: i64,
}

#[error]
pub enum DeedError {
    #[msg("too early")]
    TooEarly
}
