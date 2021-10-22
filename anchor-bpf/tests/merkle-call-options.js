const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe('merkle-call-options', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.MerkleCallOptions;

  let rewardMint;
  let rewardVault;

  it('Setup', async () => {
    const [_rewardMint, _rewardVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000_000_000)
    );
    rewardMint = _rewardMint;
    rewardVault = _rewardVault;
  });
  
  let distAddress1;
  let distAddress2;

  it('Create distributor', async () => {
    distAddress1 = await createDistributor(
      1, 
      program, 
      rewardMint, 
      rewardVault, 
      "012345678901234567890123456789012345678901234567890123456789", 
      "lDyW3CHngFqdwfk6eeBRAwFpxiXHlsUBaEuoqbUuR7c="
    );
    
    distAddress2 = await createDistributor(
      2, 
      program, 
      rewardMint, 
      rewardVault, 
      "https://arweave.net/KlfUivzatC1gz2g1L3kqrZ5Rnw-94sYosRnugBHF7kM", 
      "MjVkYjEzYjhiNjBlMTZhYjNjNmViMDg5NzJlNDQzMTVjNjcyZjRlMTFlMmJhMTVjZGRlZTBiZGY4NGFhYzg2YQ=="
    );

  });
});

async function createDistributor(index, program, rewardMint, rewardVault, dataLocation, merkle) {
  const buff = new ArrayBuffer(2);
  const view = new DataView(buff);
  view.setInt16(0, index, true);
  [_distAddress, _distBump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      program.provider.wallet.publicKey.toBuffer(),
      rewardMint.toBuffer(),
      buff
    ],
    program.programId,
  )
  distAddress = _distAddress;
  distBump = _distBump;

  [_distVault, _] = await anchor.web3.PublicKey.findProgramAddress(
    [
      distAddress.toBuffer(),
      Buffer.from("vault", "utf-8"),
    ],
    program.programId,
  )
  distVault = _distVault;
  
  const claimsBitmaskAccountKey = anchor.web3.Keypair.generate();

  await program.rpc.newDistributor(
    index, 
    distBump,
    dataLocation,
    Buffer.from(merkle, "base64"),
    new anchor.BN(1_000_000_000),
    new anchor.BN(Math.floor(Date.now() / 1000) + 10),
    new anchor.BN(500),
    10,
    {
      accounts: {
        writer: program.provider.wallet.publicKey,
        mint: rewardMint,
        distributor: distAddress,
        payer: program.provider.wallet.publicKey,
        fromAuthority: program.provider.wallet.publicKey,
        from: rewardVault,
        vault: distVault,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        claimsBitmaskAccount: claimsBitmaskAccountKey.publicKey,
      },
      instructions: [
        await program.account.callOptionDistributorClaimsMask.createInstruction(
          claimsBitmaskAccountKey
        )
      ],
      signers: [claimsBitmaskAccountKey],
    }
  );

  return distAddress;
}