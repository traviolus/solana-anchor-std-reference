const anchor = require('@project-serum/anchor');
anchor.setProvider(anchor.Provider.local("https://api.devnet.solana.com"));

async function main() {
  const ownAccount = anchor.web3.Keypair.fromSecretKey(new Uint8Array([240,155,255,39,108,80,168,176,56,158,251,210,223,179,250,254,112,96,83,112,220,120,86,120,169,92,56,69,223,93,59,15,146,211,238,79,76,56,128,74,21,38,9,35,21,216,164,153,174,113,31,81,222,91,134,39,196,97,117,187,73,111,164,149]));
  const program = anchor.workspace.StdReferenceBasic;
  const priceKeeper = anchor.web3.Keypair.generate();
  const stdReferenceSymbolsAmount = 50; // Specify this line
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
}

console.log('Deploying...');
main().then(() => console.log('Success'));
