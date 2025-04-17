const WebSocket = require('ws');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const clientId = `player_${Math.random().toString(36).substr(2, 4)}`;
let ws, currentGame, myColor;

function connect() {
  ws = new WebSocket('ws://localhost:8080');
  
  ws.on('open', () => {
    console.log('Connected to server');
    promptAction();
  });
  
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    handleMessage(msg);
  });
  
  ws.on('close', () => {
    console.log('Disconnected');
    process.exit();
  });
}

function handleMessage(msg) {
  switch(msg.type) {
    case 'created':
      currentGame = msg.gameId;
      myColor = msg.color;
      console.log(`Game created! ID: ${currentGame} (You are ${myColor === 'w' ? 'White' : 'Black'})`);
      break;
      
    case 'joined':
      currentGame = msg.gameId;
      myColor = msg.color;
      console.log(`Joined game ${currentGame} (You are ${myColor === 'w' ? 'White' : 'Black'})`);
      console.log(`Current FEN: ${msg.fen}`);
      break;
      
    case 'move':
      console.log(`Board updated - FEN: ${msg.fen}`);
      console.log(`Now it's ${msg.turn === 'w' ? 'White' : 'Black'}'s turn`);
      break;
      
    case 'chat':
      console.log(`[CHAT from ${msg.from}]: ${msg.message}`);
      break;
      
    case 'error':
      console.error(`Error: ${msg.message}`);
      break;
  }
  
  promptAction();
}

function promptAction() {
  if (!currentGame) {
    rl.question('Create or join game? (create/join [id]): ', (answer) => {
      if (answer === 'create') {
        ws.send(JSON.stringify({ type: 'create', client: clientId }));
      } else if (answer.startsWith('join ')) {
        const gameId = answer.split(' ')[1];
        ws.send(JSON.stringify({ 
          type: 'join', 
          gameId, 
          client: clientId 
        }));
      } else {
        console.log('Invalid choice');
        promptAction();
      }
    });
  } else {
    rl.question('Enter move (fen), chat, or exit: ', (answer) => {
      if (answer === 'exit') {
        ws.close();
      } else if (answer.startsWith('chat ')) {
        const message = answer.substring(5);
        ws.send(JSON.stringify({
          type: 'chat',
          gameId: currentGame,
          message,
          client: clientId
        }));
        promptAction();
      } else {
        // Assume it's a FEN string
        ws.send(JSON.stringify({
          type: 'move',
          gameId: currentGame,
          fen: answer,
          client: clientId
        }));
      }
    });
  }
}

connect();