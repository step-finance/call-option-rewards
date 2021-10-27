//import { u64 } from "@saberhq/token-utils";
import { u64 } from "https://esm.sh/@saberhq/token-utils?dev&no-check";
//import type { PublicKey } from "@solana/web3.js";
import { PublicKey } from "https://esm.sh/@solana/web3.js?dev&no-check";
//import type BN from "bn.js";
import BN from "https://esm.sh/v53/bn.js@5.2.0/es2021/bn.development.js";
//import { keccak_256 } from "js-sha3";
import { createHash } from "https://deno.land/std/hash/mod.ts";

import { Buffer } from "https://deno.land/std@0.76.0/node/buffer.ts";

import { MerkleTree } from "./merkle-tree.ts";

export class BalanceTree {
  private readonly tree: MerkleTree;
  constructor(balances: { account: any /*PublicKey*/; amount: any /*BN*/ }[]) {
    this.tree = new MerkleTree(
      balances.map(({ account, amount }, index) => {
        return BalanceTree.toNode(index, account, amount);
      })
    );
  }

  public static verifyProof(
    index: number,
    account: any, //PublicKey
    amount: any, //BN
    proof: Buffer[],
    root: Buffer,
  ): boolean {
    let pair = BalanceTree.toNode(index, account, amount);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  // keccak256(abi.encode(index, account, amount))
  public static toNode(index: number, account: any /*PublicKey*/, amount: any /*BN*/): Buffer {
    const buf = Buffer.concat([
      new u64(index).toArrayLike(Buffer, "le", 8),
      account.toBuffer(),
      new u64(amount).toArrayLike(Buffer, "le", 8),
    ]);
    return Buffer.from(createHash('keccak256').update(buf).digest());
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  public getHexProof(index: number, account: any /*PublicKey*/, amount: any /*BN*/): string[] {
    return this.tree.getHexProof(BalanceTree.toNode(index, account, amount));
  }

  public getRoot(): Buffer {
    return this.tree.getRoot();
  }

  public getProof(index: number, account: any /*PublicKey*/, amount: any /*BN*/): Buffer[] {
    return this.tree.getProof(BalanceTree.toNode(index, account, amount));
  }
}
