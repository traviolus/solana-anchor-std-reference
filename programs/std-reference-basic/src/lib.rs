use anchor_lang::prelude::*;

#[program]
pub mod std_reference_basic {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, size: u8, owner: Pubkey) -> ProgramResult {
        msg!("Initialize");
        let price_keeper = &mut ctx.accounts.price_keeper;
        price_keeper.authority = owner;
        price_keeper.current_size = 0;
        price_keeper.prices = Price::create_empty_prices(size);
        Ok(())
    }

    pub fn transfer_ownership(ctx: Context<TransferOwnership>, new_owner: Pubkey) -> ProgramResult {
        msg!("Transfer ownership");
        let price_keeper = &mut ctx.accounts.price_keeper;
        price_keeper.authority = new_owner;
        Ok(())
    }

    pub fn relay(ctx: Context<Relay>, prices: Vec<Price>) -> ProgramResult {
        msg!("Relay");
        let price_keeper = &mut ctx.accounts.price_keeper;
        let current_usize: usize = price_keeper.current_size as usize;

        let mut new_prices: Vec<Price> = vec![];
        for price in prices {
            let mut replace = false;
            for current_price in price_keeper.prices.iter_mut() {
                if current_price.symbol == price.symbol {
                    current_price.rate = price.rate;
                    current_price.last_updated = price.last_updated;
                    current_price.request_id = price.request_id;
                    replace = true;
                    break;
                } else if current_price.symbol == [0u8; 8] {
                    break;
                }
            }
            if !replace {
                new_prices.push(price)
            }
        }

        let new_size = current_usize + new_prices.len();
        if new_size > price_keeper.prices.len() {
            return Err(ErrorCode::PricesOverflow.into());
        }

        for j in 0..(new_size - current_usize) {
            if let Some(p) = price_keeper.prices.get_mut(j + current_usize) {
                p.symbol = new_prices[j].symbol;
                p.rate = new_prices[j].rate;
                p.last_updated = new_prices[j].last_updated;
                p.request_id = new_prices[j].request_id;
            }
        }
        price_keeper.current_size = new_size as u8;
        Ok(())
    }

    pub fn remove(ctx: Context<Remove>, symbols: Vec<[u8; 8]>) -> ProgramResult {
        msg!("Remove");
        let price_keeper = &mut ctx.accounts.price_keeper;

        let remain_prices: Vec<Price> = price_keeper.prices.clone().into_iter().filter(
            |p| (p.symbol != [0u8; 8]) && symbols.iter().all(|&s| s != p.symbol)
        ).collect();

        for (i, current_price) in price_keeper.prices.iter_mut().enumerate() {
            if i < remain_prices.len() {
                current_price.symbol = remain_prices[i].symbol;
                current_price.rate = remain_prices[i].rate;
                current_price.last_updated = remain_prices[i].last_updated;
                current_price.request_id = remain_prices[i].request_id;
            } else {
                current_price.symbol = [0u8; 8];
                current_price.rate = 0u64;
                current_price.last_updated = 0u64;
                current_price.request_id = 0u64;
            }
        }
        price_keeper.current_size = remain_prices.len() as u8;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init)]
    pub price_keeper: ProgramAccount<'info, PriceKeeper>,
}

#[derive(Accounts)]
pub struct TransferOwnership<'info> {
    #[account(mut, has_one = authority)]
    pub price_keeper: ProgramAccount<'info, PriceKeeper>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Relay<'info> {
    #[account(mut, has_one = authority)]
    pub price_keeper: ProgramAccount<'info, PriceKeeper>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Remove<'info> {
    #[account(mut, has_one = authority)]
    pub price_keeper: ProgramAccount<'info, PriceKeeper>,
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Price {
    pub symbol: [u8; 8],
    pub rate: u64,
    pub last_updated: u64,
    pub request_id: u64,
}

impl Price {
    pub fn create() -> Self {
        Price {
            symbol: [0u8; 8],
            rate: 0u64,
            last_updated: 0u64,
            request_id: 0u64,
        }
    }

    pub fn create_empty_prices(size: u8) -> Vec<Price> {
        (0..size).map(|_| Price::create()).collect()
    }
}

#[account]
pub struct PriceKeeper {
    pub authority: Pubkey,
    pub current_size: u8,
    pub prices: Vec<Price>,
}

#[error]
pub enum ErrorCode {
    #[msg("New price vector size would be larger than the maximum allowed size")]
    PricesOverflow,
}
