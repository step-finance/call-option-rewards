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
 * --fee
 *      The fee address to query for fees paid
 * 
 */


import "https://deno.land/x/xhr@0.1.0/mod.ts";
import "https://deno.land/std@0.110.0/io/mod.ts";
import { parse } from "https://deno.land/std@0.110.0/flags/mod.ts";
import { Connection, PublicKey } from 'https://cdn.skypack.dev/@solana/web3.js';

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
const feeAddress = new PublicKey(args['fee'] ?? '5Cebzty8iwgAUx9jyfZVAT2iMvXBECLwEVgT6T8KYmvS');
console.log('Using fee address', feeAddress.toString());

//connection
const con = new Connection(nodeUrl, {
    commitment: 'confirmed',
    httpHeaders: headers,
});

//connection test
const test = await con.getGenesisHash();
console.log('connection test; blockhash is', test);

//DO STUFF
const tokenAccounts = await con.getTokenAccountsByOwner(feeAddress);
console.log('Fetched', tokenAccounts, 'token accounts');
