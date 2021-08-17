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
       const consumerDb = new anchor.web3.PublicKey("6XEjLZEMg2B5vF8dioh3EvNT1xkwXtLdHrmgqfW4NT6q");
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
        const consumerDb = new anchor.web3.PublicKey("6XEjLZEMg2B5vF8dioh3EvNT1xkwXtLdHrmgqfW4NT6q");
        const priceKeeper = new anchor.web3.PublicKey("E6nkeyqPNdQPYfViRBLM6CGzDzoSmVDyLaLymCkqmQsi");
        const queryResult = new anchor.web3.PublicKey("2ur4PXjtBhoMqvRdd9HiPMpqM5q27HJbUb8Lr4LDBKJG");
        const stdReferenceBasicProgram = new anchor.web3.PublicKey("5tzRFLg3xX8HKzar3irhpSsZoti4BRzmyGrAc8ncbfcr");

        const raw_symbol = "BAND";
        const symbolArray = [...new Buffer.from(raw_symbol, "ascii")];
        symbolArray.push(...Array.apply(null, new Array(8-raw_symbol.length)).map(Number.prototype.valueOf,0));

        const tx = await program.rpc.setPrice(
            symbolArray,
            {
                accounts: {
                    consumerDb: consumerDb,
                    authority: anchor.getProvider().wallet.publicKey,
                    queryResult: queryResult,
                    stdReferenceBasicProgram: stdReferenceBasicProgram,
                    priceKeeper: priceKeeper,
                }
            }
        );
        console.log("TX hash:", tx);
    });

    it('Query', async () => {
        const program = anchor.workspace.SimpleConsumer;
        console.log(program.programId.toBase58());
        const consumerDb = new anchor.web3.PublicKey("6XEjLZEMg2B5vF8dioh3EvNT1xkwXtLdHrmgqfW4NT6q");

        const result = await program.account.consumerDb.fetch(consumerDb);
        console.log(String.fromCharCode.apply(null, result.latestSymbol), result.latestPrice.toNumber()/1000000)
    })
});

