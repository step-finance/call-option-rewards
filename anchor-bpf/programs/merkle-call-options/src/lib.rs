use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

pub mod merkle_proof;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod merkle_call_options {
    use super::*;
    pub fn new_distributor(
        ctx: Context<NewDistributor>,
        index: u16,
        bump: u8,
        merkle_root: [u8; 32],
        strike_price: u64,
        expiry: u64,
        data_location: [u8; 44],
        max_total_claim: u64,
        max_num_nodes: u64,
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
        distributor.max_num_nodes = max_num_nodes;
        distributor.num_nodes_claimed = 0;


        //xfer max_total_claim to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.from.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, max_total_claim)?;

        Ok(())
    }
}

/// Accounts for [merkle_call_options::new_distributor].
#[derive(Accounts)]
#[instruction(index: u16, bump: u8, max_num_nodes: u64)]
pub struct NewDistributor<'info> {
    /// Writer of the call options.
    pub writer: Signer<'info>,

    /// The mint to distribute.
    pub mint: Box<Account<'info, Mint>>,

    /// [MerkleDistributor].
    #[account(
        init,
        seeds = [
            writer.key().as_ref(),
            mint.key().as_ref(),
            &index.to_le_bytes()
        ],
        bump = bump,
        payer = payer,
        space = max_num_nodes.checked_div(8).unwrap() //each node is a bit
                             .checked_add(32+32+2+1+8+44+32+8+8+8+8+1).unwrap() //our account fields + 1 for the bit array to round up
                             as usize,
    )]
    pub distributor: Box<Account<'info, CallOptionDistributor>>,

    /// Payer to create the distributor.
    pub payer: Signer<'info>,

    /// Account to fund the distribution.
    pub from: Box<Account<'info, TokenAccount>>,

    /// Account to hold the tokens to sell for distribution
    #[account(
        init,
        token::mint = mint,
        token::authority = distributor,
        seeds = [
            "vault".as_bytes()
        ],
        bump,
        payer = payer,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}


#[account]
#[derive(Default)]
pub struct CallOptionDistributor {
    /// The pubkey of the underwriter of the options
    pub writer: Pubkey,
    /// [Mint] of the token to be distributed.
    pub mint: Pubkey,
    /// Contract index for this account
    pub index: u16,
    /// Bump seed for this account
    pub bump: u8,

    /// The strike price in USDC per 1e<mint decimals> (value of 1_000_000_000 would mean $1 = 1 STEP)
    pub strike_price: u64,
    /// The expiration time of the contract
    pub expiry: u64,
    /// Arweave id
    pub data_location: [u8; 44],

    /// The 256-bit merkle root.
    pub merkle_root: [u8; 32],

    /// Maximum number of tokens that can ever be claimed from this [MerkleDistributor].
    pub max_total_claim: u64,
    /// Total amount of tokens that have been claimed.
    pub total_amount_claimed: u64,
    /// Maximum number of nodes that can ever be claimed from this [MerkleDistributor].
    pub max_num_nodes: u64,
    /// Number of nodes that have been claimed.
    pub num_nodes_claimed: u64,
    /// A bitmask of indexes claimed
    pub claims_bitmask: [u8; 0],
}