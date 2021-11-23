const fs = require('fs/promises');

(async () => {

try {
    const files = await fs.readdir('../working/combine/');
    const pools = new Map();
    for (file of files) {
        const data = await fs.readFile('../working/combine/' + file, {encoding: 'utf8'});
        for (pool of JSON.parse(data)) {
            //translate payers to a map
            pool.payers = pool.payers.reduce((p,n)=>p.set(n.pubkey, n), new Map());
            if (!pools.has(pool.pubkey)) {
                pools.set(pool.pubkey, pool);
            } else {
                const existing = pools.get(pool.pubkey);
                existing.feesPaid = (parseInt(existing.feesPaid) + parseInt(pool.feesPaid)).toString();
                for (payer of pool.payers.values()) {
                    if (!existing.payers.has(payer.pubkey)) {
                        existing.payers.set(payer.pubkey, payer)
                    } else {
                        //note percentage doesn't matter in this file, so I'm not updating
                        existingPayer = existing.payers.get(payer.pubkey);
                        existingPayer.amount = (parseInt(existingPayer.amount) + parseInt(payer.amount)).toString();
                    }
                }
            }
        }
    }
    poolsObj = Array.from(pools.values()).map(a => {
        a.payers = Array.from(a.payers.values());
        return a;
    });
    await fs.writeFile('../output/combined.json', JSON.stringify(poolsObj, null, 2));
} catch (err) {
    console.error(err);
}

})();