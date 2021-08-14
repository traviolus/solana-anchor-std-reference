use anchor_lang::prelude::*;

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
        let price_keeper = &ctx.accounts.price_keeper;
        msg!("{:?}", price_keeper.prices);
        let rate = price_keeper.prices.iter().find(|&p| p.symbol == symbol).map_or(None, |p| Some(p.rate));
        if rate.is_none() {
            msg!("Symbol not found!");
            return Err(ErrorCode::SymbolNotFound.into());
        }
        consumer_db.latest_price = rate.unwrap();
        consumer_db.latest_symbol = symbol;
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
    pub price_keeper: CpiAccount<'info, PriceKeeper>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Price {
    pub symbol: [u8; 8],
    pub rate: u64,
    pub last_updated: u64,
    pub request_id: u64,
}

#[account]
pub struct PriceKeeper {
    pub authority: Pubkey,
    pub current_size: u8,
    pub prices: Vec<Price>,
}

#[account]
pub struct ConsumerDB {
    pub authority: Pubkey,
    pub latest_symbol: [u8; 8],
    pub latest_price: u64,
}

#[error]
pub enum ErrorCode {
    #[msg("Specified symbol not found in the price keeper account")]
    SymbolNotFound,
}
