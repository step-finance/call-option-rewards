const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe('merkle-call-options', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.MerkleCallOptions;

  let rewardMint;
  let rewardVault;
  const claimsBitmaskAccountKey = anchor.web3.Keypair.generate();

  it('Setup', async () => {
    const [_rewardMint, _rewardVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000_000_000)
    );
    rewardMint = _rewardMint;
    rewardVault = _rewardVault;
  });
  
  let distAddress;
  let distBump;
  let distVault;

  it('Create distributor', async () => {
    const index = 0;
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
        Buffer.from("vault", "utf-8"),
      ],
      program.programId,
    )
    distVault = _distVault;

    //sample-claims merkle root is 943c96dc21e7805a9dc1f93a79e051030169c625c796c501684ba8a9b52e47b7
    await program.rpc.newDistributor(
      index, 
      distBump,
      "012345678901234567890123456789012345678901234567890123456789",
      Buffer.from("943c96dc21e7805a9dc1f93a79e051030169c625c796c501684ba8a9b52e47b7", "hex"),
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
  });
});
