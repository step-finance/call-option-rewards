var fs = require('fs');
const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");

describe('merkle-call-options', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.MerkleCallOptions;

  let userKeypair

  let rewardMint;
  let rewardVault;
  let priceMint;
  let priceVault;

  it('Setup', async () => {
    userKeypair = anchor.web3.Keypair.fromSecretKey(JSON.parse(await fs.readFile("data/DrWW4z9awhp6gg1gk3jPHqG68toDwxWjhiUmiZZ62gMh.json")));
    await program.provider.connection.requestAirdrop(userKeypair.publicKey, 10_000_000_000);

    const [_rewardMint, _rewardVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000_000_000)
    );
    rewardMint = _rewardMint;
    rewardVault = _rewardVault;

    const [_priceMint, _priceVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(1_000_000_000_000),
      program.provider.wallet.publicKey,
      6,
    );
    
    priceMint = _priceMint;
    priceVault = _priceVault;
  });
  
  let distAddress1;
  let distAddress2;

  it('Create distributor', async () => {
    //based on the claims in data folder named after merkle root
    //wallet keyfile for user in same folder

    distAddress1 = await createDistributor(
      1, 
      program, 
      rewardMint, 
      rewardVault, 
      priceMint,
      "012345678901234567890123456789012345678901234567890123456789", 
      "YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=",
      900_000,
      1_000_000_000_000,
      1,
    );
    
    distAddress2 = await createDistributor(
      2, 
      program, 
      rewardMint, 
      rewardVault, 
      priceMint,
      "123456789012345678901234567890123456789012345678901234567890", 
      "NWUyMTlmY2E2MmQ2ZTg1ZTYyN2E5ZjhjNTRmZmI5NWQ0NDI3ZTI4ODQzYmFhYmE1MmMxMTJjZWFlMDg3MmVlYw==",
      1_100_000,
      1_000_000_000_000,
      5_000, //not sure, making up big number
    );

  });
});

async function createDistributor(index, program, rewardMint, rewardVault, priceMint, dataLocation, merkle, price, maxClaim, nodeCount) {
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
  const distAddress = _distAddress;
  const distBump = _distBump;

  [_distRewardVault, _] = await anchor.web3.PublicKey.findProgramAddress(
    [
      distAddress.toBuffer(),
      Buffer.from("reward", "utf-8"),
    ],
    program.programId,
  )
  const distRewardVault = _distRewardVault;

  [_distPriceVault, _] = await anchor.web3.PublicKey.findProgramAddress(
    [
      distAddress.toBuffer(),
      Buffer.from("price", "utf-8"),
    ],
    program.programId,
  )
  const distPriceVault = _distPriceVault;
  
  const claimsBitmaskAccountKey = anchor.web3.Keypair.generate();

  await program.rpc.newDistributor(
    index, 
    distBump,
    dataLocation,
    Buffer.from(merkle, "base64"),
    new anchor.BN(price),
    new anchor.BN(Math.floor(Date.now() / 1000) + 10),
    new anchor.BN(maxClaim),
    nodeCount,
    {
      accounts: {
        writer: program.provider.wallet.publicKey,
        rewardMint: rewardMint,
        priceMint: priceMint,
        distributor: distAddress,
        payer: program.provider.wallet.publicKey,
        fromAuthority: program.provider.wallet.publicKey,
        from: rewardVault,
        rewardVault: distRewardVault,
        priceVault: distPriceVault,
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