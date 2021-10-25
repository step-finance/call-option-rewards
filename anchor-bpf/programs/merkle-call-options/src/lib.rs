use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use std::mem;
use bit::BitIndex;

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
        distributor.reward_mint = ctx.accounts.reward_mint.key();
        distributor.index = index;
        distributor.bump = bump;

        distributor.decimals_reward = ctx.accounts.reward_mint.decimals;

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
            to: ctx.accounts.reward_vault.to_account_info(),
            authority: ctx.accounts.from_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, max_total_claim)?;

        Ok(())
    }

    pub fn claim(
        ctx: Context<Claim>,
        index: u64,
        authorized_amount: u64,
        exercise_amount: u64,
        proof: Vec<[u8; 32]>,
    ) -> ProgramResult {

        require!(
            exercise_amount <= authorized_amount,
            TooManyExercising,
        );

        let distributor = &ctx.accounts.distributor;

        //validate not claimed and mark as claimed
        {
            //0 = MSB !
            let claim_byte = index / 8;
            //our bitmask is index 0 = MSB and index max_num_nodes = LSB, hence the "7 - n" since bit crate is reverse (0=LSB)
            let claim_bit = 7 - index % 8;

            let claims_bitmask = &mut ctx.accounts.claims_bitmask_account.load_mut()?;
            let byte = &mut claims_bitmask.claims_bitmask[claim_byte as usize];
            if byte.bit(claim_bit as usize) {
                return Err(ErrorCode::OptionAlreadyExercised.into());
            }
            byte.set_bit(claim_bit as usize, true);
        }

        let claimant_account = &ctx.accounts.claimant;

        // Verify the merkle proof.
        let node = solana_program::keccak::hashv(&[
            &index.to_le_bytes(),
            &claimant_account.key().to_bytes(),
            &authorized_amount.to_le_bytes(),
        ]);
        require!(
            merkle_proof::verify(proof, distributor.merkle_root, node.0),
            InvalidProof,
        );

        // exercise the option
        let one_reward_token = 1u64.checked_pow(distributor.decimals_reward.into()).unwrap();
        let cost = exercise_amount
            .checked_mul(distributor.strike_price).unwrap()
            .checked_div(one_reward_token).unwrap();

        //pay
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_payment_account.to_account_info(),
                    to: ctx.accounts.price_vault.to_account_info(),
                    authority: ctx.accounts.user_payment_authority.to_account_info(),
                }
            ),
            cost,
        )?;

        //send
        let seeds = &[
            distributor.writer.as_ref(),
            distributor.reward_mint.as_ref(),
            &distributor.index.to_le_bytes(),
            &[distributor.bump],
        ];
        let signer = &[&seeds[..]];
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault.to_account_info(),
                    to: ctx.accounts.user_reward_token_account.to_account_info(),
                    authority: distributor.to_account_info(),
                }
            ).with_signer(signer),
            exercise_amount,
        )?;

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
    pub reward_mint: Box<Account<'info, Mint>>,

    /// The mint used to exercise the contract.
    pub price_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        seeds = [
            writer.key().as_ref(),
            reward_mint.key().as_ref(),
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
        token::mint = reward_mint,
        token::authority = distributor,
        seeds = [
            distributor.key().as_ref(),
            "reward".as_bytes()
        ],
        bump,
        payer = payer,
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    /// Account to hold the price_mint when contracts are exercised
    /// Authority is itself as this is a pda
    #[account(
        init,
        token::mint = price_mint,
        token::authority = distributor,
        seeds = [
            distributor.key().as_ref(),
            "price".as_bytes()
        ],
        bump,
        payer = payer,
    )]
    pub price_vault: Box<Account<'info, TokenAccount>>,

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
        //the index into the claims mask can't be greater than the number of nodes
        constraint = u64::from(distributor.max_num_nodes) > index,
    )]
    pub distributor: Box<Account<'info, CallOptionDistributor>>,

    pub claims_bitmask_account: Loader<'info, CallOptionDistributorClaimsMask>,

    #[account(
        mut,
        seeds = [
            distributor.key().as_ref(),
            "reward".as_bytes()
        ],
        bump,
    )]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [
            distributor.key().as_ref(),
            "price".as_bytes()
        ],
        bump,
    )]
    pub price_vault: Box<Account<'info, TokenAccount>>,

    /// Account to send the purchased tokens to.
    #[account(mut)]
    pub user_reward_token_account: Box<Account<'info, TokenAccount>>,

    /// Account to use to buy tokens at strike price.
    #[account(mut)]
    pub user_payment_account: Box<Account<'info, TokenAccount>>,

    /// Authority allowed to withdraw from user_payment_account.
    #[account(mut)]
    pub user_payment_authority: Signer<'info>,

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
    pub reward_mint: Pubkey,
    /// Contract index for this account. This is part of the seed to derive the address, and should be a
    /// well known incrementing number, ideally based on time. Ex. number of week/day after project launch.
    pub index: u16,
    /// Bump seed for this account
    pub bump: u8,

    /// we store the decimals of the mint so our maths during claim doesn't need the mint
    pub decimals_reward: u8,

    /// The strike price in price_mint per 1e<mint decimals> (value of 1_000_000 USDC (6 decimals) would mean $1 = 1 full token (N decimals))
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

#[error]
pub enum ErrorCode {
    #[msg("Invalid Merkle proof.")]
    InvalidProof,
    #[msg("Option already exercised.")]
    OptionAlreadyExercised,
    #[msg("Not authorized to purchase that amount.")]
    TooManyExercising,
}