import "https://deno.land/x/xhr@0.1.0/mod.ts";
import "https://deno.land/std@0.110.0/io/mod.ts";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js?no-check";

export async function* getTransactionHistory(con: InstanceType<typeof Connection>, pubkey: InstanceType<typeof PublicKey>, pageSize: number = 1000) {
    let page = 1;
    let txs: any;
    let last;
    do {
        txs = await con.getConfirmedSignaturesForAddress2(pubkey, { before: last, limit: pageSize });
        console.log('history for', pubkey.toString(), 'page', page++);
        for (const tx of txs) {
            last = tx.signature;
            yield tx;
        }
    } while (txs.length == pageSize); //if our results were the size of the page, get the next page
    console.log('history for', pubkey.toString(), 'ended');
}

