// game_setup.js 
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Chess } = require('chess.js');
const bodyParser = require('body-parser');
const gameHandlers = require('./gameHandlers');

const app = express();
app.use(bodyParser.json());
app.use(cors());
let MAIN_DIR = "/chesssol/backend";

app.get(MAIN_DIR+'/', (req, res) => {
  res.send('Entrace Point - Hello world');
});

// Game endpoints
app.post(MAIN_DIR+'/games', gameHandlers.createGame);
app.post(MAIN_DIR+'/games/:gameId/join', gameHandlers.joinGame);
app.put('/games/:gameId/state', gameHandlers.updateGameState);

// Game data endpoints
app.post(MAIN_DIR+'/games/:gameId/data', gameHandlers.updateGameData); // Update game state
app.get(MAIN_DIR+'/games/:gameId/data', gameHandlers.getLatestGameData); // Get latest state
app.post(MAIN_DIR+'/games/legal-moves', gameHandlers.getLegalMoves); // Get legal moves


app.post(MAIN_DIR+'/get_best_move', gameHandlers.getBestMoves); // Get legal moves

// Create HTTP server and bind WS server to it
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Track clients by gameId
const clients = new Map();

wss.on('connection', (ws, req) => {
  let playerInfo = null;

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Initial join event
      if (data.type === 'join') {
        const { gameId, client } = data;

        playerInfo = { gameId, client };
        if (!clients.has(gameId)) {
          clients.set(gameId, []);
        }

        clients.get(gameId).push(ws);
        ws.send(JSON.stringify({ type: 'status', message: `Joined game ${gameId} as ${client}` }));
      }

      // Move event
      if (data.type === 'move') {
        const { gameId, fen, client, clientTime } = data;
        const result = await gameHandlers.processMove(gameId, fen, client, clientTime);

        if (result.error) {
          ws.send(JSON.stringify({ type: 'error', error: result.error }));
        } else {
          const players = clients.get(gameId) || [];
          players.forEach(socket => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'update',
                gameId,
                fen: result.fen,
                moves: result.moves,
                from: client
              }));
            }
          });
        }
      }
    } catch (err) {
      console.error('WS message error:', err);
      ws.send(JSON.stringify({ type: 'error', error: 'Malformed message' }));
    }
  });

  ws.on('close', () => {
    if (playerInfo) {
      const { gameId } = playerInfo;
      clients.set(gameId, (clients.get(gameId) || []).filter(c => c !== ws));
    }
  });
});


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket + HTTP server running on port ${PORT}`);

});





// const express = require('express');
// const mysql = require('mysql2/promise');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// require('dotenv').config(); // Load environment variables first


// const app = express();
// app.use(bodyParser.json());
// app.use(cors());


// // Database connection setup using environment variables
// const dbConfig = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0
// };

// const pool = mysql.createPool(dbConfig);

// // Utility function to get database connection
// async function getDbConnection() {
//   return await pool.getConnection();
// }


// // Helper function to generate random side assignment
// function assignRandomSide() {
//   return Math.random() < 0.5 ? 'w' : 'b';
// }

// // 1. Create a game (bet or no-bet)
// app.post('/games', async (req, res) => {
  
// });

// // 2. Join a game (bet or no-bet)
// app.post('/games/:gameId/join', async (req, res) => {
  
// });

// // 3. Update game state
// app.put('/games/:gameId/state', async (req, res) => {
  
    
//   });


// // Start the server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });