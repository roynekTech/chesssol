// zk_create.js

require("dotenv").config();
const { Keypair, PublicKey } = require("@solana/web3.js");
const { createRpc, airdropSol } = require("@lightprotocol/stateless.js");
const { createMint } = require("@lightprotocol/compressed-token");
const fs = require("fs");
require("dotenv").config();


// Load environment variables
const API_KEY = process.env.HELIUS_API_KEY;
console.log("API KEY: ", API_KEY)
const RPC_ENDPOINT = `https://devnet.helius-rpc.com?api-key=${API_KEY}`;

// Initialize RPC connection
const rpc = createRpc(RPC_ENDPOINT);

// Generate a new wallet keypair
const wallet = Keypair.generate();

// Save the wallet keypair to a file for future use
fs.writeFileSync("wallet.json", JSON.stringify(Array.from(wallet.secretKey)));

// Airdrop SOL to the wallet
(async () => {
  console.log("Airdropping SOL to the wallet...");
  await airdropSol({
    connection: rpc,
    lamports: 1e9, // 1 SOL
    recipientPublicKey: wallet.publicKey,
  });

  // Create a new compressed token mint
  // console.log("Creating compressed token mint...");
  // const mintAddress = await createMint(rpc, wallet);
  // console.log("Raw mintAddress:", mintAddress);

  // console.log("Compressed Token Mint Address:", mintAddress.toBase58());

  // // Save the mint address to a file for future use
  // fs.writeFileSync("mint_address.txt", mintAddress.toBase58());

  // Create a new compressed token mint
console.log("Creating compressed token mint...");
const result = await createMint(rpc, wallet);

// Extract the mint public key
const mintAddress = result.mint;

console.log("Compressed Token Mint Address:", mintAddress.toBase58());

// Save the mint address to a file for future use
fs.writeFileSync("mint_address.txt", mintAddress.toBase58());


fs.writeFileSync("mint_data.json", JSON.stringify({
  mintAddress: mintAddress.toBase58(),
  transactionSignature: result.transactionSignature
}, null, 2));




})();
