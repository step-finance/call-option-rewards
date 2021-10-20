


/**
 * 
 * Copied from https://cdn.esm.sh/v54/@project-serum/anchor@0.17.0/deno/anchor.development.js
 * lines 16 and 17 commented out below
 *  
 */





/* esm.sh - esbuild bundle(@project-serum/anchor@0.17.0) deno development */
//import __process$ from "/v54/node_process.js";
//__process$.env.NODE_ENV="development";
import { Buffer as __Buffer$ } from "https://cdn.esm.sh/v54/node_buffer.js";
import __util$ from "https://cdn.esm.sh/v54/util@0.12.4/deno/util.development.js";
import __path$ from "https://cdn.esm.sh/v54/deno_std_node_path.js";
import __fs$ from "https://cdn.esm.sh/v54/deno_std_node_fs.js";
import __process$ from "https://cdn.esm.sh/v54/process@0.11.10/deno/browser.development.js";
var __defProp = Object.defineProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __require = (x) => {
  if (typeof require !== "undefined")
    return require(x);
  throw new Error('Dynamic require of "' + x + '" is not supported');
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/index.js
import { default as default2 } from "https://cdn.esm.sh/v54/bn.js@5.2.0/deno/bn.development.js";
import * as web3_1 from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/provider.js
import { Connection, Keypair, sendAndConfirmRawTransaction } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/common.js
var _a;
var isBrowser = typeof window !== "undefined" && !((_a = window.process) === null || _a === void 0 ? void 0 : _a.hasOwnProperty("type"));
function chunks(array2, size) {
  return Array.apply(0, new Array(Math.ceil(array2.length / size))).map((_, index) => array2.slice(index * size, (index + 1) * size));
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/provider.js
var Provider = class {
  constructor(connection, wallet, opts) {
    this.connection = connection;
    this.wallet = wallet;
    this.opts = opts;
  }
  static defaultOptions() {
    return {
      preflightCommitment: "recent",
      commitment: "recent"
    };
  }
  static local(url, opts) {
    opts = opts !== null && opts !== void 0 ? opts : Provider.defaultOptions();
    const connection = new Connection(url !== null && url !== void 0 ? url : "http://localhost:8899", opts.preflightCommitment);
    const wallet = NodeWallet.local();
    return new Provider(connection, wallet, opts);
  }
  static env() {
    if (isBrowser) {
      throw new Error(`Provider env is not available on browser.`);
    }
    const process = __process$;
    const url = process.env.ANCHOR_PROVIDER_URL;
    if (url === void 0) {
      throw new Error("ANCHOR_PROVIDER_URL is not defined");
    }
    const options = Provider.defaultOptions();
    const connection = new Connection(url, options.commitment);
    const wallet = NodeWallet.local();
    return new Provider(connection, wallet, options);
  }
  async send(tx, signers, opts) {
    if (signers === void 0) {
      signers = [];
    }
    if (opts === void 0) {
      opts = this.opts;
    }
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (await this.connection.getRecentBlockhash(opts.preflightCommitment)).blockhash;
    await this.wallet.signTransaction(tx);
    signers.filter((s) => s !== void 0).forEach((kp) => {
      tx.partialSign(kp);
    });
    const rawTx = tx.serialize();
    const txId = await sendAndConfirmRawTransaction(this.connection, rawTx, opts);
    return txId;
  }
  async sendAll(reqs, opts) {
    if (opts === void 0) {
      opts = this.opts;
    }
    const blockhash = await this.connection.getRecentBlockhash(opts.preflightCommitment);
    let txs = reqs.map((r) => {
      let tx = r.tx;
      let signers = r.signers;
      if (signers === void 0) {
        signers = [];
      }
      tx.feePayer = this.wallet.publicKey;
      tx.recentBlockhash = blockhash.blockhash;
      signers.filter((s) => s !== void 0).forEach((kp) => {
        tx.partialSign(kp);
      });
      return tx;
    });
    const signedTxs = await this.wallet.signAllTransactions(txs);
    const sigs = [];
    for (let k = 0; k < txs.length; k += 1) {
      const tx = signedTxs[k];
      const rawTx = tx.serialize();
      sigs.push(await sendAndConfirmRawTransaction(this.connection, rawTx, opts));
    }
    return sigs;
  }
  async simulate(tx, signers, opts = this.opts) {
    var _a2, _b, _c;
    if (signers === void 0) {
      signers = [];
    }
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (await this.connection.getRecentBlockhash((_a2 = opts.preflightCommitment) !== null && _a2 !== void 0 ? _a2 : this.opts.preflightCommitment)).blockhash;
    await this.wallet.signTransaction(tx);
    signers.filter((s) => s !== void 0).forEach((kp) => {
      tx.partialSign(kp);
    });
    return await simulateTransaction(this.connection, tx, (_c = (_b = opts.commitment) !== null && _b !== void 0 ? _b : this.opts.commitment) !== null && _c !== void 0 ? _c : "recent");
  }
};
var NodeWallet = class {
  constructor(payer) {
    this.payer = payer;
  }
  static local() {
    const process = __process$;
    const payer = Keypair.fromSecretKey(__Buffer$.from(JSON.parse(__fs$.readFileSync(process.env.ANCHOR_WALLET, {
      encoding: "utf-8"
    }))));
    return new NodeWallet(payer);
  }
  async signTransaction(tx) {
    tx.partialSign(this.payer);
    return tx;
  }
  async signAllTransactions(txs) {
    return txs.map((t) => {
      t.partialSign(this.payer);
      return t;
    });
  }
  get publicKey() {
    return this.payer.publicKey;
  }
};
async function simulateTransaction(connection, transaction, commitment) {
  transaction.recentBlockhash = await connection._recentBlockhash(connection._disableBlockhashCaching);
  const signData = transaction.serializeMessage();
  const wireTransaction = transaction._serialize(signData);
  const encodedTransaction = wireTransaction.toString("base64");
  const config = { encoding: "base64", commitment };
  const args = [encodedTransaction, config];
  const res = await connection._rpcRequest("simulateTransaction", args);
  if (res.error) {
    throw new Error("failed to simulate transaction: " + res.error.message);
  }
  return res.result;
}
function setProvider(provider) {
  _provider = provider;
}
function getProvider() {
  if (_provider === null) {
    return Provider.local();
  }
  return _provider;
}
var _provider = null;

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/instruction.js
import camelCase2 from "https://cdn.esm.sh/v54/camelcase@5.3.1/deno/camelcase.development.js";
import {
  struct as struct2
} from "https://cdn.esm.sh/v54/@project-serum/borsh@0.2.2/deno/borsh.development.js";
import {
  decode,
  encode
} from "https://cdn.esm.sh/v54/bs58@4.0.1/deno/bs58.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/idl.js
import camelCase from "https://cdn.esm.sh/v54/camelcase@5.3.1/deno/camelcase.development.js";
import {
  array,
  bool,
  i128,
  i16,
  i32,
  i64,
  i8,
  option,
  publicKey,
  rustEnum,
  str,
  struct,
  u128,
  u16,
  u32,
  u64,
  u8,
  vec,
  vecU8
} from "https://cdn.esm.sh/v54/@project-serum/borsh@0.2.2/deno/borsh.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/error.js
var IdlError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "IdlError";
  }
};
var ProgramError = class extends Error {
  constructor(code, msg, ...params) {
    super(...params);
    this.code = code;
    this.msg = msg;
  }
  static parse(err, idlErrors) {
    let components = err.toString().split("custom program error: ");
    if (components.length !== 2) {
      return null;
    }
    let errorCode;
    try {
      errorCode = parseInt(components[1]);
    } catch (parseErr) {
      return null;
    }
    let errorMsg = idlErrors.get(errorCode);
    if (errorMsg !== void 0) {
      return new ProgramError(errorCode, errorMsg, errorCode + ": " + errorMsg);
    }
    errorMsg = LangErrorMessage.get(errorCode);
    if (errorMsg !== void 0) {
      return new ProgramError(errorCode, errorMsg, errorCode + ": " + errorMsg);
    }
    return null;
  }
  toString() {
    return this.msg;
  }
};
var LangErrorCode = {
  InstructionMissing: 100,
  InstructionFallbackNotFound: 101,
  InstructionDidNotDeserialize: 102,
  InstructionDidNotSerialize: 103,
  IdlInstructionStub: 120,
  IdlInstructionInvalidProgram: 121,
  ConstraintMut: 140,
  ConstraintHasOne: 141,
  ConstraintSigner: 142,
  ConstraintRaw: 143,
  ConstraintOwner: 144,
  ConstraintRentExempt: 145,
  ConstraintSeeds: 146,
  ConstraintExecutable: 147,
  ConstraintState: 148,
  ConstraintAssociated: 149,
  ConstraintAssociatedInit: 150,
  ConstraintClose: 151,
  ConstraintAddress: 152,
  AccountDiscriminatorAlreadySet: 160,
  AccountDiscriminatorNotFound: 161,
  AccountDiscriminatorMismatch: 162,
  AccountDidNotDeserialize: 163,
  AccountDidNotSerialize: 164,
  AccountNotEnoughKeys: 165,
  AccountNotMutable: 166,
  AccountNotProgramOwned: 167,
  InvalidProgramId: 168,
  InvalidProgramIdExecutable: 169,
  StateInvalidAddress: 180,
  Deprecated: 299
};
var LangErrorMessage = new Map([
  [
    LangErrorCode.InstructionMissing,
    "8 byte instruction identifier not provided"
  ],
  [
    LangErrorCode.InstructionFallbackNotFound,
    "Fallback functions are not supported"
  ],
  [
    LangErrorCode.InstructionDidNotDeserialize,
    "The program could not deserialize the given instruction"
  ],
  [
    LangErrorCode.InstructionDidNotSerialize,
    "The program could not serialize the given instruction"
  ],
  [
    LangErrorCode.IdlInstructionStub,
    "The program was compiled without idl instructions"
  ],
  [
    LangErrorCode.IdlInstructionInvalidProgram,
    "The transaction was given an invalid program for the IDL instruction"
  ],
  [LangErrorCode.ConstraintMut, "A mut constraint was violated"],
  [LangErrorCode.ConstraintHasOne, "A has_one constraint was violated"],
  [LangErrorCode.ConstraintSigner, "A signer constraint was violated"],
  [LangErrorCode.ConstraintRaw, "A raw constraint was violated"],
  [LangErrorCode.ConstraintOwner, "An owner constraint was violated"],
  [LangErrorCode.ConstraintRentExempt, "A rent exempt constraint was violated"],
  [LangErrorCode.ConstraintSeeds, "A seeds constraint was violated"],
  [LangErrorCode.ConstraintExecutable, "An executable constraint was violated"],
  [LangErrorCode.ConstraintState, "A state constraint was violated"],
  [LangErrorCode.ConstraintAssociated, "An associated constraint was violated"],
  [
    LangErrorCode.ConstraintAssociatedInit,
    "An associated init constraint was violated"
  ],
  [LangErrorCode.ConstraintClose, "A close constraint was violated"],
  [LangErrorCode.ConstraintAddress, "An address constraint was violated"],
  [
    LangErrorCode.AccountDiscriminatorAlreadySet,
    "The account discriminator was already set on this account"
  ],
  [
    LangErrorCode.AccountDiscriminatorNotFound,
    "No 8 byte discriminator was found on the account"
  ],
  [
    LangErrorCode.AccountDiscriminatorMismatch,
    "8 byte discriminator did not match what was expected"
  ],
  [LangErrorCode.AccountDidNotDeserialize, "Failed to deserialize the account"],
  [LangErrorCode.AccountDidNotSerialize, "Failed to serialize the account"],
  [
    LangErrorCode.AccountNotEnoughKeys,
    "Not enough account keys given to the instruction"
  ],
  [LangErrorCode.AccountNotMutable, "The given account is not mutable"],
  [
    LangErrorCode.AccountNotProgramOwned,
    "The given account is not owned by the executing program"
  ],
  [LangErrorCode.InvalidProgramId, "Program ID was not as expected"],
  [
    LangErrorCode.InvalidProgramIdExecutable,
    "Program account is not executable"
  ],
  [
    LangErrorCode.StateInvalidAddress,
    "The given state account does not have the correct address"
  ],
  [
    LangErrorCode.Deprecated,
    "The API being used is deprecated and should no longer be used"
  ]
]);

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/idl.js
var IdlCoder = class {
  static fieldLayout(field, types) {
    const fieldName = field.name !== void 0 ? camelCase(field.name) : void 0;
    switch (field.type) {
      case "bool": {
        return bool(fieldName);
      }
      case "u8": {
        return u8(fieldName);
      }
      case "i8": {
        return i8(fieldName);
      }
      case "u16": {
        return u16(fieldName);
      }
      case "i16": {
        return i16(fieldName);
      }
      case "u32": {
        return u32(fieldName);
      }
      case "i32": {
        return i32(fieldName);
      }
      case "u64": {
        return u64(fieldName);
      }
      case "i64": {
        return i64(fieldName);
      }
      case "u128": {
        return u128(fieldName);
      }
      case "i128": {
        return i128(fieldName);
      }
      case "bytes": {
        return vecU8(fieldName);
      }
      case "string": {
        return str(fieldName);
      }
      case "publicKey": {
        return publicKey(fieldName);
      }
      default: {
        if ("vec" in field.type) {
          return vec(IdlCoder.fieldLayout({
            name: void 0,
            type: field.type.vec
          }, types), fieldName);
        } else if ("option" in field.type) {
          return option(IdlCoder.fieldLayout({
            name: void 0,
            type: field.type.option
          }, types), fieldName);
        } else if ("defined" in field.type) {
          const defined = field.type.defined;
          if (types === void 0) {
            throw new IdlError("User defined types not provided");
          }
          const filtered = types.filter((t) => t.name === defined);
          if (filtered.length !== 1) {
            throw new IdlError(`Type not found: ${JSON.stringify(field)}`);
          }
          return IdlCoder.typeDefLayout(filtered[0], types, fieldName);
        } else if ("array" in field.type) {
          let arrayTy = field.type.array[0];
          let arrayLen = field.type.array[1];
          let innerLayout = IdlCoder.fieldLayout({
            name: void 0,
            type: arrayTy
          }, types);
          return array(innerLayout, arrayLen, fieldName);
        } else {
          throw new Error(`Not yet implemented: ${field}`);
        }
      }
    }
  }
  static typeDefLayout(typeDef, types = [], name) {
    if (typeDef.type.kind === "struct") {
      const fieldLayouts = typeDef.type.fields.map((field) => {
        const x = IdlCoder.fieldLayout(field, types);
        return x;
      });
      return struct(fieldLayouts, name);
    } else if (typeDef.type.kind === "enum") {
      let variants = typeDef.type.variants.map((variant) => {
        const name2 = camelCase(variant.name);
        if (variant.fields === void 0) {
          return struct([], name2);
        }
        const fieldLayouts = variant.fields.map((f) => {
          if (f.name === void 0) {
            throw new Error("Tuple enum variants not yet implemented.");
          }
          return IdlCoder.fieldLayout(f, types);
        });
        return struct(fieldLayouts, name2);
      });
      if (name !== void 0) {
        return rustEnum(variants).replicate(name);
      }
      return rustEnum(variants, name);
    } else {
      throw new Error(`Unknown type kint: ${typeDef}`);
    }
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/common.js
import { snakeCase } from "https://cdn.esm.sh/v54/snake-case@3.0.4/deno/snake-case.development.js";
import { sha256 } from "https://cdn.esm.sh/v54/js-sha256@0.9.0/deno/js-sha256.development.js";
function accountSize(idl, idlAccount) {
  if (idlAccount.type.kind === "enum") {
    let variantSizes = idlAccount.type.variants.map((variant) => {
      if (variant.fields === void 0) {
        return 0;
      }
      return variant.fields.map((f) => {
        if (!(typeof f === "object" && "name" in f)) {
          throw new Error("Tuple enum variants not yet implemented.");
        }
        return typeSize(idl, f.type);
      }).reduce((a, b) => a + b);
    });
    return Math.max(...variantSizes) + 1;
  }
  if (idlAccount.type.fields === void 0) {
    return 0;
  }
  return idlAccount.type.fields.map((f) => typeSize(idl, f.type)).reduce((a, b) => a + b, 0);
}
function typeSize(idl, ty) {
  var _a2, _b;
  switch (ty) {
    case "bool":
      return 1;
    case "u8":
      return 1;
    case "i8":
      return 1;
    case "i16":
      return 2;
    case "u16":
      return 2;
    case "u32":
      return 4;
    case "i32":
      return 4;
    case "u64":
      return 8;
    case "i64":
      return 8;
    case "u128":
      return 16;
    case "i128":
      return 16;
    case "bytes":
      return 1;
    case "string":
      return 1;
    case "publicKey":
      return 32;
    default:
      if ("vec" in ty) {
        return 1;
      }
      if ("option" in ty) {
        return 1 + typeSize(idl, ty.option);
      }
      if ("defined" in ty) {
        const filtered = (_b = (_a2 = idl.types) === null || _a2 === void 0 ? void 0 : _a2.filter((t) => t.name === ty.defined)) !== null && _b !== void 0 ? _b : [];
        if (filtered.length !== 1) {
          throw new IdlError(`Type not found: ${JSON.stringify(ty)}`);
        }
        let typeDef = filtered[0];
        return accountSize(idl, typeDef);
      }
      if ("array" in ty) {
        let arrayTy = ty.array[0];
        let arraySize = ty.array[1];
        return typeSize(idl, arrayTy) * arraySize;
      }
      throw new Error(`Invalid type ${JSON.stringify(ty)}`);
  }
}
function sighash(nameSpace, ixName) {
  let name = snakeCase(ixName);
  let preimage = `${nameSpace}:${name}`;
  return __Buffer$.from(sha256.digest(preimage)).slice(0, 8);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/instruction.js
var SIGHASH_STATE_NAMESPACE = "state";
var SIGHASH_GLOBAL_NAMESPACE = "global";
var InstructionCoder = class {
  constructor(idl) {
    this.idl = idl;
    this.ixLayout = InstructionCoder.parseIxLayout(idl);
    const sighashLayouts = new Map();
    idl.instructions.forEach((ix) => {
      const sh = sighash(SIGHASH_GLOBAL_NAMESPACE, ix.name);
      sighashLayouts.set(encode(sh), {
        layout: this.ixLayout.get(ix.name),
        name: ix.name
      });
    });
    if (idl.state) {
      idl.state.methods.map((ix) => {
        const sh = sighash(SIGHASH_STATE_NAMESPACE, ix.name);
        sighashLayouts.set(encode(sh), {
          layout: this.ixLayout.get(ix.name),
          name: ix.name
        });
      });
    }
    this.sighashLayouts = sighashLayouts;
  }
  encode(ixName, ix) {
    return this._encode(SIGHASH_GLOBAL_NAMESPACE, ixName, ix);
  }
  encodeState(ixName, ix) {
    return this._encode(SIGHASH_STATE_NAMESPACE, ixName, ix);
  }
  _encode(nameSpace, ixName, ix) {
    const buffer = __Buffer$.alloc(1e3);
    const methodName = camelCase2(ixName);
    const layout = this.ixLayout.get(methodName);
    if (!layout) {
      throw new Error(`Unknown method: ${methodName}`);
    }
    const len = layout.encode(ix, buffer);
    const data = buffer.slice(0, len);
    return __Buffer$.concat([sighash(nameSpace, ixName), data]);
  }
  static parseIxLayout(idl) {
    const stateMethods = idl.state ? idl.state.methods : [];
    const ixLayouts = stateMethods.map((m) => {
      let fieldLayouts = m.args.map((arg) => {
        var _a2, _b;
        return IdlCoder.fieldLayout(arg, Array.from([...(_a2 = idl.accounts) !== null && _a2 !== void 0 ? _a2 : [], ...(_b = idl.types) !== null && _b !== void 0 ? _b : []]));
      });
      const name = camelCase2(m.name);
      return [name, struct2(fieldLayouts, name)];
    }).concat(idl.instructions.map((ix) => {
      let fieldLayouts = ix.args.map((arg) => {
        var _a2, _b;
        return IdlCoder.fieldLayout(arg, Array.from([...(_a2 = idl.accounts) !== null && _a2 !== void 0 ? _a2 : [], ...(_b = idl.types) !== null && _b !== void 0 ? _b : []]));
      });
      const name = camelCase2(ix.name);
      return [name, struct2(fieldLayouts, name)];
    }));
    return new Map(ixLayouts);
  }
  decode(ix, encoding = "hex") {
    if (typeof ix === "string") {
      ix = encoding === "hex" ? __Buffer$.from(ix, "hex") : decode(ix);
    }
    let sighash2 = encode(ix.slice(0, 8));
    let data = ix.slice(8);
    const decoder = this.sighashLayouts.get(sighash2);
    if (!decoder) {
      return null;
    }
    return {
      data: decoder.layout.decode(data),
      name: decoder.name
    };
  }
  format(ix, accountMetas) {
    return InstructionFormatter.format(ix, accountMetas, this.idl);
  }
};
var InstructionFormatter = class {
  static format(ix, accountMetas, idl) {
    const idlIx = idl.instructions.filter((i) => ix.name === i.name)[0];
    if (idlIx === void 0) {
      console.error("Invalid instruction given");
      return null;
    }
    const args = idlIx.args.map((idlField) => {
      return {
        name: idlField.name,
        type: InstructionFormatter.formatIdlType(idlField.type),
        data: InstructionFormatter.formatIdlData(idlField, ix.data[idlField.name], idl.types)
      };
    });
    const flatIdlAccounts = InstructionFormatter.flattenIdlAccounts(idlIx.accounts);
    const accounts = accountMetas.map((meta, idx) => {
      if (idx < flatIdlAccounts.length) {
        return {
          name: flatIdlAccounts[idx].name,
          ...meta
        };
      } else {
        return {
          name: void 0,
          ...meta
        };
      }
    });
    return {
      args,
      accounts
    };
  }
  static formatIdlType(idlType) {
    if (typeof idlType === "string") {
      return idlType;
    }
    if ("vec" in idlType) {
      return `Vec<${this.formatIdlType(idlType.vec)}>`;
    }
    if ("option" in idlType) {
      return `Option<${this.formatIdlType(idlType.option)}>`;
    }
    if ("defined" in idlType) {
      return idlType.defined;
    }
    if ("array" in idlType) {
      return `Array<${idlType.array[0]}; ${idlType.array[1]}>`;
    }
    throw new Error(`Unknown IDL type: ${idlType}`);
  }
  static formatIdlData(idlField, data, types) {
    if (typeof idlField.type === "string") {
      return data.toString();
    }
    if (idlField.type.vec) {
      return "[" + data.map((d) => this.formatIdlData({ name: "", type: idlField.type.vec }, d)).join(", ") + "]";
    }
    if (idlField.type.option) {
      return data === null ? "null" : this.formatIdlData({ name: "", type: idlField.type.option }, data);
    }
    if (idlField.type.defined) {
      if (types === void 0) {
        throw new Error("User defined types not provided");
      }
      const filtered = types.filter((t) => t.name === idlField.type.defined);
      if (filtered.length !== 1) {
        throw new Error(`Type not found: ${idlField.type.defined}`);
      }
      return InstructionFormatter.formatIdlDataDefined(filtered[0], data, types);
    }
    return "unknown";
  }
  static formatIdlDataDefined(typeDef, data, types) {
    if (typeDef.type.kind === "struct") {
      const struct4 = typeDef.type;
      const fields = Object.keys(data).map((k) => {
        const f = struct4.fields.filter((f2) => f2.name === k)[0];
        if (f === void 0) {
          throw new Error("Unable to find type");
        }
        return k + ": " + InstructionFormatter.formatIdlData(f, data[k], types);
      }).join(", ");
      return "{ " + fields + " }";
    } else {
      if (typeDef.type.variants.length === 0) {
        return "{}";
      }
      if (typeDef.type.variants[0].name) {
        const variants = typeDef.type.variants;
        const variant = Object.keys(data)[0];
        const enumType = data[variant];
        const namedFields = Object.keys(enumType).map((f) => {
          var _a2;
          const fieldData = enumType[f];
          const idlField = (_a2 = variants[variant]) === null || _a2 === void 0 ? void 0 : _a2.filter((v) => v.name === f)[0];
          if (idlField === void 0) {
            throw new Error("Unable to find variant");
          }
          return f + ": " + InstructionFormatter.formatIdlData(idlField, fieldData, types);
        }).join(", ");
        const variantName = camelCase2(variant, { pascalCase: true });
        if (namedFields.length === 0) {
          return variantName;
        }
        return `${variantName} { ${namedFields} }`;
      } else {
        return "Tuple formatting not yet implemented";
      }
    }
  }
  static flattenIdlAccounts(accounts, prefix) {
    return accounts.map((account) => {
      const accName = sentenceCase(account.name);
      if (account.accounts) {
        const newPrefix = prefix ? `${prefix} > ${accName}` : accName;
        return InstructionFormatter.flattenIdlAccounts(account.accounts, newPrefix);
      } else {
        return {
          ...account,
          name: prefix ? `${prefix} > ${accName}` : accName
        };
      }
    }).flat();
  }
};
function sentenceCase(field) {
  const result = field.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/accounts.js
import { sha256 as sha2562 } from "https://cdn.esm.sh/v54/js-sha256@0.9.0/deno/js-sha256.development.js";
var ACCOUNT_DISCRIMINATOR_SIZE = 8;
var AccountsCoder = class {
  constructor(idl) {
    if (idl.accounts === void 0) {
      this.accountLayouts = new Map();
      return;
    }
    const layouts = idl.accounts.map((acc) => {
      return [acc.name, IdlCoder.typeDefLayout(acc, idl.types)];
    });
    this.accountLayouts = new Map(layouts);
  }
  async encode(accountName, account) {
    const buffer = __Buffer$.alloc(1e3);
    const layout = this.accountLayouts.get(accountName);
    if (!layout) {
      throw new Error(`Unknown account: ${accountName}`);
    }
    const len = layout.encode(account, buffer);
    let accountData = buffer.slice(0, len);
    let discriminator = AccountsCoder.accountDiscriminator(accountName);
    return __Buffer$.concat([discriminator, accountData]);
  }
  decode(accountName, ix) {
    const data = ix.slice(8);
    const layout = this.accountLayouts.get(accountName);
    if (!layout) {
      throw new Error(`Unknown account: ${accountName}`);
    }
    return layout.decode(data);
  }
  static accountDiscriminator(name) {
    return __Buffer$.from(sha2562.digest(`account:${name}`)).slice(0, 8);
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/types.js
var TypesCoder = class {
  constructor(idl) {
    if (idl.types === void 0) {
      this.layouts = new Map();
      return;
    }
    const types = idl.types;
    const layouts = types.map((acc) => {
      return [acc.name, IdlCoder.typeDefLayout(acc, types)];
    });
    this.layouts = new Map(layouts);
  }
  encode(accountName, account) {
    const buffer = __Buffer$.alloc(1e3);
    const layout = this.layouts.get(accountName);
    if (!layout) {
      throw new Error(`Unknown account type: ${accountName}`);
    }
    const len = layout.encode(account, buffer);
    return buffer.slice(0, len);
  }
  decode(accountName, ix) {
    const layout = this.layouts.get(accountName);
    if (!layout) {
      throw new Error(`Unknown account type: ${accountName}`);
    }
    return layout.decode(ix);
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/event.js
import {
  fromByteArray,
  toByteArray
} from "https://cdn.esm.sh/v54/base64-js@1.5.1/deno/base64-js.development.js";
import { sha256 as sha2563 } from "https://cdn.esm.sh/v54/js-sha256@0.9.0/deno/js-sha256.development.js";
var EventCoder = class {
  constructor(idl) {
    if (idl.events === void 0) {
      this.layouts = new Map();
      return;
    }
    const layouts = idl.events.map((event) => {
      let eventTypeDef = {
        name: event.name,
        type: {
          kind: "struct",
          fields: event.fields.map((f) => {
            return { name: f.name, type: f.type };
          })
        }
      };
      return [event.name, IdlCoder.typeDefLayout(eventTypeDef, idl.types)];
    });
    this.layouts = new Map(layouts);
    this.discriminators = new Map(idl.events === void 0 ? [] : idl.events.map((e) => [
      fromByteArray(eventDiscriminator(e.name)),
      e.name
    ]));
  }
  decode(log) {
    let logArr;
    try {
      logArr = __Buffer$.from(toByteArray(log));
    } catch (e) {
      return null;
    }
    const disc = fromByteArray(logArr.slice(0, 8));
    const eventName = this.discriminators.get(disc);
    if (eventName === void 0) {
      return null;
    }
    const layout = this.layouts.get(eventName);
    if (!layout) {
      throw new Error(`Unknown event: ${eventName}`);
    }
    const data = layout.decode(logArr.slice(8));
    return { data, name: eventName };
  }
};
function eventDiscriminator(name) {
  return __Buffer$.from(sha2563.digest(`event:${name}`)).slice(0, 8);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/state.js
import { sha256 as sha2564 } from "https://cdn.esm.sh/v54/js-sha256@0.9.0/deno/js-sha256.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/features.js
var features_exports = {};
__export(features_exports, {
  isSet: () => isSet,
  set: () => set
});
var _AVAILABLE_FEATURES = new Set(["anchor-deprecated-state"]);
var _FEATURES = new Map();
function set(key) {
  if (!_AVAILABLE_FEATURES.has(key)) {
    throw new Error("Invalid feature");
  }
  _FEATURES.set(key, true);
}
function isSet(key) {
  return _FEATURES.get(key) !== void 0;
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/state.js
var StateCoder = class {
  constructor(idl) {
    if (idl.state === void 0) {
      throw new Error("Idl state not defined.");
    }
    this.layout = IdlCoder.typeDefLayout(idl.state.struct, idl.types);
  }
  async encode(name, account) {
    const buffer = __Buffer$.alloc(1e3);
    const len = this.layout.encode(account, buffer);
    const disc = await stateDiscriminator(name);
    const accData = buffer.slice(0, len);
    return __Buffer$.concat([disc, accData]);
  }
  decode(ix) {
    const data = ix.slice(8);
    return this.layout.decode(data);
  }
};
async function stateDiscriminator(name) {
  let ns = isSet("anchor-deprecated-state") ? "account" : "state";
  return __Buffer$.from(sha2564.digest(`${ns}:${name}`)).slice(0, 8);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/coder/index.js
var Coder = class {
  constructor(idl) {
    this.instruction = new InstructionCoder(idl);
    this.accounts = new AccountsCoder(idl);
    this.types = new TypesCoder(idl);
    this.events = new EventCoder(idl);
    if (idl.state) {
      this.state = new StateCoder(idl);
    }
  }
  sighash(nameSpace, ixName) {
    return sighash(nameSpace, ixName);
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/workspace.js
import camelCase6 from "https://cdn.esm.sh/v54/camelcase@5.3.1/deno/camelcase.development.js";
import {
  parse
} from "https://cdn.esm.sh/v54/toml@3.0.0/deno/toml.development.js";
import { PublicKey as PublicKey5 } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/index.js
import { inflate } from "https://cdn.esm.sh/v54/pako@2.0.4/deno/pako.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/idl.js
import { PublicKey } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";
import {
  publicKey as publicKey2,
  struct as struct3,
  vecU8 as vecU82
} from "https://cdn.esm.sh/v54/@project-serum/borsh@0.2.2/deno/borsh.development.js";
async function idlAddress(programId) {
  const base = (await PublicKey.findProgramAddress([], programId))[0];
  return await PublicKey.createWithSeed(base, seed(), programId);
}
function seed() {
  return "anchor:idl";
}
var IDL_ACCOUNT_LAYOUT = struct3([
  publicKey2("authority"),
  vecU82("data")
]);
function decodeIdlAccount(data) {
  return IDL_ACCOUNT_LAYOUT.decode(data);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/index.js
import camelCase5 from "https://cdn.esm.sh/v54/camelcase@5.3.1/deno/camelcase.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/state.js
import EventEmitter from "https://cdn.esm.sh/v54/eventemitter3@4.0.7/deno/eventemitter3.development.js";
import camelCase3 from "https://cdn.esm.sh/v54/camelcase@5.3.1/deno/camelcase.development.js";
import { SystemProgram } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/common.js
import { PublicKey as PublicKey2 } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";
function parseIdlErrors(idl) {
  const errors = new Map();
  if (idl.errors) {
    idl.errors.forEach((e) => {
      var _a2;
      let msg = (_a2 = e.msg) !== null && _a2 !== void 0 ? _a2 : e.name;
      errors.set(e.code, msg);
    });
  }
  return errors;
}
function toInstruction(idlIx, ...args) {
  if (idlIx.args.length != args.length) {
    throw new Error("Invalid argument length");
  }
  const ix = {};
  let idx = 0;
  idlIx.args.forEach((ixArg) => {
    ix[ixArg.name] = args[idx];
    idx += 1;
  });
  return ix;
}
function validateAccounts(ixAccounts, accounts = {}) {
  ixAccounts.forEach((acc) => {
    if ("accounts" in acc) {
      validateAccounts(acc.accounts, accounts[acc.name]);
    } else {
      if (accounts[acc.name] === void 0) {
        throw new Error(`Invalid arguments: ${acc.name} not provided.`);
      }
    }
  });
}
function translateAddress(address) {
  if (typeof address === "string") {
    const pk = new PublicKey2(address);
    return pk;
  } else {
    return address;
  }
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/pubkey.js
var pubkey_exports = {};
__export(pubkey_exports, {
  associated: () => associated,
  createProgramAddressSync: () => createProgramAddressSync,
  createWithSeedSync: () => createWithSeedSync,
  findProgramAddressSync: () => findProgramAddressSync
});
import BN from "https://cdn.esm.sh/v54/bn.js@5.2.0/deno/bn.development.js";
import { sha256 as sha256Sync } from "https://cdn.esm.sh/v54/js-sha256@0.9.0/deno/js-sha256.development.js";
import { PublicKey as PublicKey3 } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";
function createWithSeedSync(fromPublicKey, seed2, programId) {
  const buffer = __Buffer$.concat([
    fromPublicKey.toBuffer(),
    __Buffer$.from(seed2),
    programId.toBuffer()
  ]);
  const hash2 = sha256Sync.digest(buffer);
  return new PublicKey3(__Buffer$.from(hash2));
}
function createProgramAddressSync(seeds, programId) {
  const MAX_SEED_LENGTH = 32;
  let buffer = __Buffer$.alloc(0);
  seeds.forEach(function(seed2) {
    if (seed2.length > MAX_SEED_LENGTH) {
      throw new TypeError(`Max seed length exceeded`);
    }
    buffer = __Buffer$.concat([buffer, toBuffer(seed2)]);
  });
  buffer = __Buffer$.concat([
    buffer,
    programId.toBuffer(),
    __Buffer$.from("ProgramDerivedAddress")
  ]);
  let hash2 = sha256Sync(new Uint8Array(buffer));
  let publicKeyBytes = new BN(hash2, 16).toArray(void 0, 32);
  if (PublicKey3.isOnCurve(new Uint8Array(publicKeyBytes))) {
    throw new Error(`Invalid seeds, address must fall off the curve`);
  }
  return new PublicKey3(publicKeyBytes);
}
function findProgramAddressSync(seeds, programId) {
  let nonce = 255;
  let address;
  while (nonce != 0) {
    try {
      const seedsWithNonce = seeds.concat(__Buffer$.from([nonce]));
      address = createProgramAddressSync(seedsWithNonce, programId);
    } catch (err) {
      if (err instanceof TypeError) {
        throw err;
      }
      nonce--;
      continue;
    }
    return [address, nonce];
  }
  throw new Error(`Unable to find a viable program address nonce`);
}
var toBuffer = (arr) => {
  if (arr instanceof __Buffer$) {
    return arr;
  } else if (arr instanceof Uint8Array) {
    return __Buffer$.from(arr.buffer, arr.byteOffset, arr.byteLength);
  } else {
    return __Buffer$.from(arr);
  }
};
async function associated(programId, ...args) {
  let seeds = [__Buffer$.from([97, 110, 99, 104, 111, 114])];
  args.forEach((arg) => {
    seeds.push(arg.buffer !== void 0 ? arg : translateAddress(arg).toBuffer());
  });
  const [assoc] = await PublicKey3.findProgramAddress(seeds, translateAddress(programId));
  return assoc;
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/instruction.js
import { TransactionInstruction } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/context.js
function splitArgsAndCtx(idlIx, args) {
  let options = {};
  const inputLen = idlIx.args ? idlIx.args.length : 0;
  if (args.length > inputLen) {
    if (args.length !== inputLen + 1) {
      throw new Error("provided too many arguments ${args}");
    }
    options = args.pop();
  }
  return [args, options];
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/instruction.js
var InstructionNamespaceFactory = class {
  static build(idlIx, encodeFn, programId) {
    if (idlIx.name === "_inner") {
      throw new IdlError("the _inner name is reserved");
    }
    const ix = (...args) => {
      const [ixArgs, ctx] = splitArgsAndCtx(idlIx, [...args]);
      validateAccounts(idlIx.accounts, ctx.accounts);
      validateInstruction(idlIx, ...args);
      const keys = ix.accounts(ctx.accounts);
      if (ctx.remainingAccounts !== void 0) {
        keys.push(...ctx.remainingAccounts);
      }
      if (ctx.__private && ctx.__private.logAccounts) {
        console.log("Outgoing account metas:", keys);
      }
      return new TransactionInstruction({
        keys,
        programId,
        data: encodeFn(idlIx.name, toInstruction(idlIx, ...ixArgs))
      });
    };
    ix["accounts"] = (accs = {}) => {
      return InstructionNamespaceFactory.accountsArray(accs, idlIx.accounts);
    };
    return ix;
  }
  static accountsArray(ctx, accounts) {
    return accounts.map((acc) => {
      const nestedAccounts = "accounts" in acc ? acc.accounts : void 0;
      if (nestedAccounts !== void 0) {
        const rpcAccs = ctx[acc.name];
        return InstructionNamespaceFactory.accountsArray(rpcAccs, nestedAccounts).flat();
      } else {
        const account = acc;
        return {
          pubkey: translateAddress(ctx[acc.name]),
          isWritable: account.isMut,
          isSigner: account.isSigner
        };
      }
    }).flat();
  }
};
function validateInstruction(ix, ...args) {
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/rpc.js
var RpcFactory = class {
  static build(idlIx, txFn, idlErrors, provider) {
    const rpc = async (...args) => {
      const tx = txFn(...args);
      const [, ctx] = splitArgsAndCtx(idlIx, [...args]);
      try {
        const txSig = await provider.send(tx, ctx.signers, ctx.options);
        return txSig;
      } catch (err) {
        console.log("Translating error", err);
        let translatedErr = ProgramError.parse(err, idlErrors);
        if (translatedErr === null) {
          throw err;
        }
        throw translatedErr;
      }
    };
    return rpc;
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/transaction.js
import { Transaction } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";
var TransactionFactory = class {
  static build(idlIx, ixFn) {
    const txFn = (...args) => {
      const [, ctx] = splitArgsAndCtx(idlIx, [...args]);
      const tx = new Transaction();
      if (ctx.instructions !== void 0) {
        tx.add(...ctx.instructions);
      }
      tx.add(ixFn(...args));
      return tx;
    };
    return txFn;
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/state.js
var StateFactory = class {
  static build(idl, coder, programId, provider) {
    if (idl.state === void 0) {
      return void 0;
    }
    return new StateClient(idl, programId, provider, coder);
  }
};
var StateClient = class {
  constructor(idl, programId, provider = getProvider(), coder = new Coder(idl)) {
    this.provider = provider;
    this.coder = coder;
    this._idl = idl;
    this._programId = programId;
    this._address = programStateAddress(programId);
    this._sub = null;
    const [instruction, transaction, rpc] = (() => {
      var _a2;
      let instruction2 = {};
      let transaction2 = {};
      let rpc2 = {};
      (_a2 = idl.state) === null || _a2 === void 0 ? void 0 : _a2.methods.forEach((m) => {
        const ixItem = InstructionNamespaceFactory.build(m, (ixName, ix) => coder.instruction.encodeState(ixName, ix), programId);
        ixItem["accounts"] = (accounts) => {
          const keys = stateInstructionKeys(programId, provider, m, accounts);
          return keys.concat(InstructionNamespaceFactory.accountsArray(accounts, m.accounts));
        };
        const txItem = TransactionFactory.build(m, ixItem);
        const rpcItem = RpcFactory.build(m, txItem, parseIdlErrors(idl), provider);
        const name = camelCase3(m.name);
        instruction2[name] = ixItem;
        transaction2[name] = txItem;
        rpc2[name] = rpcItem;
      });
      return [instruction2, transaction2, rpc2];
    })();
    this.instruction = instruction;
    this.transaction = transaction;
    this.rpc = rpc;
  }
  get programId() {
    return this._programId;
  }
  async fetch() {
    const addr = this.address();
    const accountInfo = await this.provider.connection.getAccountInfo(addr);
    if (accountInfo === null) {
      throw new Error(`Account does not exist ${addr.toString()}`);
    }
    const state = this._idl.state;
    if (!state) {
      throw new Error("State is not specified in IDL.");
    }
    const expectedDiscriminator = await stateDiscriminator(state.struct.name);
    if (expectedDiscriminator.compare(accountInfo.data.slice(0, 8))) {
      throw new Error("Invalid account discriminator");
    }
    return this.coder.state.decode(accountInfo.data);
  }
  address() {
    return this._address;
  }
  subscribe(commitment) {
    if (this._sub !== null) {
      return this._sub.ee;
    }
    const ee = new EventEmitter();
    const listener = this.provider.connection.onAccountChange(this.address(), (acc) => {
      const account = this.coder.state.decode(acc.data);
      ee.emit("change", account);
    }, commitment);
    this._sub = {
      ee,
      listener
    };
    return ee;
  }
  unsubscribe() {
    if (this._sub !== null) {
      this.provider.connection.removeAccountChangeListener(this._sub.listener).then(async () => {
        this._sub = null;
      }).catch(console.error);
    }
  }
};
function programStateAddress(programId) {
  let [registrySigner] = findProgramAddressSync([], programId);
  return createWithSeedSync(registrySigner, "unversioned", programId);
}
function stateInstructionKeys(programId, provider, m, accounts) {
  if (m.name === "new") {
    const [programSigner] = findProgramAddressSync([], programId);
    return [
      {
        pubkey: provider.wallet.publicKey,
        isWritable: false,
        isSigner: true
      },
      {
        pubkey: programStateAddress(programId),
        isWritable: true,
        isSigner: false
      },
      { pubkey: programSigner, isWritable: false, isSigner: false },
      {
        pubkey: SystemProgram.programId,
        isWritable: false,
        isSigner: false
      },
      { pubkey: programId, isWritable: false, isSigner: false }
    ];
  } else {
    validateAccounts(m.accounts, accounts);
    return [
      {
        pubkey: programStateAddress(programId),
        isWritable: true,
        isSigner: false
      }
    ];
  }
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/account.js
import camelCase4 from "https://cdn.esm.sh/v54/camelcase@5.3.1/deno/camelcase.development.js";
import EventEmitter2 from "https://cdn.esm.sh/v54/eventemitter3@4.0.7/deno/eventemitter3.development.js";
import {
  encode as encode2
} from "https://cdn.esm.sh/v54/bs58@4.0.1/deno/bs58.development.js";
import { SystemProgram as SystemProgram2 } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/rpc.js
var rpc_exports = {};
__export(rpc_exports, {
  getMultipleAccounts: () => getMultipleAccounts,
  invoke: () => invoke
});
import assert from "https://cdn.esm.sh/v54/assert@2.0.0/deno/assert.development.js";
import { PublicKey as PublicKey4, Transaction as Transaction2, TransactionInstruction as TransactionInstruction2 } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";
async function invoke(programId, accounts, data, provider) {
  programId = translateAddress(programId);
  if (!provider) {
    provider = getProvider();
  }
  const tx = new Transaction2();
  tx.add(new TransactionInstruction2({
    programId,
    keys: accounts !== null && accounts !== void 0 ? accounts : [],
    data
  }));
  return await provider.send(tx);
}
var GET_MULTIPLE_ACCOUNTS_LIMIT = 99;
async function getMultipleAccounts(connection, publicKeys) {
  if (publicKeys.length <= GET_MULTIPLE_ACCOUNTS_LIMIT) {
    return await getMultipleAccountsCore(connection, publicKeys);
  } else {
    const batches = chunks(publicKeys, GET_MULTIPLE_ACCOUNTS_LIMIT);
    const results = await Promise.all(batches.map((batch) => getMultipleAccountsCore(connection, batch)));
    return results.flat();
  }
}
async function getMultipleAccountsCore(connection, publicKeys) {
  const args = [publicKeys.map((k) => k.toBase58()), { commitment: "recent" }];
  const res = await connection._rpcRequest("getMultipleAccounts", args);
  if (res.error) {
    throw new Error("failed to get info about accounts " + publicKeys.map((k) => k.toBase58()).join(", ") + ": " + res.error.message);
  }
  assert(typeof res.result !== "undefined");
  const accounts = [];
  for (const account of res.result.value) {
    let value = null;
    if (account === null) {
      accounts.push(null);
      continue;
    }
    if (res.result.value) {
      const { executable, owner, lamports, data } = account;
      assert(data[1] === "base64");
      value = {
        executable,
        owner: new PublicKey4(owner),
        lamports,
        data: __Buffer$.from(data[0], "base64")
      };
    }
    if (value === null) {
      throw new Error("Invalid response");
    }
    accounts.push(value);
  }
  return accounts.map((account, idx) => {
    if (account === null) {
      return null;
    }
    return {
      publicKey: publicKeys[idx],
      account
    };
  });
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/account.js
var AccountFactory = class {
  static build(idl, coder, programId, provider) {
    var _a2;
    const accountFns = {};
    (_a2 = idl.accounts) === null || _a2 === void 0 ? void 0 : _a2.forEach((idlAccount) => {
      const name = camelCase4(idlAccount.name);
      accountFns[name] = new AccountClient(idl, idlAccount, programId, provider, coder);
    });
    return accountFns;
  }
};
var AccountClient = class {
  constructor(idl, idlAccount, programId, provider, coder) {
    var _a2;
    this._idlAccount = idlAccount;
    this._programId = programId;
    this._provider = provider !== null && provider !== void 0 ? provider : getProvider();
    this._coder = coder !== null && coder !== void 0 ? coder : new Coder(idl);
    this._size = ACCOUNT_DISCRIMINATOR_SIZE + ((_a2 = accountSize(idl, idlAccount)) !== null && _a2 !== void 0 ? _a2 : 0);
  }
  get size() {
    return this._size;
  }
  get programId() {
    return this._programId;
  }
  get provider() {
    return this._provider;
  }
  get coder() {
    return this._coder;
  }
  async fetchNullable(address) {
    const accountInfo = await this._provider.connection.getAccountInfo(translateAddress(address));
    if (accountInfo === null) {
      return null;
    }
    const discriminator = AccountsCoder.accountDiscriminator(this._idlAccount.name);
    if (discriminator.compare(accountInfo.data.slice(0, 8))) {
      throw new Error("Invalid account discriminator");
    }
    return this._coder.accounts.decode(this._idlAccount.name, accountInfo.data);
  }
  async fetch(address) {
    const data = await this.fetchNullable(address);
    if (data === null) {
      throw new Error(`Account does not exist ${address.toString()}`);
    }
    return data;
  }
  async fetchMultiple(addresses) {
    const accounts = await getMultipleAccounts(this._provider.connection, addresses.map((address) => translateAddress(address)));
    const discriminator = AccountsCoder.accountDiscriminator(this._idlAccount.name);
    return accounts.map((account) => {
      if (account == null) {
        return null;
      }
      if (discriminator.compare(account === null || account === void 0 ? void 0 : account.account.data.slice(0, 8))) {
        return null;
      }
      return this._coder.accounts.decode(this._idlAccount.name, account === null || account === void 0 ? void 0 : account.account.data);
    });
  }
  async all(filters) {
    const discriminator = AccountsCoder.accountDiscriminator(this._idlAccount.name);
    let resp = await this._provider.connection.getProgramAccounts(this._programId, {
      commitment: this._provider.connection.commitment,
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: encode2(filters instanceof __Buffer$ ? __Buffer$.concat([discriminator, filters]) : discriminator)
          }
        },
        ...Array.isArray(filters) ? filters : []
      ]
    });
    return resp.map(({ pubkey, account }) => {
      return {
        publicKey: pubkey,
        account: this._coder.accounts.decode(this._idlAccount.name, account.data)
      };
    });
  }
  subscribe(address, commitment) {
    const sub = subscriptions.get(address.toString());
    if (sub) {
      return sub.ee;
    }
    const ee = new EventEmitter2();
    address = translateAddress(address);
    const listener = this._provider.connection.onAccountChange(address, (acc) => {
      const account = this._coder.accounts.decode(this._idlAccount.name, acc.data);
      ee.emit("change", account);
    }, commitment);
    subscriptions.set(address.toString(), {
      ee,
      listener
    });
    return ee;
  }
  async unsubscribe(address) {
    let sub = subscriptions.get(address.toString());
    if (!sub) {
      console.warn("Address is not subscribed");
      return;
    }
    if (subscriptions) {
      await this._provider.connection.removeAccountChangeListener(sub.listener).then(() => {
        subscriptions.delete(address.toString());
      }).catch(console.error);
    }
  }
  async createInstruction(signer, sizeOverride) {
    const size = this.size;
    return SystemProgram2.createAccount({
      fromPubkey: this._provider.wallet.publicKey,
      newAccountPubkey: signer.publicKey,
      space: sizeOverride !== null && sizeOverride !== void 0 ? sizeOverride : size,
      lamports: await this._provider.connection.getMinimumBalanceForRentExemption(sizeOverride !== null && sizeOverride !== void 0 ? sizeOverride : size),
      programId: this._programId
    });
  }
  async associated(...args) {
    const addr = await this.associatedAddress(...args);
    return await this.fetch(addr);
  }
  async associatedAddress(...args) {
    return await associated(this._programId, ...args);
  }
};
var subscriptions = new Map();

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/event.js
import {
  ok
} from "https://cdn.esm.sh/v54/assert@2.0.0/deno/assert.development.js";
var LOG_START_INDEX = "Program log: ".length;
var EventManager = class {
  constructor(programId, provider, coder) {
    this._programId = programId;
    this._provider = provider;
    this._eventParser = new EventParser(programId, coder);
    this._eventCallbacks = new Map();
    this._eventListeners = new Map();
    this._listenerIdCount = 0;
  }
  addEventListener(eventName, callback) {
    var _a2;
    let listener = this._listenerIdCount;
    this._listenerIdCount += 1;
    if (!(eventName in this._eventCallbacks)) {
      this._eventListeners.set(eventName, []);
    }
    this._eventListeners.set(eventName, ((_a2 = this._eventListeners.get(eventName)) !== null && _a2 !== void 0 ? _a2 : []).concat(listener));
    this._eventCallbacks.set(listener, [eventName, callback]);
    if (this._onLogsSubscriptionId !== void 0) {
      return listener;
    }
    this._onLogsSubscriptionId = this._provider.connection.onLogs(this._programId, (logs, ctx) => {
      if (logs.err) {
        console.error(logs);
        return;
      }
      this._eventParser.parseLogs(logs.logs, (event) => {
        const allListeners = this._eventListeners.get(event.name);
        if (allListeners) {
          allListeners.forEach((listener2) => {
            const listenerCb = this._eventCallbacks.get(listener2);
            if (listenerCb) {
              const [, callback2] = listenerCb;
              callback2(event.data, ctx.slot);
            }
          });
        }
      });
    });
    return listener;
  }
  async removeEventListener(listener) {
    const callback = this._eventCallbacks.get(listener);
    if (!callback) {
      throw new Error(`Event listener ${listener} doesn't exist!`);
    }
    const [eventName] = callback;
    let listeners = this._eventListeners.get(eventName);
    if (!listeners) {
      throw new Error(`Event listeners don't exist for ${eventName}!`);
    }
    this._eventCallbacks.delete(listener);
    listeners = listeners.filter((l) => l !== listener);
    if (listeners.length === 0) {
      this._eventListeners.delete(eventName);
    }
    if (this._eventCallbacks.size == 0) {
      ok(this._eventListeners.size === 0);
      if (this._onLogsSubscriptionId !== void 0) {
        await this._provider.connection.removeOnLogsListener(this._onLogsSubscriptionId);
        this._onLogsSubscriptionId = void 0;
      }
    }
  }
};
var EventParser = class {
  constructor(programId, coder) {
    this.coder = coder;
    this.programId = programId;
  }
  parseLogs(logs, callback) {
    const logScanner = new LogScanner(logs);
    const execution = new ExecutionContext(logScanner.next());
    let log = logScanner.next();
    while (log !== null) {
      let [event, newProgram, didPop] = this.handleLog(execution, log);
      if (event) {
        callback(event);
      }
      if (newProgram) {
        execution.push(newProgram);
      }
      if (didPop) {
        execution.pop();
      }
      log = logScanner.next();
    }
  }
  handleLog(execution, log) {
    if (execution.stack.length > 0 && execution.program() === this.programId.toString()) {
      return this.handleProgramLog(log);
    } else {
      return [null, ...this.handleSystemLog(log)];
    }
  }
  handleProgramLog(log) {
    if (log.startsWith("Program log:")) {
      const logStr = log.slice(LOG_START_INDEX);
      const event = this.coder.events.decode(logStr);
      return [event, null, false];
    } else {
      return [null, ...this.handleSystemLog(log)];
    }
  }
  handleSystemLog(log) {
    const logStart = log.split(":")[0];
    if (logStart.match(/^Program (.*) success/g) !== null) {
      return [null, true];
    } else if (logStart.startsWith(`Program ${this.programId.toString()} invoke`)) {
      return [this.programId.toString(), false];
    } else if (logStart.includes("invoke")) {
      return ["cpi", false];
    } else {
      return [null, false];
    }
  }
};
var ExecutionContext = class {
  constructor(log) {
    var _a2;
    const program = (_a2 = /^Program (.*) invoke.*$/g.exec(log)) === null || _a2 === void 0 ? void 0 : _a2[1];
    if (!program) {
      throw new Error(`Could not find program invocation log line`);
    }
    this.stack = [program];
  }
  program() {
    ok(this.stack.length > 0);
    return this.stack[this.stack.length - 1];
  }
  push(newProgram) {
    this.stack.push(newProgram);
  }
  pop() {
    ok(this.stack.length > 0);
    this.stack.pop();
  }
};
var LogScanner = class {
  constructor(logs) {
    this.logs = logs;
  }
  next() {
    if (this.logs.length === 0) {
      return null;
    }
    let l = this.logs[0];
    this.logs = this.logs.slice(1);
    return l;
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/simulate.js
var SimulateFactory = class {
  static build(idlIx, txFn, idlErrors, provider, coder, programId, idl) {
    const simulate = async (...args) => {
      const tx = txFn(...args);
      const [, ctx] = splitArgsAndCtx(idlIx, [...args]);
      let resp = void 0;
      try {
        resp = await provider.simulate(tx, ctx.signers, ctx.options);
      } catch (err) {
        console.log("Translating error", err);
        let translatedErr = ProgramError.parse(err, idlErrors);
        if (translatedErr === null) {
          throw err;
        }
        throw translatedErr;
      }
      if (resp === void 0) {
        throw new Error("Unable to simulate transaction");
      }
      if (resp.value.err) {
        throw new Error(`Simulate error: ${resp.value.err.toString()}`);
      }
      const logs = resp.value.logs;
      if (!logs) {
        throw new Error("Simulated logs not found");
      }
      const events = [];
      if (idl.events) {
        let parser = new EventParser(programId, coder);
        parser.parseLogs(logs, (event) => {
          events.push(event);
        });
      }
      return { events, raw: logs };
    };
    return simulate;
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/namespace/index.js
var NamespaceFactory = class {
  static build(idl, coder, programId, provider) {
    const rpc = {};
    const instruction = {};
    const transaction = {};
    const simulate = {};
    const idlErrors = parseIdlErrors(idl);
    const state = StateFactory.build(idl, coder, programId, provider);
    idl.instructions.forEach((idlIx) => {
      const ixItem = InstructionNamespaceFactory.build(idlIx, (ixName, ix) => coder.instruction.encode(ixName, ix), programId);
      const txItem = TransactionFactory.build(idlIx, ixItem);
      const rpcItem = RpcFactory.build(idlIx, txItem, idlErrors, provider);
      const simulateItem = SimulateFactory.build(idlIx, txItem, idlErrors, provider, coder, programId, idl);
      const name = camelCase5(idlIx.name);
      instruction[name] = ixItem;
      transaction[name] = txItem;
      rpc[name] = rpcItem;
      simulate[name] = simulateItem;
    });
    const account = idl.accounts ? AccountFactory.build(idl, coder, programId, provider) : {};
    return [rpc, instruction, transaction, account, simulate, state];
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/bytes/index.js
var bytes_exports = {};
__export(bytes_exports, {
  base64: () => base64_exports,
  bs58: () => bs58_exports,
  hex: () => hex_exports,
  utf8: () => utf8_exports
});

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/bytes/hex.js
var hex_exports = {};
__export(hex_exports, {
  decode: () => decode2,
  encode: () => encode3
});
function encode3(data) {
  return data.reduce((str2, byte) => str2 + byte.toString(16).padStart(2, "0"), "0x");
}
function decode2(data) {
  if (data.indexOf("0x") === 0) {
    data = data.substr(2);
  }
  if (data.length % 2 === 1) {
    data = "0" + data;
  }
  let key = data.match(/.{2}/g);
  if (key === null) {
    return __Buffer$.from([]);
  }
  return __Buffer$.from(key.map((byte) => parseInt(byte, 16)));
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/bytes/utf8.js
var utf8_exports = {};
__export(utf8_exports, {
  decode: () => decode3,
  encode: () => encode4
});
function decode3(array2) {
  const decoder = typeof TextDecoder === "undefined" ? new (__util$).TextDecoder("utf-8") : new TextDecoder("utf-8");
  return decoder.decode(array2);
}
function encode4(input) {
  const encoder = typeof TextEncoder === "undefined" ? new (__util$).TextEncoder("utf-8") : new TextEncoder();
  return encoder.encode(input);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/bytes/bs58.js
var bs58_exports = {};
__export(bs58_exports, {
  decode: () => decode5,
  encode: () => encode6
});
import {
  decode as decode4,
  encode as encode5
} from "https://cdn.esm.sh/v54/bs58@4.0.1/deno/bs58.development.js";
function encode6(data) {
  return encode5(data);
}
function decode5(data) {
  return decode4(data);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/bytes/base64.js
var base64_exports = {};
__export(base64_exports, {
  decode: () => decode6,
  encode: () => encode7
});
import {
  fromByteArray as fromByteArray2,
  toByteArray as toByteArray2
} from "https://cdn.esm.sh/v54/base64-js@1.5.1/deno/base64-js.development.js";
function encode7(data) {
  return fromByteArray2(data);
}
function decode6(data) {
  return __Buffer$.from(toByteArray2(data));
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/program/index.js
var Program = class {
  constructor(idl, programId, provider = getProvider()) {
    this.idl = idl;
    this.provider = provider;
    programId = translateAddress(programId);
    this._programId = programId;
    this._coder = new Coder(idl);
    this._events = new EventManager(this._programId, provider, this._coder);
    const [rpc, instruction, transaction, account, simulate, state] = NamespaceFactory.build(idl, this._coder, programId, provider);
    this.rpc = rpc;
    this.instruction = instruction;
    this.transaction = transaction;
    this.account = account;
    this.simulate = simulate;
    this.state = state;
  }
  get programId() {
    return this._programId;
  }
  get coder() {
    return this._coder;
  }
  static async at(address, provider) {
    const programId = translateAddress(address);
    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) {
      throw new Error(`IDL not found for program: ${address.toString()}`);
    }
    return new Program(idl, programId, provider);
  }
  static async fetchIdl(address, provider) {
    provider = provider !== null && provider !== void 0 ? provider : getProvider();
    const programId = translateAddress(address);
    const idlAddr = await idlAddress(programId);
    const accountInfo = await provider.connection.getAccountInfo(idlAddr);
    if (!accountInfo) {
      return null;
    }
    let idlAccount = decodeIdlAccount(accountInfo.data.slice(8));
    const inflatedIdl = inflate(idlAccount.data);
    return JSON.parse(utf8_exports.decode(inflatedIdl));
  }
  addEventListener(eventName, callback) {
    return this._events.addEventListener(eventName, callback);
  }
  async removeEventListener(listener) {
    return await this._events.removeEventListener(listener);
  }
};

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/workspace.js
var _populatedWorkspace = false;
var workspace = new Proxy({}, {
  get(workspaceCache, programName) {
    if (isBrowser) {
      console.log("Workspaces aren't available in the browser");
      return void 0;
    }
    const fs = __fs$;
    const process = __process$;
    if (!_populatedWorkspace) {
      const path = __path$;
      let projectRoot = process.cwd();
      while (!fs.existsSync(path.join(projectRoot, "Anchor.toml"))) {
        const parentDir = path.dirname(projectRoot);
        if (parentDir === projectRoot) {
          projectRoot = void 0;
        }
        projectRoot = parentDir;
      }
      if (projectRoot === void 0) {
        throw new Error("Could not find workspace root.");
      }
      const idlFolder = `${projectRoot}/target/idl`;
      if (!fs.existsSync(idlFolder)) {
        throw new Error(`${idlFolder} doesn't exist. Did you use "anchor build"?`);
      }
      const idlMap = new Map();
      fs.readdirSync(idlFolder).forEach((file) => {
        const filePath = `${idlFolder}/${file}`;
        const idlStr = fs.readFileSync(filePath);
        const idl = JSON.parse(idlStr);
        idlMap.set(idl.name, idl);
        const name = camelCase6(idl.name, { pascalCase: true });
        if (idl.metadata && idl.metadata.address) {
          workspaceCache[name] = new Program(idl, new PublicKey5(idl.metadata.address));
        }
      });
      const anchorToml = parse(fs.readFileSync(path.join(projectRoot, "Anchor.toml"), "utf-8"));
      const clusterId = anchorToml.provider.cluster;
      if (anchorToml.programs && anchorToml.programs[clusterId]) {
        attachWorkspaceOverride(workspaceCache, anchorToml.programs[clusterId], idlMap);
      }
      _populatedWorkspace = true;
    }
    return workspaceCache[programName];
  }
});
function attachWorkspaceOverride(workspaceCache, overrideConfig, idlMap) {
  Object.keys(overrideConfig).forEach((programName) => {
    const wsProgramName = camelCase6(programName, { pascalCase: true });
    const entry = overrideConfig[programName];
    const overrideAddress = new PublicKey5(typeof entry === "string" ? entry : entry.address);
    let idl = idlMap.get(programName);
    if (typeof entry !== "string" && entry.idl) {
      idl = JSON.parse(__fs$.readFileSync(entry.idl, "utf-8"));
    }
    if (!idl) {
      throw new Error(`Error loading workspace IDL for ${programName}`);
    }
    workspaceCache[wsProgramName] = new Program(idl, overrideAddress);
  });
}
var workspace_default = workspace;

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/index.js
var utils_exports = {};
__export(utils_exports, {
  bytes: () => bytes_exports,
  features: () => features_exports,
  publicKey: () => pubkey_exports,
  rpc: () => rpc_exports,
  sha256: () => sha256_exports,
  token: () => token_exports
});

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/sha256.js
var sha256_exports = {};
__export(sha256_exports, {
  hash: () => hash
});
import { sha256 as sha2565 } from "https://cdn.esm.sh/v54/js-sha256@0.9.0/deno/js-sha256.development.js";
function hash(data) {
  return sha2565(data);
}

// esm-build-eaa1a07c4624cc5282f691c9aeefbec623a7c1a5/node_modules/@project-serum/anchor/dist/esm/utils/token.js
var token_exports = {};
__export(token_exports, {
  associatedAddress: () => associatedAddress
});
import { PublicKey as PublicKey6 } from "https://cdn.esm.sh/v54/@solana/web3.js@1.29.2/deno/web3.development.js";
var TOKEN_PROGRAM_ID = new PublicKey6("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
var ASSOCIATED_PROGRAM_ID = new PublicKey6("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
async function associatedAddress({ mint, owner }) {
  return (await PublicKey6.findProgramAddress([owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()], ASSOCIATED_PROGRAM_ID))[0];
}
export {
  AccountClient,
  AccountsCoder,
  default2 as BN,
  Coder,
  EventCoder,
  EventManager,
  EventParser,
  IdlError,
  InstructionCoder,
  Program,
  ProgramError,
  Provider,
  StateClient,
  StateCoder,
  TypesCoder,
  NodeWallet as Wallet,
  getProvider,
  parseIdlErrors,
  setProvider,
  splitArgsAndCtx,
  toInstruction,
  translateAddress,
  utils_exports as utils,
  validateAccounts,
  web3_1 as web3,
  workspace_default as workspace
};