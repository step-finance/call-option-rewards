
import BN from "https://esm.sh/v53/bn.js@5.2.0/es2021/bn.development.js";

import { getTransactionHistory, getParsedConfirmedTransactions } from "./txHistory.ts";
import { PayerAmount } from "./classes.ts";
import { asyncFilter, asyncMap, asyncUntil, asyncBatches, asyncFlat, asyncReduce } from "./asycIter.ts";



const U64_MAX = new BN("18446744073709551615", 10);

export async function getTokensAndPrice(con: any, poolDetail: any, stepMint: any) {
    const poolStepTokenAccount = poolDetail.mintA.toString() == stepMint ? poolDetail.tokenAccountA 
        : poolDetail.mintB.toString() == stepMint ? poolDetail.tokenAccountB
        : null;
    if (poolStepTokenAccount == null)
        throw "pool does not have a step side";
    const lpTokenMint = poolDetail.mintPool;
    const feeAccount = poolDetail.feeAccount;
    const res = await Promise.all([
        con.getTokenAccountBalance(poolStepTokenAccount),
        con.getTokenSupply(lpTokenMint),
    ]);
    const balance = new BN(res[0].value.amount, 10);
    const supply = new BN(res[1].value.amount, 10);
    const stepMultiplier = res[0].value.amount == '0' || res[1].value.amount == '0'
        ? new BN("0", 10)
        : balance.mul(U64_MAX).div(supply);
    return {
        pool: poolDetail.pubkey,
        nonStepMint: poolDetail.mintA.toString() == stepMint ? poolDetail.mintB : poolDetail.mintA,
        poolStep: poolStepTokenAccount,
        feeAccount: feeAccount,
        stepMultiplier: stepMultiplier,
    };
}

//takes Connection and Pubkey
export function getPayerSums(con: any, start: any, end: any, tokensAndPrice: any, swapProgram: any): Promise<PayerAmount[]> {
    //our token account, to reference later in loop
    const stepMultiplier = tokensAndPrice.stepMultiplier;
    const poolPubkey = tokensAndPrice.pool.toString();
    const nonStepMint = tokensAndPrice.nonStepMint.toString();
    const tokenAccount = tokensAndPrice.feeAccount;
    const tokenAccountPubkey = tokenAccount.toString();

    //const stepPerToken = await calculateStepPerLPToken(con, tokenAccount)

    //an iterator of ALL transactions over this token account
    let iter = getTransactionHistory(con, tokenAccount);
    //filter by our timestamp
    iter = asyncFilter(iter, (a: any) => a.blockTime < end);
    iter = asyncUntil(iter, (a: any) => a.blockTime < start);
    //just the sig
    iter = asyncMap(iter, (a: any) => a.signature);
    //in batches of 100 (this becomes iter<iter<t>>)
    iter = asyncBatches(iter, 100);
    //get tx details for a batch at a time
    iter = asyncMap(iter, (a: any) => getParsedConfirmedTransactions(con, a));
    //flatten batches (iter<iter<t>> back to iter<t>)
    iter = asyncFlat(iter);
    //no tx errors
    iter = asyncFilter(iter, (a: any) => !a.meta.err);
    //swap program filter
    iter = asyncFilter(iter, (a: any) => isSwap(a, swapProgram));
    //find payer of tx, and the amount of LP token paid to fee account
    iter = asyncMap(iter, (tx: any) => getPayerAndAmount(tx, poolPubkey, nonStepMint, tokenAccountPubkey, stepMultiplier, swapProgram));
    //clear out the nulls (null from getPayerAndAmount if no mintto found)
    iter = asyncFilter(iter, (a: any) => a != null);
    //reduce to a map of payer to amounts by payer
    const reduce = asyncReduce(iter, payerIntoMap, new Map<string, PayerAmount>()); 
    //this is a promise, not a value yet.
    const r = reduce.then(a => {
        //we really want an array after this, so this is just a toarray impl
        const ret = [];
        for (const aa of a.values()) {
            ret.push(aa);
        }
        return ret;
    });
    return r;
}

function isSwap(tx: any, swapProgram: any) {
    return tx.transaction.message.instructions.some((b: any) => b.programId.toString() == swapProgram);
}

function getPayerAndAmount(tx: any, poolPubkey: string, nonStepMint: string, tokenAccountPubkey: string, stepMultiplier: any /*BN*/, swapProgram: any) : PayerAmount | null {
    //grab the insrtuction indexes for any step swap
    const swapIndexes = new Set(tx.transaction.message.instructions
        .map((a: any, i: number)=>[a,i]) //carry the index
        .filter((a: any) => a[0].programId.toString() == swapProgram) //filter
        .map((a: any) => a[1])); //pop out the tx
    //find token mintTo instructions minting to our fee account on inner instructions 
    // of step swap and add up the amounts
    let amtMinted = tx.meta.innerInstructions
        .filter((a: any) => swapIndexes.has(a.index))
        .map((a: any) => a.instructions)
        .flat()
        .filter((a: any) => 
            a.program == 'spl-token' 
            && a.parsed.type == 'mintTo' 
            && a.parsed.info.account == tokenAccountPubkey)
        .map((a: any) => new BN(a.parsed.info.amount, 10));
    
    if (amtMinted.length == 0)
        return null;

    amtMinted = amtMinted.reduce((a: any, b: any) => {
            a.add(b), new BN(0, 10);
        });

    const payer = tx.transaction.message.accountKeys[0].pubkey.toString();
    return new PayerAmount(poolPubkey, nonStepMint, tokenAccountPubkey, payer, amtMinted, stepMultiplier);
}

function payerIntoMap(map: Map<string, PayerAmount>, payer: PayerAmount) {
    let p = map.get(payer.payer);
    if (!p) { //if didn't exist, add
        p = payer;
        map.set(payer.payer, p);
    } else { //if existed, add amount
        p.amount = p.amount.add(payer.amount);
    }
    return map;
}