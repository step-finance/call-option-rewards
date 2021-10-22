use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use std::mem;

pub mod merkle_proof;

declare_id!("B9WjjujXFUZUMfqKRTg5wutnVexM2nfpTL7LumWZKbT4");

#[program]
pub mod merkle_call_options {
    use super::*;
    pub fn new_distributor(
        ctx: Context<NewDistributor>,
        index: u16,
        bump: u8,
        data_location: String,
        merkle_root: [u8; 32],
        strike_price: u64,
        expiry: u64,
        max_total_claim: u64,
        node_count: u32,
    ) -> ProgramResult {

        let distributor = &mut ctx.accounts.distributor;

        distributor.writer = ctx.accounts.writer.key();
        distributor.mint = ctx.accounts.mint.key();
        distributor.index = index;
        distributor.bump = bump;

        distributor.strike_price = strike_price;
        distributor.expiry = expiry;
        distributor.data_location = data_location;

        distributor.merkle_root = merkle_root;

        distributor.max_total_claim = max_total_claim;
        distributor.total_amount_claimed = 0;
        distributor.max_num_nodes = node_count;
        distributor.num_nodes_claimed = 0;

        distributor.claims_bitmask_account = ctx.accounts.claims_bitmask_account.key();

        //xfer max_total_claim to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, max_total_claim)?;

        Ok(())
    }
}

/// Accounts for [merkle_call_options::new_distributor].
#[derive(Accounts)]
#[instruction(index: u16, bump: u8, data_location: String)]
pub struct NewDistributor<'info> {
    /// Writer of the call options.
    pub writer: Signer<'info>,

    /// The mint to distribute.
    pub mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        seeds = [
            writer.key().as_ref(),
            mint.key().as_ref(),
            &index.to_le_bytes()
        ],
        bump = bump,
        payer = payer,
        space = CallOptionDistributor::size_of(data_location),
    )]
    pub distributor: Box<Account<'info, CallOptionDistributor>>,

    #[account(zero)]
    pub claims_bitmask_account: Loader<'info, CallOptionDistributorClaimsMask>,

    /// Payer to create the distributor.
    pub payer: Signer<'info>,

    /// Authority to transfer from the "from" token account.
    pub from_authority: Signer<'info>,

    /// Account to fund the distribution.
    #[account(mut)]
    pub from: Box<Account<'info, TokenAccount>>,

    /// Account to hold the tokens to sell for distribution
    /// Authority is itself as this is a pda
    #[account(
        init,
        token::mint = mint,
        token::authority = vault,
        seeds = [
            distributor.key().as_ref(),
            "vault".as_bytes()
        ],
        bump,
        payer = payer,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// Account to hold the tokens to sell for distribution
    /// Authority is itself as this is a pda
    #[account(
        init,
        token::mint = mint,
        token::authority = vault,
        seeds = [
            distributor.key().as_ref(),
            "payment".as_bytes()
        ],
        bump,
        payer = payer,
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(index: u64)]
pub struct Claim<'info> {
    #[account(
        mut,
        has_one = claims_bitmask_account,
        seeds = [
            writer.key().as_ref(),
            mint.key().as_ref(),
            &index.to_le_bytes()
        ],
        bump = distributor.bump,
    )]
    pub distributor: Box<Account<'info, CallOptionDistributor>>,

    pub claims_bitmask_account: Loader<'info, CallOptionDistributorClaimsMask>,

    #[account(
        mut,
        seeds = [
            distributor.key().as_ref(),
            "vault".as_bytes()
        ],
        bump,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            distributor.key().as_ref(),
            "payment".as_bytes()
        ],
        bump,
    )]
    pub payment_vault: Box<Account<'info, TokenAccount>>,

    /// Account to send the purchased tokens to.
    #[account(mut)]
    pub to: Account<'info, TokenAccount>,

    /// Who is claiming the tokens.
    pub claimant: Signer<'info>,

    /// Payer of the claim.
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[account]
#[derive(Default)]
#[repr(C)]
pub struct CallOptionDistributor {
    /// The pubkey of the underwriter of the options. Allowed to reclaim after expiry.
    pub writer: Pubkey,
    /// [Mint] of the token to be distributed.
    pub mint: Pubkey,
    /// Contract index for this account. This is part of the seed to derive the address, and should be a
    /// well known incrementing number, ideally based on time. Ex. number of week/day after project launch.
    pub index: u16,
    /// Bump seed for this account
    pub bump: u8,

    /// The strike price in USDC per 1e<mint decimals> (value of 1_000_000_000 would mean $1 = 1 token)
    pub strike_price: u64,
    /// The expiration time of the contract
    pub expiry: u64,
    /// Arweave id or other unique identifier
    pub data_location: String,

    /// The 256-bit merkle root.
    pub merkle_root: [u8; 32],

    /// Maximum number of tokens that can ever be claimed from this [MerkleDistributor].
    pub max_total_claim: u64,
    /// Total amount of tokens that have been claimed.
    pub total_amount_claimed: u64,
    /// Maximum number of nodes that can ever claim from this [MerkleDistributor].
    pub max_num_nodes: u32,
    /// Number of nodes that have been claimed.
    pub num_nodes_claimed: u64,
    /// A bitmask of indexes claimed
    pub claims_bitmask_account: Pubkey,
}
impl CallOptionDistributor {
    //used to provide the space for the account on init, which is default + bytes in the string
    fn size_of(data_location: String) -> usize {
        data_location.len()
            .checked_add(mem::size_of::<CallOptionDistributor>()).unwrap() //our account fields + 1 for the bit array to round up
            as usize
    }
}

#[account(zero_copy)]
#[repr(C)]
pub struct CallOptionDistributorClaimsMask {
    pub claims_bitmask: [u8; 31250],
}
