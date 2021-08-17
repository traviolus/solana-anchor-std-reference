use anchor_lang::prelude::*;
use std_reference_basic::{SetResult, QueryResult, PriceKeeper};

#[program]
pub mod simple_consumer {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, owner: Pubkey) -> ProgramResult {
        msg!("Initialize");
        let consumer_db = &mut ctx.accounts.consumer_db;
        consumer_db.authority = owner;
        consumer_db.latest_symbol = [0u8; 8];
        consumer_db.latest_price = 0u64;
        Ok(())
    }

    pub fn transfer_ownership(ctx: Context<TransferOwnership>, new_owner: Pubkey) -> ProgramResult {
        msg!("Transfer ownership");
        let consumer_db = &mut ctx.accounts.consumer_db;
        consumer_db.authority = new_owner;
        Ok(())
    }

    pub fn set_price(ctx: Context<SetPrice>, symbol: [u8; 8]) -> ProgramResult {
        msg!("Set price");
        let consumer_db = &mut ctx.accounts.consumer_db;
        let mut query_result = ctx.accounts.query_result.clone();
        let cpi_program = ctx.accounts.std_reference_basic_program.clone();
        let cpi_accounts = SetResult {
            price_keeper: ctx.accounts.price_keeper.clone().into(),
            query_result: ctx.accounts.query_result.clone().into(),
        };
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        std_reference_basic::cpi::set_result(cpi_ctx, symbol)?;
        query_result.reload()?;
        consumer_db.latest_price = query_result.rate;
        consumer_db.latest_symbol = query_result.symbol;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init)]
    pub consumer_db: ProgramAccount<'info, ConsumerDB>,
}

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut, has_one = authority)]
    pub consumer_db: ProgramAccount<'info, ConsumerDB>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetPrice<'info> {
    #[account(mut, has_one = authority)]
    pub consumer_db: ProgramAccount<'info, ConsumerDB>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    #[account(mut)]
    pub query_result: CpiAccount<'info, QueryResult>,
    pub std_reference_basic_program: AccountInfo<'info>,
    pub price_keeper: CpiAccount<'info, PriceKeeper>,
}

#[account]
pub struct ConsumerDB {
    pub authority: Pubkey,
    pub latest_symbol: [u8; 8],
    pub latest_price: u64,
}
