const WebSocket = require('ws');
const readline = require('readline');

// const wsUrl = 'ws://localhost:3000/chesssol/backend/ws';
let wsUrl = `ws://20.208.128.130:3000/chesssol/backend/ws`;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function generatePlayerId(index) {
  return `player_${index}_${Math.random().toString(36).substring(2, 8)}`;
}

rl.question('How many WebSocket connections do you want to create? ', (answer) => {
  const socketCount = parseInt(answer, 10);

  if (isNaN(socketCount) || socketCount <= 0) {
    console.log('Invalid number. Exiting...');
    rl.close();
    return;
  }

  console.log(`Creating ${socketCount} WebSocket connections...`);

  const sockets = [];

  for (let i = 0; i < socketCount; i++) {
    const playerId = generatePlayerId(i);
    const socket = new WebSocket(wsUrl);

    socket.on('open', () => {
      console.log(`[${i}] Connected as ${playerId}`);
      socket.send(JSON.stringify({
        type: 'create',
        walletAddress: playerId,
        signature: null
      }));
    });

    socket.on('message', (data) => {
      console.log(`[${i}] Message:`, data.toString());
    });

    socket.on('close', () => {
      console.log(`[${i}] Connection closed`);
    });

    socket.on('error', (err) => {
      console.error(`[${i}] Error:`, err.message);
    });

    sockets.push(socket);
  }

  rl.close();
});
