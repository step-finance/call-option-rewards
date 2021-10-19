# Call Options Rewarder CLI

## Information

The Rewarder is an off-chain program that is run when call options are desired to be evenly distributed to our stakers.

This solution for rewarding requires an off-chain program to run when rewards are to be distributed.  This program will:
 - Collect metadata - who what when
 - Store metadata somewhere ideally (though not necessarily) decentralized
 - Generate a Merkle root
 - Create a reward account on-chain calling into the new CallOptionsRewards BPF program in ../anchor-bpf

## More Info

https://dana-hanna.gitbook.io/smart-contracts/#the-rewarder

## Executing

This program uses [Deno](https://deno.land/) and can be run using standard `deno` commands.

```bash
deno run --allow-all mod.ts 
```

## USAGE:

|Flag|Description|Default|
|---|---|---|
|--url|The url to the rpc node.|`https://api.mainnet-beta.solana.com/`|
|--user|A user to authenticate (basic auth) to the node.|_none_|
|--pass|The password to use to authenticate. Must be used in coordication with --user.|_none_|
|--start|The unix timestamp (in seconds) for the end of the rewards period; inclusive.|_1 week ago_|
|--end|The unix timestamp (in seconds) for the end of the rewards period; exclusive.|_now_|
|--amt|The amount of STEP call options to distribute.|_1,000,000,000 (1 STEP)_|
