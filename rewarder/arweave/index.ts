export async function testArkbInstalled() {
    try {
        const p = Deno.run({cmd:["arkb"], stdout: 'piped', stderr: 'piped', stdin: 'null'});
        const stat = await p.status();
        if (!stat.success) {
            const output = new TextDecoder().decode(await p.output());
            console.log("arweave output", output);
            throw "Arweave Error";
        }
    } catch (e) {
        console.error(e);
        throw "Error from arkb execution. Do you have arkb installed? See https://github.com/textury/arkb."
    }
}

export async function uploadToArweave(keyFile: any, dataFile: any) {
    /*
    arkb deploy ./output/claims.json -w 
    ~/keys/programs/step/arweave-keyfile-72VjoqyIw72wf1TjNVL2mhuEvFRrGFsd5Od-TXY7x34.json  
    --tag-name App-Vendor --tag-value Step --tag-name App-Name --tag-value Step-Call-Option 
    --tag-name App-Version --tag-value 0.1.0 --tag-name Content-Type --tag-value application/json
    */
    const p = Deno.run(
        { 
            cmd: [ 
                "arkb", 
                "deploy", 
                dataFile, 
                "--auto-confirm",
                "-w", 
                keyFile,
                "--tag-name",
                "App-Vendor",
                "--tag-value",
                "Step",
                "--tag-name",
                "App-Name",
                "--tag-value",
                "Step-Call-Option",
                "--tag-name",
                "App-Version",
                "--tag-value",
                "0.1.0",
                "--tag-name",
                "Content-Type",
                "--tag-value",
                "application/json",
            ],
            stdout: 'piped',
            stderr: 'piped',
            stdin: 'null',
        }
    );
    const stat = await p.status();
    const output = new TextDecoder().decode(await p.output());
    await Deno.writeTextFile("output/arweave.log", output);

    if (!stat.success) {
        console.log("arweave output", output);
        throw "Arweave Error";
    }

    //arkb output, last line is blank, second to last is our url
    const lines = output.split(/\r?\n/);
    let url = lines[lines.length-2];
    //arweave ouput has color codes - this trims them out
    url = url.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

    console.log("arweave url", url);

    if (!stat.success) {
        throw "Arweave Error";
    }
    return url;
    
}


//Error from arkb execution. Do you have arkb installed? Is the AR wallet valid?