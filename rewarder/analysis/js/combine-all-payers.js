const fs = require('fs/promises');

const GROUP_SIZE = 5;

(async () => {

try {
    const files = await fs.readdir('../input/');
    let counter = 1;
    let ts;
    let currentPayers;
    for (file of files) {
        if (!file.startsWith('all-payers')) {
            continue;
        }
        const data = JSON.parse(await fs.readFile('../input/' + file, {encoding: 'utf8'}));
        if (counter == 1) {
            ts = file.split('-')[2].split('.')[0];
            currentPayers = data.payerTotals.reduce((p,n)=>p.set(n.pubkey, n), new Map());
        } else {
            for (const payer of data.payerTotals) {
                if (!currentPayers.has(payer.pubkey)) {
                    currentPayers.set(payer.pubkey, payer);
                } else {
                    let p = currentPayers.get(payer.pubkey);
                    p.amount = (parseInt(p.amount) + parseInt(payer.amount)).toString();
                }
            }
            if (counter == GROUP_SIZE) {
                //write the file
                const grandTotal = Array.from(currentPayers.values()).reduce((p,n)=>p+=parseInt(n.amount), 0);
                const payerTotals = [];
                for (const payer of currentPayers.values()) {
                    payer.percentage = parseInt(payer.amount) / grandTotal;
                    payerTotals.push(payer);
                }
                const outData = {
                    grandTotal,
                    payerTotals
                };
                await fs.writeFile('../output/all-payers-combined-' + GROUP_SIZE + '-' + ts + '.json', JSON.stringify(outData, null, 2));
                counter = 0;
            }
        }
        counter++;
    }
} catch (err) {
    console.error(err);
}

})();