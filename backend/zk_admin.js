const { getCompressedTokenAccounts } = require("@lightprotocol/compressed-token");

require("dotenv").config();
const { Keypair, PublicKey } = require("@solana/web3.js");
const { createRpc, confirmTx } = require("@lightprotocol/stateless.js");
const { transfer } = require("@lightprotocol/compressed-token");
const fs = require("fs");
const csv = require("csv-parser");

// Load environment variables
const API_KEY = process.env.HELIUS_API_KEY;
const RPC_ENDPOINT = `https://devnet.helius-rpc.com/?api-key=${API_KEY}`;

// Initialize RPC connection
const rpc = createRpc(RPC_ENDPOINT);

// Load the wallet keypair from the file
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync("wallet.json")));
const wallet = Keypair.fromSecretKey(secretKey);


(async () => {
  const accounts = await getCompressedTokenAccounts(rpc, wallet.publicKey);
  console.log("Compressed token accounts for wallet:");
  console.log(accounts);
})();



//*************************************** */


/* import { Rpc, confirmTx, createRpc } from "@lightprotocol/stateless.js";
import { createMint, mintTo, transfer } from "@lightprotocol/compressed-token";
import { Keypair } from "@solana/web3.js";
import { PAYER_KEYPAIR, RPC_ENDPOINT } from "../constants";
const payer = PAYER_KEYPAIR;
const tokenRecipient = Keypair.generate();

/// Localnet, expects `light test-validator` to be running:
// const connection: Rpc = createRpc();

/// Uncomment to use env:
const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT);

(async () => {
  /// airdrop lamports to pay fees
  // await confirmTx(
  //   connection,
  //   await connection.requestAirdrop(payer.publicKey, 1e7)
  // );

  await confirmTx(
    connection,
    await connection.requestAirdrop(tokenRecipient.publicKey, 1e5)
  );
  /// Create compressed-token mint
  const { mint, transactionSignature } = await createMint(
    connection,
    payer,
    payer.publicKey,
    9
  );

  console.log(`create-mint success! txId: ${transactionSignature}`);

  /// Mint compressed tokens
  const mintToTxId = await mintTo(
    connection,
    payer,
    mint,
    payer.publicKey,
    payer,
    1e7
  );

  console.log(`mint-to success! txId: ${mintToTxId}`);

  /// Transfer compressed tokens
  const transferTxId = await transfer(
    connection,
    payer,
    mint,
    7e5,
    payer,
    tokenRecipient.publicKey
  );

  console.log(`transfer success! txId: ${transferTxId}`);
})(); */