/**
 * 
 * The rewarder program as described here https://dana-hanna.gitbook.io/smart-contracts/#create-a-reward-account.
 * Built for Step Finance rewarding to users of swaps.
 * 
 * This program searches for fees paid in LP tokens to a fee address and generates a merkle root, json, etc as described above
 * TODO detail functionality here
 * 
 * USAGE:
 * 
 * --url
 *      The url to the rpc node. Default https://api.mainnet-beta.solana.com/.
 * --user
 *      A user to authenticate (basic auth) to the node. Default no authentication.
 * --pass
 *      The password to use to authenticate. Must be used in coordication with --user. Default no authentication.
 * --url-anchor
 *      The url to the rpc node for use with anchor (when writing). Default same as url.
 * --amt
 *      The amount of STEP call options to distribute. (default 1_000_000_000)
 * --price
 *      The strike price in USDC per 1e<mint decimals>. (value of 1_000_000 would mean $1 = 1 token)
 * --expiry
 *      The unix timestamp (in seconds) for the expiry of the call option. (default end + 1 week)
 * --start
 *      The unix timestamp (in seconds) for the end of the rewards period; inclusive (default 1 week ago)
 * --end
 *      The unix timestamp (in seconds) for the end of the rewards period; exclusive (default now)
 * --index
 *      The unique identifier number for this contract on the solana chain (key is [writer, mint, index]). Required when writing to solana.
 * ---resume
 *      A pool-fees-paid.json file from a prior run to resume using.
 * --testing-limit
 *      The number of pools to include. (default all)
 * --key
 *      The path to a keypair to use for writing to the solana chain. (default empty; no onchain creation)
 * --arkey
 *      The path to an arweave keypair to use for writing to the arweave chain. (default empty; no onchain creation)
 */


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import "https://deno.land/std@0.110.0/io/mod.ts";
import { Buffer } from "https://deno.land/std@0.76.0/node/buffer.ts";
import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts";

import BN from "https://esm.sh/v54/bn.js@5.2.0/es2021/bn.development.js";
import { web3 } from "./anchor-esm-fix/anchor-dev.js";;

import { parseBalanceMap } from "./utils/parse-balance-map.ts";
import { BalanceTree } from "./utils/balance-tree.ts"; //for test verification

import { getPools } from "./stepSwap.ts";
import { getTokensAndPrice, getPayerSums } from "./payerParsing.ts";
import { PayerAmount, PoolFeesPaid, PoolFeePayer } from "./classes.ts";
import { asyncFilter, asyncMap, asyncUntil, asyncToArray } from "./asycIter.ts";
import { createDistributor, CreateDistributorOptions, CreateDistributorData } from "./anchor-wrapper/index.ts";
import { uploadToArweave, testArkbInstalled } from "./arweave/index.ts";

const CALL_OPTIONS_PROGRAM = 'otstoZivsnAdKfcwbPY5NDfSiBxyHHu5U48pHgnXErE';
const SWAP_PROGRAM = 'SSwpMgqNDsyV7mAgN9ady4bDVu5ySjmmXejXvy2vLt1';
const POOL_REGISTRY_OWNER = 'GkT2mRSujbydLUmA178ykHe7hZtaUpkmX2sfwS8suWb3'
const STEP_MINT = 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT'
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const USDC_MINT_TEST = 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp'

//SETUP

//parse cli args
const args = parse(Deno.args);
const nodeUrl = args['url'] ?? 'https://api.mainnet-beta.solana.com/';
console.log('Using rpc node', nodeUrl);
let headers = {};
if (args['user'] && args['pass']) {
    console.log('Authenticating to rpc node as user', args['user']);
    headers = {
        Authorization: 'Basic ' + btoa(args['user']+':'+args['pass'])
    };
}

const anchorNodeUrl = args['url-anchor'] ?? nodeUrl;
console.log('Anchor using rpc node', anchorNodeUrl);

const rewardMint = args['reward-mint'] ?? STEP_MINT;
console.log('Using reward mint', rewardMint);
const priceMint = args['price-mint'] == 'usdc-test' ? USDC_MINT_TEST : args['price-mint'] ?? USDC_MINT;
console.log('Using price mint', priceMint);

//cli date args, default now and 1 week prior
const end = args['end'] ?? Math.floor(Date.now() / 1000);

const weekAgoDate = new Date(end * 1000);
weekAgoDate.setDate(weekAgoDate.getDate() - 7);
const start = args['start'] ?? Math.floor(weekAgoDate.getTime() / 1000);

const weekAfterEnd = new Date();
weekAfterEnd.setDate(new Date(end * 1000).getDate() + 7);
const expiry = args['expiry'] ?? Math.floor(weekAfterEnd.getTime() / 1000);

console.log('Using start date', new Date(start * 1000).toUTCString());
console.log('Using end date', new Date(end * 1000).toUTCString());
console.log('Using expiry date', new Date(expiry * 1000).toUTCString());

const amountString = args['amt'] ?? 1_000_000_000;
const amountToWriteFor = new BN(amountString, 10);
console.log('Writing for amount', amountString);

const strikePriceString = args['price'] ?? 1_000_000;
const strikePrice = new BN(strikePriceString, 10);
console.log('Strike price', strikePriceString);

const resumeFile = args['resume'];
let resume;
if (resumeFile) {
    resume = JSON.parse(await Deno.readTextFile(resumeFile));
    console.log('Will resume using', resumeFile);
}

const indexArg = args['index'];
const index = parseInt(indexArg);

const kpFile = args['key'];
let kp;
let idlText;
if (kpFile) {
    if (!index) {
        throw "--index is required when creating a Solana distributor";
    }

    const text = await Deno.readTextFile(kpFile);
    const byteArray = JSON.parse(text);
    const buf = Buffer.from(byteArray);
    kp = web3.Keypair.fromSecretKey(buf);
    console.log('will use private key to create onchain distribution')
    
    try {
        //try reading this now to hit any error that might happen later
        idlText = await Deno.readTextFile('../anchor-bpf/target/idl/merkle_call_options.json');
    } catch (e) {
        console.error("The IDL for the anchor program must exist. Run anchor build in the anchor-bpf folder.")
    }
} else {
    console.log('no solana key provided, running for local output only')
}

const arkpFile = args['arkey'];
if (arkpFile) {
    testArkbInstalled();
    console.log('will use private key to create arweave file')
} else {
    console.log('no arweave key provided, running for local output only')
}

//connection
const con = new web3.Connection(nodeUrl, {
    commitment: 'finalized',
    httpHeaders: headers,
});

//connection test
const test = await con.getGenesisHash();
console.log('connection test; genisis blockhash is', test);


//LOAD

let poolFeesPaid: PoolFeesPaid[];
if (resume) {
    poolFeesPaid = resume;
} else {
    poolFeesPaid = [];

    console.log("Looking up all pool token prices");

    //get all the pools and their value in step (technically exactly half the full value, but we're ultimately dealing in ratios anyhow)
    let iter: any = getPools(con, new web3.PublicKey(POOL_REGISTRY_OWNER), new web3.PublicKey(SWAP_PROGRAM));
    iter = asyncMap(iter, (a: any) => getTokensAndPrice(con, a, STEP_MINT));
    iter = asyncFilter(iter, (a: any) => a.stepMultiplier.toString() != '0');

    //if testing, limit results
    let limit = parseInt(args['testing-limit'] ?? '9999999999999');
    iter = asyncUntil(iter, a => limit-- == 0);

    //put into an array, do not lazy iterate this
    const tokensAndPrices: any = await asyncToArray(iter);

    //one big array of reduction promises
    const promises: Promise<PayerAmount[]>[] = 
        tokensAndPrices.map((tokensAndPrice: any) => getPayerSums(con, start, end, tokensAndPrice, SWAP_PROGRAM));

    console.log("Hard at work");

    //can change this to iterate one at a time if errors from rpc node due to hitting with all at once
    const results = await Promise.all(promises);

    const zero = new BN(0);
    //for each pool, build a summary PoolFeesPaid containing PoolFeePayers
    for (const poolResult of results) {
        if (poolResult.length == 0)
            continue;
        const total = poolResult.reduce((prev: any, cur: any) => prev.add(cur.stepAmount), new BN(0, 10));
        const pool = new PoolFeesPaid(poolResult[0].pool, poolResult[0].nonStepMint, total.toString());
        for (const payerResult of poolResult) {
            if (payerResult.stepAmount.gt(zero)) {
                pool.addPayer(payerResult.payer, payerResult.stepAmount);
            }
        }
        poolFeesPaid.push(pool);
    }

    //for reference
    console.log("Writing pool-fees-paid for", poolFeesPaid.length, "pools");
    await Deno.writeTextFile("output/pool-fees-paid.json", JSON.stringify(poolFeesPaid, null, 2));
}

//now need to aggregate all payers across all pools; we reuse the PoolFeePayer object
const payerTotals = poolFeesPaid.map(a => a.payers).flat().filter(a=>a.percentage > 0).reduce((prev: any, cur: any) => {
        const pp = prev.get(cur.pubkey);
        if (!pp) {
            prev.set(cur.pubkey, new PoolFeePayer(cur.pubkey, cur.amount, 0));
        } else {
            pp.amount = new BN(pp.amount, 10).add(new BN(cur.amount, 10)).toString();
        }
        return prev;
    }, 
    new Map()
);

//go back and create the final output with amount to write 
// based on ratio of amount to write / total fees 
const grandTotalBN = poolFeesPaid.reduce(
    (prev: any, cur: any) => prev.add(new BN(cur.feesPaid, 10)), 
    new BN(0, 10));
const grandTotal = parseInt(grandTotalBN.toString());

const finalPayerTotals = [];
for (const [_k, p] of payerTotals) {
    const item = new PoolFeePayer (
        p.pubkey,
        new BN(p.amount, 10) 
            .mul(amountToWriteFor)
            .div(grandTotalBN)
            .toString(),
        parseInt(p.amount) / grandTotal * 100
    );
    finalPayerTotals.push(item);
}

//sanity check
const amountWriting = parseInt(finalPayerTotals.reduce((prev: any, cur: any) => prev + parseInt(cur.amount), 0).toString());
console.log('Amount requested to write for:', amountToWriteFor.toString());
console.log('Amount written:', amountWriting);
if (amountWriting > parseInt(amountToWriteFor.toString()))
    throw "writing too much?!";

const output = {
    grandTotal: grandTotal,
    payerTotals: finalPayerTotals,
};

console.log("Writing all-payers");
await Deno.writeTextFile("output/all-payers.json", JSON.stringify(output, null, 2));


//MERKLE

//create merkle tree
const { claims, merkleRoot, tokenTotal } = parseBalanceMap(finalPayerTotals);

//create the structure for storing on arweave
const claimsInfo = Object.entries(claims).reduce(
    (prev, [authority, claim]) => {
        const claimA: any = claim;
        prev[authority] = {
            index: claimA.index,
            amount: claimA.amount.toString(),
            proof: claimA.proof.map((proof: any) => proof.toString("base64")),
        };
        return prev;
    }, 
    {} as any,
);

console.log("merkle root:", merkleRoot.toString("base64"));
console.log("token total:", tokenTotal);




/*
//test
const claim = claims['DrWW4z9awhp6gg1gk3jPHqG68toDwxWjhiUmiZZ62gMh'];
const ok = BalanceTree.verifyProof(
    claim.index,
    new web3.PublicKey('DrWW4z9awhp6gg1gk3jPHqG68toDwxWjhiUmiZZ62gMh'),
    claim.amount,
    claim.proof,
    merkleRoot
);
console.log('verify', ok);
*/




console.log("Writing claims");
const claimsInfoString = JSON.stringify(claimsInfo, null, 2)
await Deno.writeTextFile("output/claims.json", claimsInfoString);


//ARWEAVE

let dataLocation = 'unknown';
if (arkpFile) {
    console.log("Writing contract detail and proofs to arweave");
    try {
        dataLocation = await uploadToArweave(arkpFile, "./output/claims.json");
    } catch (e) {
        console.error(e);
        throw "Error from arkb execution. Do you have arkb installed? Is the AR wallet valid?"
    }
    if (!dataLocation || dataLocation.trim().length == 0) {
        throw "Arweave failed uploading - check the log in ouput/arweave.log";
    }
}


//ANCHOR CALL

if (kp) {
    console.log("Writing contract account to chain");

    const idl = JSON.parse(idlText as string);
    const dist = await createDistributor(
        {
            rewardMintPubkey: new web3.PublicKey(rewardMint),
            priceMintPubkey: new web3.PublicKey(priceMint),
            index: index,
            merkleRoot: merkleRoot,
            expiry: new BN(expiry, 10),
            dataLocation: dataLocation,
            strikePrice: new BN(strikePrice, 10),
            totalAmount: amountToWriteFor,
            totalCount: finalPayerTotals.length,
        } as CreateDistributorData,
        {
            connection: new web3.Connection(anchorNodeUrl, 'confirmed'),
            keypair: kp,
            programId: CALL_OPTIONS_PROGRAM,
            idl: idl,
        } as CreateDistributorOptions
    );
    console.log("Created distributor", dist.toString());
}

console.log("Done");
Deno.exit();


