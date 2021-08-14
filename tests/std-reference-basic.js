const anchor = require('@project-serum/anchor');
const axios = require('axios');

const { Client, Transaction, Message, Wallet, Obi } = require("@bandprotocol/bandchain.js");
const { MsgRequestData } = Message;
const { PrivateKey } = Wallet;

const bandchain = new Client("http://rpc-laozi-testnet2.bandchain.org:8080");
const band_requester_privkey = PrivateKey.fromMnemonic("oatoat");
const band_requester_pubkey = band_requester_privkey.toPubkey();
const band_requester_address = band_requester_pubkey.toAddress();

const symbols = ["BAND", "ALPHA", "MATIC", "LUNA", "ANC", "MIR", "ETH", "BTC", "DOGE", "DOT", "BCH", "XRP", "XLM", "BNB",
                 "SOL", "USDT", "UST"];
    // "BZRX",
    // "SRM",
    // "SNT",
    // "SOL",
    // "CKB",
    // "BNT",
    // "CRV",
    // "MANA",
    // "KAVA",
    // "MATIC",
    // "TRB",
    // "REP",
    // "FTM",
    // "TOMO",
    // "ONE",
    // "WNXM",
    // "PAXG",
    // "WAN",
    // "SUSD",
    // "RLC"];
const dataObi = new Obi(`{symbols:[string],multiplier:u64}/{rates:[u64]}`);
const priceKP = new anchor.web3.PublicKey("2CEyCps4YgurP4XCnr8QLQosz7fS1JdhxVfmoPdHg6HW");
const priceKeeper = anchor.web3.Keypair.generate();

const sleep = async (ms) => new Promise((r) => setTimeout(r, ms));

const encodeCalldata = (symbols, multiplier) => {
    const transformToObiStruct = {
        symbols: symbols,
        multiplier: multiplier,
    };
    return dataObi
        .encodeInput(transformToObiStruct)
        .toString("hex");
};

const decodeResult = (encoded) => {
    return dataObi.decodeOutput(encoded);
}

const requestDataAndGetResult = async () => {
    try {
        const band_account = await bandchain.getAccount(band_requester_address.toAccBech32());
        const chain_id = await bandchain.getChainId();

        const oracle_script_id = 37;

        const multiplier = 1000000
        const calldata = encodeCalldata(symbols, multiplier);

        console.log('Submitting request to BandChain');
        const tx = new Transaction()
            .withMessages(
                new MsgRequestData(
                    oracle_script_id,
                    Buffer.from(calldata, "hex"),
                    1,
                    1,
                    "FromBandChainJSAndSolanaAnchor",
                    band_requester_address.toAccBech32(),
                    [],
                    500000,
                    1000000,
                ).toAny()
            )
            .withAccountNum(band_account.accountNumber)
            .withSequence(band_account.sequence)
            .withChainId(chain_id)
            .withGas(10000000)
            .withMemo("");

        const signDoc = tx.getSignDoc(band_requester_pubkey);
        const signature = band_requester_privkey.sign(signDoc);
        const txRawBytes = tx.getTxData(signature, band_requester_pubkey)

        const txResult = await bandchain.sendTxBlockMode(txRawBytes);
        console.log("BandChain TX Hash:", txResult.txhash);

        const [requestID] = await bandchain.getRequestIdByTxHash(txResult.txhash);
        console.log("BandChain Request ID:", requestID);

        let result;
        let max_retry = 15;
        while (max_retry > 0) {
            max_retry--;
            try {
                const response = await axios.get(
                    "https://laozi-testnet2.bandchain.org/oracle/proof/" + requestID
                );
                if (response.status !== 200) {
                    await sleep(2000);
                } else {
                    result = response.data.result.proof.oracle_data_proof.result;
                    break;
                }
            } catch(err) {
                if (err.isAxiosError && err.response && err.response.status !== 404) {
                    console.error(err.response.data);
                } else if (!err.isAxiosError) {
                    console.error(err.message);
                }
                await sleep(2000);
            }
        }
        return result;
    } catch (e) {
        console.log(e);
        return null;
    }
};

const randomNumberFromInterval = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const getRandomCoins = (amount) => {
    let data = [];
    for (let i=0; i<amount; i++) {
        data.push({
            symbol: [randomNumberFromInterval(65, 90), randomNumberFromInterval(65, 90), randomNumberFromInterval(65, 90), 0, 0, 0, 0, 0],
            rate: new anchor.BN(randomNumberFromInterval(1, 20000)),
            lastUpdated: new anchor.BN(randomNumberFromInterval(100000, 1000000)),
            requestId: new anchor.BN(randomNumberFromInterval(100000, 1000000)),
        })
    }
    return data;
}

describe('solana-anchor-std-reference', () => {
    // Configure the client to use the local cluster.
    anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));
    const ownAccount = anchor.web3.Keypair.fromSecretKey(new Uint8Array([240,155,255,39,108,80,168,176,56,158,251,210,223,179,250,254,112,96,83,112,220,120,86,120,169,92,56,69,223,93,59,15,146,211,238,79,76,56,128,74,21,38,9,35,21,216,164,153,174,113,31,81,222,91,134,39,196,97,117,187,73,111,164,149]));
    console.log("Price Keeper:", priceKeeper.publicKey.toBase58());

    it('Initialize', async () => {
        const program = anchor.workspace.StdReferenceBasic;
        const stdReferenceSymbolsAmount = 40; // Specify this line
        const priceKeeperBytes = (stdReferenceSymbolsAmount * 32) + 32 + 1 + 12;

        const tx = await program.rpc.initialize(
            new anchor.BN(stdReferenceSymbolsAmount),
            ownAccount.publicKey,
            {
                accounts: {
                    priceKeeper: priceKeeper.publicKey,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                },
                instructions: [
                    await program.account.priceKeeper.createInstruction(priceKeeper, priceKeeperBytes),
                ],
                signers: [priceKeeper],
            }
        );
        console.log("TX hash: ", tx);
    });

    it('Relay', async () => {
        const result = await requestDataAndGetResult();
        const decodedResult = decodeResult(Buffer.from(result.result, 'base64'));
        let data = [];
        for (let i=0; i<symbols.length; i++) {
            const symbolArray = [...new Buffer.from(symbols[i], "ascii")];
            symbolArray.push(...Array.apply(null, new Array(8-symbols[i].length)).map(Number.prototype.valueOf,0));
            const rate = new anchor.BN(Number(decodedResult.rates[i]));
            const lastUpdated = new anchor.BN(Number(result.resolve_time));
            const requestId = new anchor.BN(Number(result.request_id));
            data.push({
                symbol: symbolArray,
                rate: rate,
                lastUpdated: lastUpdated,
                requestId: requestId,
            });
        }
        console.log("PriceKeeper to write:", priceKP.toBase58());

        const program = anchor.workspace.StdReferenceBasic;

        const tx = await program.rpc.relay(
            data,
            {
                accounts: {
                    priceKeeper: priceKP,
                    authority: ownAccount.publicKey,
                },
                signers: [ownAccount],
            }
        );

        console.log("Solana TX Hash:", tx);
    })

    it('Query', async () => {
        const program = anchor.workspace.StdReferenceBasic;
        const result = await program.account.priceKeeper.fetch(priceKP);
        const size = result.currentSize;
        for (let i=0; i<size; i++) {
            let price = result.prices[i];
            console.log(String.fromCharCode.apply(null, price.symbol), price.rate.toNumber()/1000000, price.lastUpdated.toNumber(), price.requestId.toNumber())
        }
    })

    it('Remove', async () => {
        const program = anchor.workspace.StdReferenceBasic;
        const symbols = ["DAI", "ATOM"];
        let data = [];
        for (let i=0; i<symbols.length; i++) {
            const symbolArray = [...new Buffer.from(symbols[i], "ascii")];
            symbolArray.push(...Array.apply(null, new Array(8-symbols[i].length)).map(Number.prototype.valueOf,0));
            data.push(symbolArray);
        }
        const tx = await program.rpc.remove(
            data,
            {
                accounts: {
                    priceKeeper: priceKeeper.publicKey,
                    authority: ownAccount.publicKey,
                },
                signers: [ownAccount],
            }
        )

        console.log("Solana TX Hash:", tx);
    })

    it('Transfer', async () => {
        const program = anchor.workspace.StdReferenceBasic;
        const result = await program.account.priceKeeper.fetch(priceKeeper.publicKey);
        console.log("Current owner:", result.authority.toBase58());
        const testAccount = anchor.web3.Keypair.fromSecretKey(new Uint8Array([252,101,88,20,83,209,171,0,101,132,175,33,196,254,80,102,204,113,236,236,219,138,36,119,37,207,66,130,229,147,131,167,104,36,49,205,204,190,176,146,249,195,127,246,252,23,89,202,81,184,95,194,131,9,82,40,28,75,11,33,242,248,110,245]))
        const tx = await program.rpc.transferOwnership(
            testAccount.publicKey,
            {
                accounts: {
                    priceKeeper: priceKeeper.publicKey,
                    authority: ownAccount.publicKey,
                },
                signers: [ownAccount],
            }
        )
        console.log("Solana TX Hash:", tx);
        const new_result = await program.account.priceKeeper.fetch(priceKeeper.publicKey);
        console.log("New owner:", new_result.authority.toBase58());
    })
});
