# Call Options Rewarder CLI

## Information

The Rewarder is an off-chain program that is run when call options are desired to be evenly distributed to our stakers.

This solution for rewarding requires an off-chain program to run when rewards are to be distributed.  This program will:
 - Collect metadata - who what when
 - Store metadata somewhere ideally (though not necessarily) decentralized
 - Generate a Merkle root
 - Create a reward account on-chain calling into the new CallOptionsRewards BPF program in ../anchor-bpf

## More Technical Info

https://dana-hanna.gitbook.io/smart-contracts/#the-rewarder

## Prereqs

This program requires [Deno](https://deno.land/) and [arkb](https://github.com/textury/arkb)

## Executing

This program uses [Deno](https://deno.land/) and can be run using standard `deno` commands.

`--allow-all` is required to use network and disk
`--location https://something.com` is required to use some dependency in the big graph

Example:

```bash
deno run --allow-all --location https://step.finance ./mod.ts --url https://api.devnet.solana.com --amt 10000000 --testing-limit 5 --start 1634750421 --end 1634751421 --arkey /home/danah/keys/programs/step/arweave-keyfile-72VjoqyIw72wf1TjNVL2mhuEvFRrGFsd5Od-TXY7x34.json --key /home/danah/keys/DANaDcytXrsCDtEfTRVZGzw2MfC2CijdW4tkGfP74iwL.json --index 2
```

## USAGE:

|Flag|Description|Default|
|---|---|---|
|--url|The url to the rpc node.|`https://api.mainnet-beta.solana.com/`|
|--user|A user to authenticate (basic auth) to the node.|_optional_|
|--pass|The password to use to authenticate. Must be used in coordication with --user.|_optional_|
|--amt|The amount of STEP call options to distribute.|_1,000,000,000 (1 STEP)_|
|--price|The strike price in USDC per 1e<mint decimals>. (value of 1_000_000_000 would mean $1 = 1 token)|_1,000,000,000_|
|--expiry|The unix timestamp (in seconds) for the expiry of the call option.|_end + 1 week_|
|--start|The unix timestamp (in seconds) for the end of the rewards period; inclusive.|_1 week ago_|
|--end|The unix timestamp (in seconds) for the end of the rewards period; exclusive.|_now_|
|--index|The unique identifier number for this contract on the solana chain (key is [writer, mint, index]).|_none, required_|
|--resume|A pool-fees-paid.json file from a prior run to resume using.|_optional_|
|--testing-limit|The number of pools to include.|_999999999_|
|--key|The path to a keypair to use for writing to the solana chain.|_empty; no onchain creation_|
|--arkey|The path to an arweave keypair to use for writing to the arweave chain.|_empty; no file creation_|

