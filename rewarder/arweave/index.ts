//import { Buffer } from "https://deno.land/std@0.76.0/node/buffer.ts";

//import Arweave from "https://cdn.skypack.dev/arweave?dts"
//import { ArweaveSigner, bundleAndSignData, createData } from "https://cdn.skypack.dev/arbundles?dts";
import Arweave from "https://esm.sh/arweave?dev&no-check"
import { ArweaveSigner, bundleAndSignData, createData, DataItem } from "https://esm.sh/arbundles?dev&no-check";

const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

const myTags = [
        { name: 'App-Vendor', value: 'Step' },
        { name: 'App-Name', value: 'Step-Call-Option' },
        { name: 'App-Version', value: '0.1.0' },
        { name: 'Content-Type', value: 'application/json' },
];

export async function uploadToArweave(key: any, data: any) {
	const signer: typeof ArweaveSigner = new ArweaveSigner(key);
    
    const dataItem: typeof DataItem = createData("some message", signer);
    await dataItem.sign(key);
    const tx = dataItem.sendToBundler();

	// const myBundle = await bundleAndSignData(d, key);
	// const tx = await myBundle.toTransaction(arweave, key);
	// await arweave.transactions.sign(tx, key);
	// console.log(`Posting bundle with tx id: ${tx.id}`);
	// console.log(await arweave.transactions.post(tx));
	// console.log(`Posted bundle with tx id: ${tx.id}`);
	// console.log(await arweave.transactions.getStatus(tx.id))

    return tx.id;
}