// zk_share.js

require("dotenv").config();
const { Keypair, PublicKey } = require("@solana/web3.js");
const { createRpc } = require("@lightprotocol/stateless.js");
const { sendCompressedTokens } = require("@lightprotocol/compressed-token");
const fs = require("fs");
const csv = require("csv-parser");

// Load environment variables
const API_KEY = process.env.HELIUS_API_KEY;
const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${API_KEY}`;

// Initialize RPC connection
const rpc = createRpc(RPC_ENDPOINT);

// Load the wallet keypair from the file
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync("wallet.json")));
const wallet = Keypair.fromSecretKey(secretKey);

// Load the mint address from the file
const mintAddress = new PublicKey(fs.readFileSync("mint_address.txt", "utf8"));

// Read the list of winners from the CSV file
const winners = [];
fs.createReadStream("zk_winners.csv")
  .pipe(csv())
  .on("data", (row) => {
    winners.push({
      address: row.address,
      amount: parseInt(row.amount),
    });
  })
  .on("end", async () => {
    console.log("Distributing tokens to winners...");

    for (const winner of winners) {
      const recipient = new PublicKey(winner.address);
      const amount = winner.amount;

      try {
        await sendCompressedTokens(rpc, wallet, mintAddress, recipient, amount);
        console.log(`Sent ${amount} tokens to ${recipient.toBase58()}`);
      } catch (error) {
        console.error(`Failed to send tokens to ${recipient.toBase58()}:`, error);
      }
    }

    console.log("Token distribution complete.");
  });
