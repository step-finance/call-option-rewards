import { Buffer } from "https://esm.sh/v53/node_buffer.js";
import assert from "https://esm.sh/v53/assert@2.0.0/es2021/assert.development.js";
import BN from "https://esm.sh/v53/bn.js@5.2.0/es2021/bn.development.js";
import {
  Blob,
  blob,
  seq,
  struct,
  u32,
  u8,
} from "https://esm.sh/v53/buffer-layout@1.2.2/es2021/buffer-layout.development.js";

import {
  Connection,
  PublicKey,
} from "https://esm.sh/@solana/web3.js?dev&no-check";

import { asyncFilter, asyncMap, asyncUntil, asyncBatches, asyncFlat, asyncReduce } from "./asycIter.ts";

const publicKey = (property = "publicKey") => {
  return blob(32, property);
};

const uint64 = (property = "uint64") => {
  return blob(8, property);
};

const PublicKeyLayout = class extends Blob {
  constructor(property: any) {
    super(32, property);
  }
  decode(b: any, offset2: any) {
    return new PublicKey(super.decode(b, offset2));
  }
  encode(src: any, b: any, offset2: any) {
    return super.encode(src.toBuffer(), b, offset2);
  }
};

function publicKeyLayout(property = "") {
  return new PublicKeyLayout(property);
}

const PoolRegistryLayout = struct([
  u8("isInitialized"),
  u32("registrySize"),
  seq(publicKeyLayout(), 2 * 1024 * 1024 / 32 - 1, "accounts"),
]);

export const TokenSwapLayout = struct([
  u8("version"),
  u8("isInitialized"),
  u8("nonce"),
  publicKey("tokenProgramId"),
  publicKey("tokenAccountA"),
  publicKey("tokenAccountB"),
  publicKey("tokenPool"),
  publicKey("mintA"),
  publicKey("mintB"),
  publicKey("feeAccount"),
  uint64("tradeFeeNumerator"),
  uint64("tradeFeeDenominator"),
  uint64("ownerTradeFeeNumerator"),
  uint64("ownerTradeFeeDenominator"),
  uint64("ownerWithdrawFeeNumerator"),
  uint64("ownerWithdrawFeeDenominator"),
  u8("curveType"),
  blob(32, "curveParameters"),
  u8("poolNonce"),
]);

async function loadPoolRegistry(
  connection: InstanceType<typeof Connection>,
  registryOwner: InstanceType<typeof PublicKey>,
  swapProgramId: InstanceType<typeof PublicKey>,
): Promise<any> {
  const poolRegistryKey = await PublicKey.createWithSeed(
    registryOwner,
    "poolregistry",
    swapProgramId,
  );
  const acc = await connection.getAccountInfo(poolRegistryKey);
  if (!acc) {
    return undefined;
  }

  const decoded = PoolRegistryLayout.decode(acc.data);
  return {
    isInitialized: decoded.isInitialized,
    registrySize: decoded.registrySize,
    accounts: decoded.accounts.slice(0, decoded.registrySize)
  };
}

export async function* getPools(
    con: InstanceType<typeof Connection>,
    registryOwner: InstanceType<typeof PublicKey>,
    swapProgramId: InstanceType<typeof PublicKey>
    ) {
    const pr: any = await loadPoolRegistry(con, registryOwner, swapProgramId);
    for (const p of pr.accounts) {
        let a = await con.getAccountInfo(p)
        const decoded = TokenSwapLayout.decode(a.data);
        yield {
            pubkey: p,
            mintPool: new PublicKey(decoded.tokenPool),
            mintA: new PublicKey(decoded.mintA),
            mintB: new PublicKey(decoded.mintB),
            tokenAccountA: new PublicKey(decoded.tokenAccountA),
            tokenAccountB: new PublicKey(decoded.tokenAccountB),
            feeAccount: new PublicKey(decoded.feeAccount),
        };
    }
}
