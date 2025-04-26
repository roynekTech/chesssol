require('dotenv').config(); // Load environment variables from .env file
const { transferSol } = require('./solanaUtils'); // Assuming transferSol is in solanaUtils.js

async function testTransfer() {
  const walletAddress = 'recipient_wallet_address_here'; // Replace with a real recipient address
  const amount = 0.1; // Amount of SOL to transfer (in SOL)

  console.log('Starting transfer test...');

  const result = await transferSol(walletAddress, amount);

  if (result.success) {
    console.log(`Transfer successful! Signature: ${result.signature}`);
  } else {
    console.error('Transfer failed:', result.error);
  }
}

testTransfer();
