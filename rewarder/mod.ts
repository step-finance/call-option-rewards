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
 * --amt
 *      The amount of STEP call options to distribute
 * --start
 *      The unix timestamp (in seconds) for the end of the rewards period; inclusive (default 1 week ago)
 * --end
 *      The unix timestamp (in seconds) for the end of the rewards period; exclusive (default now)
 */


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import "https://deno.land/std@0.110.0/io/mod.ts";
import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts";

import BN from "https://esm.sh/v53/bn.js@5.2.0/es2021/bn.development.js";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js?dev&no-check";

//import MerkleDistributor from "https://esm.sh/@saberhq/merkle-distributor?dev&no-check";
import { parseBalanceMap } from "./utils/parse-balance-map.ts";

import { getPools } from "./stepSwap.ts";
import { getTokensAndPrice, getPayerSums } from "./payerParsing.ts";
import { PayerAmount, PoolFeesPaid, PoolFeePayer } from "./classes.ts";
import { asyncFilter, asyncMap, asyncUntil, asyncToArray } from "./asycIter.ts";

const SWAP_PROGRAM = 'SSwpMgqNDsyV7mAgN9ady4bDVu5ySjmmXejXvy2vLt1';
const POOL_REGISTRY_OWNER = 'GkT2mRSujbydLUmA178ykHe7hZtaUpkmX2sfwS8suWb3'
const STEP_MINT = 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT'

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
//cli date args, default now and 1 week prior
const end = args['end'] ?? Math.floor(Date.now() / 1000);
const weekAgoDate = new Date(end * 1000);
weekAgoDate.setDate(weekAgoDate.getDate() - 7);
const start = args['start'] ?? Math.floor(weekAgoDate.getTime() / 1000);
console.log('Using start date', new Date(start * 1000).toUTCString());
console.log('Using end date', new Date(end * 1000).toUTCString());

const amountString = args['amt'] ?? '1_000_000_000';
const amountToWriteFor = new BN(amountString, 10);

//connection
const con = new Connection(nodeUrl, {
    commitment: 'finalized',
    httpHeaders: headers,
});

//connection test
const test = await con.getGenesisHash();
console.log('connection test; genisis blockhash is', test);

//get all the pools and their value in step (technically exactly half the full value, but we're ultimately dealing in ratios anyhow)
let iter: any = getPools(con, new PublicKey(POOL_REGISTRY_OWNER), new PublicKey(SWAP_PROGRAM));
iter = asyncMap(iter, (a: any) => getTokensAndPrice(con, a, STEP_MINT));
iter = asyncFilter(iter, (a: any) => a.stepMultiplier.toString() != '0');

//TESTING ONLY
//test, limit results
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

//for each pool, build a summary PoolFeesPaid containing PoolFeePayers
const poolFeesPaid: PoolFeesPaid[] = [];
for (const poolResult of results) {
    if (poolResult.length == 0)
        continue;
    const total = poolResult.reduce((prev: any, cur: any) => prev.add(cur.stepAmount), new BN(0, 10));
    const pool = new PoolFeesPaid(poolResult[0].pool, poolResult[0].nonStepMint, total.toString());
    for (const payerResult of poolResult) {
        pool.addPayer(payerResult.payer, payerResult.stepAmount);
    }
    poolFeesPaid.push(pool);
}

//for reference
console.log("Writing pool-fees-paid for", poolFeesPaid.length, "pools");
await Deno.writeTextFile("output/pool-fees-paid.json", JSON.stringify(poolFeesPaid, null, 2));

//now need to aggregate all payers across all pools; we reuse the PoolFeePayer object
const payerTotals = poolFeesPaid.map((a: any) => a.payers).flat().reduce((prev: any, cur: any) => {
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

//create merkle tree
const { claims, merkleRoot, tokenTotal } = parseBalanceMap(finalPayerTotals);

//create the structure for storing on arweave
const claimsInfo = Object.entries(claims).map(([authority, claim]) => {
    const claimA: any = claim;
    return {
        [authority]: {
            index: claimA.index,
            amount: claimA.amount.toString(),
            proof: claimA.proof.map((proof: any) => proof.toString("hex")),
        }
    }
  });

  console.log("Writing claims");
  await Deno.writeTextFile("output/claims.json", JSON.stringify(claimsInfo, null, 2));

console.log("Done");
Deno.exit();


