// Improved Full Test Script with Transfers and Betting

require('dotenv').config();
const WebSocket = require('ws');
const { transferSol } = require('./solanaUtils');

// Setup
// const wsUrl = 'ws://your-server-address/chesssol/backend/ws';
const wsUrl = 'ws://localhost:3000/chesssol/backend/ws';
const companyAddress = 'che8nUkgbX8RLgMsouwVoa6ezdGgTkpU2vZc6kxJ7UH';

// Test wallets (assumed dummy for test, or real on devnet)
const wallet1 = 'tesmg9WugyDHVF47nRf8rJnhkvMaddeVi1GEU4kPMKy';
const wallet2 = 'tesqs2B7YjmuZyPGtsXm1TuuJLB1tZFrHuZhuLeRhpq';

// Betting amount per player (in SOL)
const playerAmount = 1; // small amount for test

// WebSocket instances
const ws1 = new WebSocket(wsUrl);
const ws2 = new WebSocket(wsUrl);

let gameId = null;
let playerColor = null;
let transactionId1 = null;
let transactionId2 = null;

// Helpers
async function transferFromMainWalletTo(walletAddress, amount, from=null) {
  console.log(`Transferring ${amount} SOL to ${walletAddress}...`);
  const result = await transferSol(walletAddress, amount, from);
  if (result.success) {
    console.log(`Transfer complete! Transaction: ${result.signature}`);
    return result.signature;
  } else {
    throw new Error(`Transfer failed: ${result.error.message}`);
  }
}

function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    ws.on('open', () => ws.send(JSON.stringify(message)));
  }
}

// Main test sequence
async function runTest() {
  try {
    // Step 1: Transfer funds from Main Wallet to Company Address (simulate wallet1 and wallet2 payment)
    transactionId1 = await transferFromMainWalletTo(companyAddress, playerAmount, wallet1);
    transactionId2 = await transferFromMainWalletTo(companyAddress, playerAmount, wallet2);

    // Step 2: Connect wallet1 and create game
    ws1.on('open', () => {
      console.log('Wallet1 WebSocket connected. Creating game...');
      sendWhenReady(ws1, {
        type: 'create',
        walletAddress: wallet1,
        side: 'w', // w for white, b for black, random optional
        duration: 600000,
        isBetting: true,
        transactionId: transactionId1,
        playerAmount: playerAmount
      });
    });

    ws1.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('Wallet1 received:', message);

      if (message.type === 'created') {
        gameId = message.gameId;
        playerColor = message.color;
        console.log(`Game created with ID: ${gameId} and color: ${playerColor}`);

        // Wallet2 joins after game creation
        setTimeout(() => {
          console.log('Wallet2 connecting to join the game...');
          sendWhenReady(ws2, {
            type: 'join',
            gameId: gameId,
            walletAddress: wallet2,
            transactionId: transactionId2,
            playerAmount: playerAmount
          });
        }, 2000); // 2-second delay
      }

      if (message.type === 'move') {
        console.log('Wallet1 move acknowledged.');
      }

      if (message.type === 'gameEnded') {
        console.log('Game ended:', message.reason);
        ws1.close();
        ws2.close();
      }
    });

    ws1.on('close', () => console.log('Wallet1 WebSocket closed.'));
    ws1.on('error', (error) => console.error('Wallet1 Error:', error));

    // Wallet2 actions
    ws2.on('message', (data) => {
      const message = JSON.parse(data);
      console.log('Wallet2 received:', message);

      if (message.type === 'joined') {
        console.log('Wallet2 successfully joined!');

        // Make first move depending on who is white
        setTimeout(() => {
          const moveMessage = {
            type: 'move',
            gameId: gameId,
            walletAddress: playerColor === 'w' ? wallet1 : wallet2,
            move: playerColor === 'w' ? 'e2e4' : 'e7e5',
            fen: message.fen,
            initialFen: message.fen
          };
          const moverWs = playerColor === 'w' ? ws1 : ws2;
          sendWhenReady(moverWs, moveMessage);
        }, 3000); // wait 3s before move

        // Resign after 8 seconds
        setTimeout(() => {
          console.log('Wallet2 resigning...');
          sendWhenReady(ws2, {
            type: 'resign',
            gameId: gameId,
            playerId: wallet2
          });
        }, 8000);
      }
    });

    ws2.on('close', () => console.log('Wallet2 WebSocket closed.'));
    ws2.on('error', (error) => console.error('Wallet2 Error:', error));

  } catch (err) {
    console.error('Test sequence failed:', err);
    process.exit(1);
  }
}

// Run everything
runTest();
