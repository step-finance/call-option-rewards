const assert = require("assert");
const fs = require('fs');
const anchor = require('@project-serum/anchor');
const serumCmn = require("@project-serum/common");
const { TOKEN_PROGRAM_ID, Token } = require("@solana/spl-token");

describe('merkle-call-options', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const program = anchor.workspace.MerkleCallOptions;

  let ownerKeypair;
  let ownerRewardAccount;
  let ownerPriceAccount;

  let writerKeypair;
  let writerRewardAccount;
  let writerPriceAccount;

  let userKeypair;
  let userRewardAccount;
  let userPayAccount;

  let userKeypair2;
  let userRewardAccount2;
  let userPayAccount2;

  let rewardMint;
  let rewardVault;
  let priceMint;
  let priceVault;

  it('Setup', async () => {
    ownerKeypair = new anchor.web3.Keypair();
    await program.provider.connection.requestAirdrop(ownerKeypair.publicKey, 10_000_000_000);

    writerKeypair = new anchor.web3.Keypair();
    await program.provider.connection.requestAirdrop(writerKeypair.publicKey, 10_000_000_000);

    userKeypair = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("tests/data/DrWW4z9awhp6gg1gk3jPHqG68toDwxWjhiUmiZZ62gMh.json"))));
    await program.provider.connection.requestAirdrop(userKeypair.publicKey, 10_000_000_000);
    
    userKeypair2 = anchor.web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync("tests/data/zz5YUJpat7fSwKsBVVBjv2FfxkGu7DmdW4MBdN6HZD2.json"))));
    await program.provider.connection.requestAirdrop(userKeypair2.publicKey, 10_000_000_000);

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
    userRewardAccount2 = await new Token(program.provider.connection, rewardMint, TOKEN_PROGRAM_ID, userKeypair2)
      .createAssociatedTokenAccount(userKeypair2.publicKey);
    ownerRewardAccount = await new Token(program.provider.connection, rewardMint, TOKEN_PROGRAM_ID, ownerKeypair)
      .createAssociatedTokenAccount(ownerKeypair.publicKey);
    writerRewardAccount = await new Token(program.provider.connection, rewardMint, TOKEN_PROGRAM_ID, writerKeypair)
        .createAssociatedTokenAccount(writerKeypair.publicKey);

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
    userPayAccount2 = await new Token(program.provider.connection, priceMint, TOKEN_PROGRAM_ID, userKeypair2)
      .createAssociatedTokenAccount(userKeypair2.publicKey);
    ownerPriceAccount = await new Token(program.provider.connection, priceMint, TOKEN_PROGRAM_ID, ownerKeypair)
      .createAssociatedTokenAccount(ownerKeypair.publicKey);
    writerPriceAccount = await new Token(program.provider.connection, priceMint, TOKEN_PROGRAM_ID, writerKeypair)
        .createAssociatedTokenAccount(writerKeypair.publicKey);
    
    let xfer = Token.createTransferInstruction(TOKEN_PROGRAM_ID, priceVault, userPayAccount, program.provider.wallet.publicKey, [], 5_000_000_000);
    let tx = new anchor.web3.Transaction();
    tx.add(xfer);
    program.provider.wallet.signTransaction(tx);
    await program.provider.send(tx);
  
    xfer = Token.createTransferInstruction(TOKEN_PROGRAM_ID, priceVault, userPayAccount2, program.provider.wallet.publicKey, [], 5_000_000_000);
    tx = new anchor.web3.Transaction();
    tx.add(xfer);
    program.provider.wallet.signTransaction(tx);
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
      writerKeypair,
      rewardMint, 
      rewardVault, 
      priceMint,
      ownerKeypair.publicKey,
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
      writerKeypair,
      rewardMint, 
      rewardVault, 
      priceMint,
      ownerKeypair.publicKey,
      "123456789012345678901234567890123456789012345678901234567890", 
      "q8LYvfEDW9gdyeWBZk3ABsUjVQFM/V4BhAsSHJMDstA=",
      1_100_000,
      1_000_000_000_000,
      5_000, //not sure, making up big number
      expiry,
    );

    let dist = await program.account.callOptionDistributor.fetch(distAddress1);
    assert.equal(dist.writer.toString(), writerKeypair.publicKey.toString());
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
    assert.equal(dist.priceMint.toString(), priceMint.toString());
    assert.equal(dist.decimalsPrice, 6);

    dist = await program.account.callOptionDistributor.fetch(distAddress2);
    assert.equal(dist.writer.toString(), writerKeypair.publicKey.toString());
    assert.equal(dist.rewardMint.toString(), rewardMint.toString());
    assert.equal(dist.index, 2);
    assert.equal(dist.decimalsReward, 9);
    assert.equal(dist.strikePrice.toString(), new anchor.BN(1_100_000).toString());
    assert.equal(dist.expiry.toString(), new anchor.BN(expiry).toString());
    assert.equal(dist.dataLocation, "123456789012345678901234567890123456789012345678901234567890");
    assert.equal(Buffer.from(dist.merkleRoot).toString("base64"), "q8LYvfEDW9gdyeWBZk3ABsUjVQFM/V4BhAsSHJMDstA=");
    assert.equal(dist.maxTotalAmountClaim.toString(), new anchor.BN(1_000_000_000_000).toString());
    assert.equal(dist.totalAmountClaimed.toString(), new anchor.BN(0).toString());
    assert.equal(dist.maxNumNodes, 5_000);
    assert.equal(dist.numNodesClaimed.toString(), new anchor.BN(0).toString());
    assert.equal(dist.claimsBitmaskAccount.toString(), claimsMask2.toString());
    assert.equal(dist.priceMint.toString(), priceMint.toString());
    assert.equal(dist.decimalsPrice, 6);
  });

  it('Claim with wrong bitmask account fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=.json"));
    const userData = claimsData[userKeypair.publicKey];

    try {
      await exerciseOption(
        1, 
        program, 
        writerKeypair.publicKey,
        rewardMint, 
        
        //wrong
        claimsMask2, 

        distRewardsVault1, 
        distPriceVault1, 
        userKeypair,
        userRewardAccount, 
        userPayAccount, 
        userData.index, 
        userData.amount, 
        userData.amount / 2 - 1, //theoretically, if multiple claims allowed, this should be available
        userData.proof.map(a=>Buffer.from(a, "base64")),
      );
      assert(false, 'should not have allowed wrong bitmask account');
    } catch { /*expected*/ }
  });

  it('Claim with wrong vault fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=.json"));
    const userData = claimsData[userKeypair.publicKey];

    try {
      await exerciseOption(
        1, 
        program, 
        writerKeypair.publicKey,
        rewardMint, 
        claimsMask1, 

        //wrong
        distRewardsVault2, 

        distPriceVault1, 
        userKeypair,
        userRewardAccount, 
        userPayAccount, 
        userData.index, 
        userData.amount, 
        userData.amount / 2 - 1, //theoretically, if multiple claims allowed, this should be available
        userData.proof.map(a=>Buffer.from(a, "base64")),
      );
      assert(false, 'should not have allowed wrong bitmask account');
    } catch { /*expected*/ }
  });

  it('Claim partial from a one node tree', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=.json"));
    const userData = claimsData[userKeypair.publicKey];

    const amountToClaim = parseInt(userData.amount) / 2;
    
    let isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask1, userData.index);
    assert.equal(isClaimed, false);

    await exerciseOption(
      1, 
      program, 
      writerKeypair.publicKey,
      rewardMint, 
      claimsMask1, 
      distRewardsVault1, 
      distPriceVault1, 
      userKeypair,
      userRewardAccount, 
      userPayAccount, 
      userData.index, 
      userData.amount, 
      (amountToClaim).toString(), 
      userData.proof.map(a=>Buffer.from(a, "base64")),
    );

    isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask1, userData.index);
    assert.equal(isClaimed, true);

    //validate expected fields on distributor
    let dist = await program.account.callOptionDistributor.fetch(distAddress1);
    assert.equal(dist.writer.toString(), writerKeypair.publicKey.toString());
    assert.equal(dist.rewardMint.toString(), rewardMint.toString());
    assert.equal(dist.index, 1);
    assert.equal(dist.decimalsReward, 9);
    assert.equal(dist.strikePrice.toString(), new anchor.BN(900_000).toString());
    assert.equal(dist.expiry.toString(), new anchor.BN(expiry).toString());
    assert.equal(dist.dataLocation, "012345678901234567890123456789012345678901234567890123456789");
    assert.equal(Buffer.from(dist.merkleRoot).toString("base64"), "YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=");
    assert.equal(dist.maxTotalAmountClaim.toString(), new anchor.BN(1_000_000_000_000).toString());
    assert.equal(dist.totalAmountClaimed.toString(), new anchor.BN(amountToClaim).toString());
    assert.equal(dist.maxNumNodes, 1);
    assert.equal(dist.numNodesClaimed.toString(), new anchor.BN(1).toString());
    assert.equal(dist.claimsBitmaskAccount.toString(), claimsMask1.toString());
    assert.equal(dist.priceMint.toString(), priceMint.toString());
    assert.equal(dist.decimalsPrice, 6);
  });

  it('Second claim of same node fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-YBKqO7sk+KJJC1CirbhD0czdpeDTa8aqx7BD9HtIEC4=.json"));
    const userData = claimsData[userKeypair.publicKey];

    try {
      await exerciseOption(
        1, 
        program, 
        writerKeypair.publicKey,
        rewardMint, 
        claimsMask1, 
        distRewardsVault1, 
        distPriceVault1, 
        userKeypair,
        userRewardAccount, 
        userPayAccount, 
        userData.index, 
        userData.amount, 
        (parseInt(userData.amount) / 2 - 1).toString(), //theoretically, if multiple claims allowed, this should be available
        userData.proof.map(a=>Buffer.from(a, "base64")),
      );
      assert(false, 'should not have allowed dupe exercise');
    } catch { /*expected*/ }
  });

  it('Claim too much from a large tree fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-q8LYvfEDW9gdyeWBZk3ABsUjVQFM-V4BhAsSHJMDstA=.json"));
    const userData = claimsData[userKeypair.publicKey];

    try {
      await exerciseOption(
        2, 
        program, 
        writerKeypair.publicKey,
        rewardMint, 
        claimsMask2, 
        distRewardsVault2, 
        distPriceVault2, 
        userKeypair,
        userRewardAccount, 
        userPayAccount, 
        userData.index, 
        userData.amount, 
        (parseInt(userData.amount) + 1).toString(), 
        userData.proof.map(a=>Buffer.from(a, "base64")),
      );
      assert(false, 'should not have allowed over-claim');
      
      isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask2, userData.index);
      assert.equal(isClaimed, false);
    } 
    catch { /*expected*/ }
  });

  it('Claim from a large tree', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-q8LYvfEDW9gdyeWBZk3ABsUjVQFM-V4BhAsSHJMDstA=.json"));
    const userData = claimsData[userKeypair.publicKey];
      
    isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask2, userData.index);
    assert.equal(isClaimed, false);

    await exerciseOption(
      2, 
      program, 
      writerKeypair.publicKey,
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
      
    isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask2, userData.index);
    assert.equal(isClaimed, true);
  });

  it('Second claim from a large tree fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-q8LYvfEDW9gdyeWBZk3ABsUjVQFM-V4BhAsSHJMDstA=.json"));
    const userData = claimsData[userKeypair.publicKey];

    try {
      await exerciseOption(
        2, 
        program, 
        writerKeypair.publicKey,
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
      assert(false, 'should not have allowed dupe exercise');
    } catch { /*expected*/ }
  });

  it('Claim last node from a large tree', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-q8LYvfEDW9gdyeWBZk3ABsUjVQFM-V4BhAsSHJMDstA=.json"));
    const userData = claimsData[userKeypair2.publicKey];
      
    isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask2, userData.index);
    assert.equal(isClaimed, false);

    await exerciseOption(
      2, 
      program, 
      writerKeypair.publicKey,
      rewardMint, 
      claimsMask2, 
      distRewardsVault2, 
      distPriceVault2, 
      userKeypair2,
      userRewardAccount2, 
      userPayAccount2, 
      userData.index, 
      userData.amount, 
      userData.amount, 
      userData.proof.map(a=>Buffer.from(a, "base64")),
    );
      
    isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask2, userData.index);
    assert.equal(isClaimed, true);
  });

  it('A couple dozen indexes before the last are still not claimed', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-q8LYvfEDW9gdyeWBZk3ABsUjVQFM-V4BhAsSHJMDstA=.json"));
    const userData = claimsData[userKeypair2.publicKey];
    
    //really just exercising/testing our isCallOptionClaimed method here
    for (let i = 1; i < 25; i++) {
      isClaimed = await isCallOptionClaimed(program.provider.connection, claimsMask2, userData.index - i);
      assert.equal(isClaimed, false);
    }
  });

  it('Second claim last node from a large tree fails', async () => {
    const claimsData = JSON.parse(fs.readFileSync("tests/data/claims-q8LYvfEDW9gdyeWBZk3ABsUjVQFM-V4BhAsSHJMDstA=.json"));
    const userData = claimsData[userKeypair2.publicKey];

    try {
      await exerciseOption(
        2, 
        program, 
        writerKeypair.publicKey,
        rewardMint, 
        claimsMask2, 
        distRewardsVault2, 
        distPriceVault2, 
        userKeypair2,
        userRewardAccount2, 
        userPayAccount2, 
        userData.index, 
        userData.amount, 
        userData.amount, 
        userData.proof.map(a=>Buffer.from(a, "base64")),
      );
      assert(false, 'should not have allowed dupe exercise');
    } catch { /*expected*/ }
  });

  it('Close distributor 1 early fails', async () => {

    try {
      await closeOption(
        1, 
        program, 
        writerKeypair,
        claimsMask1, 
        rewardMint, 
        distRewardsVault1, 
        distPriceVault1, 
        writerRewardAccount, 
        writerPriceAccount, 
      );
      assert(false, 'should not have allowed early close');
    } catch { /*expected*/ }

  });

  it('waits', async () => {
    await wait(8); //let expire
  });

  it('Close distributor 1 with wrong writer fails', async () => {

    try {
      await closeOption(
        1, 
        program, 
        ownerKeypair,
        claimsMask1, 
        rewardMint, 
        distRewardsVault1, 
        distPriceVault1, 
        writerRewardAccount, 
        writerPriceAccount, 
      );
      assert(false, 'should not have allowed closing by wrong writer');
    } catch { /*expected*/ }

  });

  it('Close distributor 1 with wrong token accounts fails', async () => {

    try {
      await closeOption(
        1, 
        program, 
        writerKeypair,
        claimsMask1, 
        rewardMint, 
        distRewardsVault1, 
        distPriceVault1, 
        userRewardAccount1, 
        userPayAccount1, 
      );
      assert(false, 'should not have allowed closing with non owner or writer token accounts');
    } catch { /*expected*/ }

  });

  it('Close distributor 1', async () => {

    await closeOption(
      1, 
      program, 
      writerKeypair,
      claimsMask1, 
      rewardMint, 
      distRewardsVault1, 
      distPriceVault1, 
      writerRewardAccount, 
      ownerPriceAccount, 
    );

  });

  it('Close distributor 2', async () => {

    await closeOption(
      2, 
      program, 
      writerKeypair,
      claimsMask2, 
      rewardMint, 
      distRewardsVault2, 
      distPriceVault2, 
      ownerRewardAccount, 
      writerPriceAccount, 
    );

  });

});

async function closeOption(index, program, writer, claimsAcct, rewardMint, rewardVault, priceVault, refundRewardAccount, refundPriceAccount) {
  const buff = new ArrayBuffer(2);
  const view = new DataView(buff);
  view.setInt16(0, index, true);
  [_distAddress, _distBump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      writer.publicKey.toBuffer(),
      rewardMint.toBuffer(),
      buff
    ],
    program.programId,
  )
  const distAddress = _distAddress;

  await program.rpc.close(
    {
      accounts: {
        writer: writer.publicKey,
        distributor: distAddress,
        claimsBitmaskAccount: claimsAcct,
        rewardVault: rewardVault,
        priceVault: priceVault,
        refundRewardTokenAccount: refundRewardAccount,
        refundPriceTokenAccount: refundPriceAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [writer]
    }
  );
}

async function exerciseOption(index, program, writer, rewardMint, claimsAcct, rewardVault, priceVault, userKeypair, userRewardAccount, userPaymentAccount, claimIndex, authorizedAmount, exerciseAmount, proof) {
  const buff = new ArrayBuffer(2);
  const view = new DataView(buff);
  view.setInt16(0, index, true);
  [_distAddress, _distBump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      writer.toBuffer(),
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

async function createDistributor(index, program, writer, rewardMint, rewardVault, priceMint, owner, dataLocation, merkle, price, maxClaim, nodeCount, expiry) {
  const buff = new ArrayBuffer(2);
  const view = new DataView(buff);
  view.setInt16(0, index, true);
  [_distAddress, _distBump] = await anchor.web3.PublicKey.findProgramAddress(
    [
      writer.publicKey.toBuffer(),
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
        writer: writer.publicKey,
        rewardMint: rewardMint,
        priceMint: priceMint,
        distributor: distAddress,
        owner: owner,
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
      signers: [writer, claimsBitmaskAccountKey],
    }
  );

  return [distAddress, claimsBitmaskAccountKey.publicKey, distRewardVault, distPriceVault];
}

async function wait(seconds) {
  while(seconds > 0) {
    console.log("countdown " + seconds--);
    await new Promise(a=>setTimeout(a, 1000));
  }
  console.log("wait over");
}

async function isCallOptionClaimed(connection, claimsMaskPubkey, claimIndex) {
  //the bool value of if a option has been exercised (claimed) is stored as a bit on the 
  //claimsMask account.  The index represents the bit number in a pure left to right fashion
  //thus 0 is the MSB of the first byte, and 7 is the LSB of the first byte
  //instead of pulling all 31k bytes of claimsMask down, we just pull the byte that contains the bit
  //that we are interested in. Note the "8+" below represents the anchor account discriminator
  const byteOffset = 8 + Math.floor(claimIndex / 8);
  //grab a single byte from the claim mask account's data
  const res = await connection._rpcRequest('getAccountInfo', 
    [
      claimsMaskPubkey.toString(),
      {
        encoding: 'base64',
        commitment: 'processed',
        dataSlice: { offset: byteOffset, length: 1 }
      }
    ]
  );
  //note, no error handling for acct not found - blindly going after data - which should be exactly 1 byte
  const buf = Buffer.from(res.result.value.data[0], 'base64');
  //now we create a mask for the bit of this byte we are going to check, converting from 0=LSB to 0=MSB (hence 7 - X)
  //0 becomes 128 (the MSB or leftmost bit), 7 becomes 1 (the LSB or rightmost bit)
  const byteMask = 1 << 7 - claimIndex % 8;
  //check the interesting bit of the byte
  return (buf[0] & byteMask) > 0;
}