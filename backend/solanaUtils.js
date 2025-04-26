// require('dotenv').config(); // Load environment variables from .env file

require('dotenv').config({ path: __dirname + '/.env' });

const { Connection, PublicKey, SystemProgram, Keypair, Transaction } = require('@solana/web3.js');
const { LAMPORTS_PER_SOL } = require('@solana/web3.js'); // 1 SOL = 1,000,000,000 lamports
const { transferSol } = require('./solanaUtils'); // Custom function

async function transferSol(walletAddress, amount) {
  try {
    // Create a connection to the Solana cluster
    // const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');


    // Get the wallet's private key from the .env file
    const privateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
    const secretKey = Uint8Array.from(JSON.parse(privateKey)); // Assuming private key is stored as a JSON array
    const fromWallet = Keypair.fromSecretKey(secretKey);

    // Convert the wallet address to a PublicKey
    const toWallet = new PublicKey(walletAddress);

    // Create a transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.publicKey,
        toPubkey: toWallet,
        lamports: amount * LAMPORTS_PER_SOL, // Convert SOL to lamports
      })
    );

    // Send the transaction and wait for confirmation
    const signature = await connection.sendTransaction(transaction, [fromWallet]);
    await connection.confirmTransaction(signature, 'confirmed');

    console.log(`Transaction successful! Signature: ${signature}`);
    return { success: true, signature };
  } catch (error) {
    console.error('Error transferring SOL:', error);
    return { success: false, error };
  }
}

module.exports = { transferSol };
