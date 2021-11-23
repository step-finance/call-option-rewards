const fs = require('fs/promises');

(async () => {

try {
    const files = await fs.readdir('../input/');
    var output = '';
    for (file of files) {
        if (!file.startsWith('all-payers-devtest'))
            continue;
        const ts = 1;//file.split('-')[3].split('.')[0];
        const data = await fs.readFile('../input/' + file, {encoding: 'utf8'});
        const obj = JSON.parse(data);
        for (row of obj.payerTotals) {
            output += (ts + ',' + row.pubkey + ',' + row.amount + ',' + row.percentage + '\n');
        }
    }
    await fs.writeFile('../output/all-payers-devtest.csv', output);
} catch (err) {
    console.error(err);
}

})();