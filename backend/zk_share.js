// zk_share.js

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

// Load the mint address from the file
const mintAddress = new PublicKey(fs.readFileSync("mint_address.txt", "utf8"));

// CSV file path
const CSV_FILE = "zk_winners.csv";

// Track all transfers
let transferCount = 0;
let failureCount = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


fs.createReadStream(CSV_FILE)
  .pipe(csv())
  .on("data", async (row) => {
    const recipient = row.address.trim();
    const amount = Number(row.amount); // Assuming there's an 'amount' column

    try {
      const recipientPublicKey = new PublicKey(recipient);

      const txId = await transfer(
        rpc,
        wallet,               // Fee payer and sender
        mintAddress,          // Mint address of compressed token
        amount,               // Amount to transfer (in base units, e.g., 1e9 for 1 token if 9 decimals)
        wallet,               // Owner of source account
        recipientPublicKey    // Recipient's wallet address
      );

      console.log(`✅ Sent ${amount} tokens to ${recipient}. txId: ${txId}`);
      transferCount++;
      await sleep(10000); // sleep 1 second

    } catch (err) {
      console.error(`❌ Failed to send tokens to ${recipient}: ${err.message}`);
      failureCount++;
      await sleep(10000); // sleep 1 second

    }
  })
  .on("end", () => {
    console.log("🎉 Token transfer complete.");
    console.log(`✅ Success: ${transferCount} | ❌ Failed: ${failureCount}`);
  });
