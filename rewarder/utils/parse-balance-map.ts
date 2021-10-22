//import { u64 } from "@solana/spl-token";
import { u64 } from "https://esm.sh/@saberhq/token-utils?dev&no-check";
//import { PublicKey } from "@solana/web3.js";
import { PublicKey } from "https://esm.sh/@solana/web3.js?dev&no-check";
//import BN from "bn.js";
import BN from "https://esm.sh/v53/bn.js@5.2.0/es2021/bn.development.js";

import { Buffer } from "https://deno.land/std@0.76.0/node/buffer.ts";

import { BalanceTree } from "./balance-tree.ts";

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
// Anyone can verify that all air drops are included in the tree,
// and the tree has no additional distributions.
export interface MerkleDistributorInfo {
  merkleRoot: Buffer;
  tokenTotal: string;
  claims: {
    [account: string]: {
      index: number;
      amount: typeof u64;
      proof: Buffer[]; 
    };
  };
}

export type NewFormat = { pubkey: string; amount: string };

export function parseBalanceMap(balances: NewFormat[]): MerkleDistributorInfo {
  const dataByAddress = balances.reduce<{
    [address: string]: {
      amount: typeof BN;
      flags?: { [flag: string]: boolean };
    };
  }>((memo, { pubkey: account, amount }) => {
    if (memo[account.toString()]) {
      throw new Error(`Duplicate address: ${account.toString()}`);
    }
    const parsedNum = new u64(amount);
    if (parsedNum.lte(new u64(0))) {
      throw new Error(`Invalid amount for account: ${account.toString()}`);
    }

    memo[account.toString()] = {
      amount: parsedNum,
    };
    return memo;
  }, {});

  const sortedAddresses = Object.keys(dataByAddress).sort();

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => {
      const addressData = dataByAddress[address];
      return {
        account: new PublicKey(address),
        amount: addressData.amount,
      };
    })
  );

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: {
      amount: typeof u64;
      index: number;
      proof: Buffer[];
      flags?: { [flag: string]: boolean };
    };
  }>((memo, address, index) => {
    const addressData = dataByAddress[address];
    const { amount, flags } = addressData;
    memo[address] = {
      index,
      amount: amount,
      proof: tree.getProof(index, new PublicKey(address), amount),
      ...(flags ? { flags } : {}),
    };
    return memo;
  }, {});

  const tokenTotal: typeof BN = sortedAddresses.reduce(
    (memo, key) => memo.add(dataByAddress[key]?.amount ?? new BN(0)),
    new BN(0)
  );

  return {
    merkleRoot: tree.getRoot(),
    tokenTotal: tokenTotal.toString(),
    claims,
  };
}
