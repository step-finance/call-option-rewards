const assert = require("assert");
const fs = require('fs');
const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");

describe('merkle-call-options', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.MerkleCallOptions;

  let userKeypair;
  let userRewardAccount;
  let userPayAccount;

  let rewardMint;
  let rewardVault;
  let priceMint;
  let priceVault;

  it('Setup', async () => {
    userKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("tests/data/DrWW4z9awhp6gg1gk3jPHqG68toDwxWjhiUmiZZ62gMh.json"))));
    await program.provider.connection.requestAirdrop(userKeypair.publicKey, 10_000_000_000);

    const [_rewardMint, _rewardVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(10_000_000_000_000),
      program.provider.wallet.publicKey,
      9,
    );
    rewardMint = _rewardMint;
    rewardVault = _rewardVault;
    userRewardAccount = await new Token(program.provider.connection, rewardMint, TOKEN_PROGRAM_ID, userKeypair)
      .createAssociatedTokenAccount(userKeypair.publicKey);

    const [_priceMint, _priceVault] = await serumCmn.createMintAndVault(
      program.provider,
      new anchor.BN(10_000_000_000_000),
      program.provider.wallet.publicKey,
      6,
    );
    
    priceMint = _priceMint;
    priceVault = _priceVault;
    userPayAccount = await new Token(program.provider.connection, priceMint, TOKEN_PROGRAM_ID, userKeypair)
      .createAssociatedTokenAccount(userKeypair.publicKey);
    
    const xfer = Token.createTransferInstruction(TOKEN_PROGRAM_ID, priceVault, userPayAccount, program.provider.wallet.publicKey, [], 5_000_000_000);
    const tx = new anchor.web3.Transaction();
    tx.add(xfer);
    program.provider.wallet.signTransaction(tx);
    //tx.sign([program.provider.wallet.payer]);
    await program.provider.send(tx);
  });

  const expiry = Math.floor(Date.now() / 1000) + 10;
  
  let distAddress1;
  let distAddress2;
  let claimsMask1;
  let claimsMask2;
  let distRewardsVault1;
  let distPriceVault1;
  let distRewardsVault2;
  let distPriceVault2;

  it('Create distributors', async () => {
    //based on the claims in data folder named after merkle root
    //wallet keyfile for user in same folder

    [distAddress1,claimsMask1,distRewardsVault1,distPriceVault1] = await createDistributor(
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
      expiry,
    );
    
    [distAddress2,claimsMask2,distRewardsVault2,distPriceVault2] = await createDistributor(
      2, 
      program, 
      rewardMint, 
      rewardVault, 
      priceMint,
      "123456789012345678901234567890123456789012345678901234567890", 
      "1arDyjoydH/rcbAUw/B3se5x+fKSjtRVQFadh1ymjSc=",
      1_100_000,
      1_000_000_000_000,
      5_000, //not sure, making up big number
      expiry,
    );

    let dist = await program.account.callOptionDistributor.fetch(distAddress1);
    assert.equal(dist.writer.toString(), program.provider.wallet.publicKey.toString());
    assert.equal(dist.rewardMint.toString(), rewardMint.toString());
    assert.equal(dist.index, 1);
    assert.equal(dist.decimalsReward, 9);
    assert.equal(dist.strikePrice.toString(), new anchor.BN(900_000).toString());
    assert.equal(dist.expiry.toString(), new anchor.BN(expiry).toString());
    assert.equal(dist.dataLocation, "012345678901234567890123456789012345678901234567890123456789");
    assert.equal(Buffer.from(dist.merkleRoot).toString("base64"), "YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=");
    assert.equal(dist.maxTotalAmountClaim.toString(), new anchor.BN(1_000_000_000_000).toString());
    assert.equal(dist.totalAmountClaimed.toString(), new anchor.BN(0).toString());
    assert.equal(dist.maxNumNodes, 1);
    assert.equal(dist.numNodesClaimed.toString(), new anchor.BN(0).toString());
    assert.equal(dist.claimsBitmaskAccount.toString(), claimsMask1.toString());

    dist = await program.account.callOptionDistributor.fetch(distAddress2);
    assert.equal(dist.writer.toString(), program.provider.wallet.publicKey.toString());
    assert.equal(dist.rewardMint.toString(), rewardMint.toString());
    assert.equal(dist.index, 2);
    assert.equal(dist.decimalsReward, 9);
    assert.equal(dist.strikePrice.toString(), new anchor.BN(1_100_000).toString());
    assert.equal(dist.expiry.toString(), new anchor.BN(expiry).toString());
    assert.equal(dist.dataLocation, "123456789012345678901234567890123456789012345678901234567890");
    assert.equal(Buffer.from(dist.merkleRoot).toString("base64"), "1arDyjoydH/rcbAUw/B3se5x+fKSjtRVQFadh1ymjSc=");
    assert.equal(dist.maxTotalAmountClaim.toString(), new anchor.BN(1_000_000_000_000).toString());
    assert.equal(dist.totalAmountClaimed.toString(), new anchor.BN(0).toString());
    assert.equal(dist.maxNumNodes, 5_000);
    assert.equal(dist.numNodesClaimed.toString(), new anchor.BN(0).toString());
    assert.equal(dist.claimsBitmaskAccount.toString(), claimsMask2.toString());
  });

  it('Claim from a one node tree', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=.json"));
    const userData = claimsData[userKeypair.publicKey];

    await exerciseOption(
      1, 
      program, 
      rewardMint, 
      claimsMask1, 
      distRewardsVault1, 
      distPriceVault1, 
      userKeypair,
      userRewardAccount, 
      userPayAccount, 
      userData.index, 
      userData.amount, 
      userData.amount, 
      userData.proof.map(a=>Buffer.from(a, "base64")),
    );
  });

  it('Second claim of same node fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=.json"));
    const userData = claimsData[userKeypair.publicKey];

    try {
      await exerciseOption(
        1, 
        program, 
        rewardMint, 
        claimsMask1, 
        distRewardsVault1, 
        distPriceVault1, 
        userKeypair,
        userRewardAccount, 
        userPayAccount, 
        userData.index, 
        userData.amount, 
        userData.amount, 
        userData.proof.map(a=>Buffer.from(a, "base64")),
      );
      assert(false, 'should not have allowed dupe exercise');
    } catch { }
  });

  it('Claim from a large tree', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-1arDyjoydH-rcbAUw-B3se5x+fKSjtRVQFadh1ymjSc=.json"));
    const userData = claimsData[userKeypair.publicKey];

    await exerciseOption(
      2, 
      program, 
      rewardMint, 
      claimsMask2, 
      distRewardsVault2, 
      distPriceVault2, 
      userKeypair,
      userRewardAccount, 
      userPayAccount, 
      userData.index, 
      userData.amount, 
      userData.amount, 
      userData.proof.map(a=>Buffer.from(a, "base64")),
    );
  });

});

async function exerciseOption(index, program, rewardMint, claimsAcct, rewardVault, priceVault, userKeypair, userRewardAccount, userPaymentAccount, claimIndex, authorizedAmount, exerciseAmount, proof) {
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

  await program.rpc.exercise(
    new anchor.BN(claimIndex), 
    new anchor.BN(authorizedAmount),
    new anchor.BN(exerciseAmount),
    proof,
    {
      accounts: {
        distributor: distAddress,
        claimsBitmaskAccount: claimsAcct,
        rewardVault: rewardVault,
        priceVault: priceVault,
        userRewardTokenAccount: userRewardAccount,
        userPaymentAccount: userPaymentAccount,
        userPaymentAuthority: userKeypair.publicKey,
        claimant: userKeypair.publicKey,
        payer: userKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [userKeypair],
    }
  );
}

async function createDistributor(index, program, rewardMint, rewardVault, priceMint, dataLocation, merkle, price, maxClaim, nodeCount, expiry) {
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
    new anchor.BN(expiry),
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

  return [distAddress, claimsBitmaskAccountKey.publicKey, distRewardVault, distPriceVault];
}