const anchor = require('@project-serum/anchor');

describe('solana-anchor-simple-consumer', () => {
    anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));

    it('Initialize', async () => {
       const program = anchor.workspace.SimpleConsumer;
       const consumer_db = anchor.web3.Keypair.generate();

       const tx = await program.rpc.initialize(
           anchor.getProvider().wallet.publicKey,
           {
               accounts: {
                   consumerDb: consumer_db.publicKey,
                   rent: anchor.web3.SYSVAR_RENT_PUBKEY,
               },
               instructions: [
                   await program.account.consumerDb.createInstruction(consumer_db),
               ],
               signers: [consumer_db],
           }
       );
       console.log("TX hash:", tx);
       console.log("Consumer DB:", consumer_db.publicKey.toBase58());
    });

    it('Transfer', async () => {
       const program = anchor.workspace.SimpleConsumer;
       const consumerDb = new anchor.web3.PublicKey("648D14gbzXc4CFCxMp7zqUxnUxPh9sju5MFTji5Ld3ex");
       const result = await program.account.consumerDb.fetch(consumerDb);
       console.log("Current owner:", result.authority.toBase58());

       const testAccount = anchor.web3.Keypair.fromSecretKey(new Uint8Array([252,101,88,20,83,209,171,0,101,132,175,33,196,254,80,102,204,113,236,236,219,138,36,119,37,207,66,130,229,147,131,167,104,36,49,205,204,190,176,146,249,195,127,246,252,23,89,202,81,184,95,194,131,9,82,40,28,75,11,33,242,248,110,245]))
       const tx = await program.rpc.transferOwnership(
           testAccount.publicKey,
           {
               accounts: {
                   consumerDb: consumerDb,
                   authority: anchor.getProvider().wallet.publicKey,
               },
           }
       )
       console.log("Solana TX Hash:", tx);
       const new_result = await program.account.consumerDb.fetch(consumerDb);
       console.log("New owner:", new_result.authority.toBase58());
    });

    it('SetPrice', async () => {
        const program = anchor.workspace.SimpleConsumer;
        const consumerDb = new anchor.web3.PublicKey("648D14gbzXc4CFCxMp7zqUxnUxPh9sju5MFTji5Ld3ex");
        const priceKeeper = new anchor.web3.PublicKey("2CEyCps4YgurP4XCnr8QLQosz7fS1JdhxVfmoPdHg6HW");

        const raw_symbol = "WAN";
        const symbolArray = [...new Buffer.from(raw_symbol, "ascii")];
        symbolArray.push(...Array.apply(null, new Array(8-raw_symbol.length)).map(Number.prototype.valueOf,0));

        const tx = await program.rpc.setPrice(
            symbolArray,
            {
                accounts: {
                    consumerDb: consumerDb,
                    authority: anchor.getProvider().wallet.publicKey,
                    priceKeeper: priceKeeper,
                }
            }
        );
        console.log("TX hash:", tx);
    });

    it('Query', async () => {
        const program = anchor.workspace.SimpleConsumer;
        console.log(program.programId.toBase58());
        const consumerDb = new anchor.web3.PublicKey("648D14gbzXc4CFCxMp7zqUxnUxPh9sju5MFTji5Ld3ex");

        const result = await program.account.consumerDb.fetch(consumerDb);
        console.log(String.fromCharCode.apply(null, result.latestSymbol), result.latestPrice.toNumber()/1000000)
    })
});

