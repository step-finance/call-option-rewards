import { Buffer } from "https://deno.land/std@0.76.0/node/buffer.ts";

import { Program, Provider, Wallet, web3 } from "../anchor-esm-fix/anchor-dev.js";

const TOKEN_PROGRAM_ID = new web3.PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const ASSOCIATED_TOKEN_PROGRAM_ID = new web3.PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);

export async function createDistributor(data: CreateDistributorData, opt: CreateDistributorOptions) {
    const program = new Program(
        opt.idl,
        opt.programId,
        new Provider(opt.connection, new Wallet(opt.keypair), {
            preflightCommitment: "confirmed",
            commitment: "confirmed",
          })
    );

    const [tokenATA] = await web3.PublicKey.findProgramAddress(
        [
            program.provider.wallet.publicKey.toBuffer(), 
            TOKEN_PROGRAM_ID.toBuffer(), 
            data.rewardMintPubkey.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const buff = new ArrayBuffer(2);
    const view = new DataView(buff);
    view.setInt16(0, data.index, true);
    const [distAddress, distBump] = await web3.PublicKey.findProgramAddress(
      [
        program.provider.wallet.publicKey.toBuffer(),
        data.rewardMintPubkey.toBuffer(),
        buff
      ],
      program.programId,
    )

    const [distVault] = await web3.PublicKey.findProgramAddress(
      [
        (distAddress as any).toBuffer(),
        Buffer.from("reward", "utf-8"),
      ],
      program.programId,
    )

    const [distPriceVault] = await web3.PublicKey.findProgramAddress(
      [
        (distAddress as any).toBuffer(),
        Buffer.from("price", "utf-8"),
      ],
      program.programId,
    )

    const claimsBitmaskAccountKey = web3.Keypair.generate();

    console.log("Will create distributor", distAddress.toString());
    console.log("Claims bitmask", claimsBitmaskAccountKey.publicKey.toString());
    console.log("Reward mint", data.rewardMintPubkey.toString());
    console.log("Price mint", data.priceMintPubkey.toString());
    console.log("Vault", distVault.toString());
    console.log("Price vault", distPriceVault.toString());
    console.log("From", tokenATA.toString());

    await (program.rpc as any).newDistributor(
      data.index, 
      distBump,
      data.dataLocation,
      data.merkleRoot,
      data.strikePrice,
      data.expiry,
      data.totalAmount,
      data.totalCount,
      {
        accounts: {
          writer: program.provider.wallet.publicKey,
          rewardMint: data.rewardMintPubkey,
          priceMint: data.priceMintPubkey,
          distributor: distAddress,
          payer: program.provider.wallet.publicKey,
          fromAuthority: program.provider.wallet.publicKey,
          from: tokenATA,
          rewardVault: distVault,
          priceVault: distPriceVault,
          rent: web3.SYSVAR_RENT_PUBKEY,
          systemProgram: (web3.SystemProgram as any).programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          claimsBitmaskAccount: claimsBitmaskAccountKey.publicKey,
        },
        instructions: [
          await (program.account as any).callOptionDistributorClaimsMask.createInstruction(
            claimsBitmaskAccountKey
          )
        ],
        signers: [claimsBitmaskAccountKey],
      }
    );

    return distAddress;
}

export class CreateDistributorData {
    index: any;
    merkleRoot: any;
    expiry: any;
    dataLocation: any;
    strikePrice: any;
    totalAmount: any;
    totalCount: any;
    priceMintPubkey: any;
    rewardMintPubkey: any;
}

export class CreateDistributorOptions {
    connection: any;
    keypair: any;
    programId: any;
    idl: any;
}
