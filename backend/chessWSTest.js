// Full Test Script with Betting Transactions

const WebSocket = require('ws');

// Test Data
const wsUrl = 'ws://your-server-address/chesssol/backend/ws';
const companyAddress = 'che8nUkgbX8RLgMsouwVoa6ezdGgTkpU2vZc6kxJ7UH';

// Simulate wallets and their transaction hashes
const wallet1 = '0xWalletAddress1';
const wallet2 = '0xWalletAddress2';

// Assume you already transferred funds to the company address and have transaction IDs
const transactionId1 = 'txhash_wallet1_to_company';
const transactionId2 = 'txhash_wallet2_to_company';

// Amount each player is betting
const playerAmount = 0.5; // example value

let gameId = null;
let playerColor = null;

const ws1 = new WebSocket(wsUrl);
const ws2 = new WebSocket(wsUrl);

// Utility: Send message after WebSocket is ready
function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    ws.on('open', () => ws.send(JSON.stringify(message)));
  }
}

// Player 1 actions
ws1.on('open', () => {
  console.log('Wallet1 connected. Creating betting game...');
  
  // Create Game (with betting)
  sendWhenReady(ws1, {
    type: 'create',
    walletAddress: wallet1,
    side: 'w', // or "random"
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
    console.log(`Game created! Game ID: ${gameId}`);
    
    // After game created, have Wallet2 join it
    setTimeout(() => {
      console.log('Wallet2 connecting and joining the game...');
      sendWhenReady(ws2, {
        type: 'join',
        gameId: gameId,
        walletAddress: wallet2,
        transactionId: transactionId2,
        playerAmount: playerAmount
      });
    }, 2000); // small delay to simulate real flow
  }

  if (message.type === 'move') {
    console.log('Move acknowledged by server for Wallet1.');
  }

  if (message.type === 'gameEnded') {
    console.log('Game ended:', message.reason);
    ws1.close();
    ws2.close();
  }
});

ws1.on('close', () => console.log('Wallet1 WebSocket closed.'));
ws1.on('error', (error) => console.error('Wallet1 Error:', error));

// Player 2 actions
ws2.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('Wallet2 received:', message);

  if (message.type === 'joined') {
    console.log('Wallet2 joined the game successfully!');
    
    // Now make a move (player 1 move first if w)
    setTimeout(() => {
      if (playerColor === 'w') {
        sendWhenReady(ws1, {
          type: 'move',
          gameId: gameId,
          walletAddress: wallet1,
          move: 'e2e4',
          fen: message.fen,
          initialFen: message.fen
        });
      } else {
        sendWhenReady(ws2, {
          type: 'move',
          gameId: gameId,
          walletAddress: wallet2,
          move: 'e7e5',
          fen: message.fen,
          initialFen: message.fen
        });
      }
    }, 3000);

    // Then after some moves, resign
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
