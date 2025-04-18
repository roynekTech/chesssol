const express = require('express');
const cors = require('cors'); // Add this line
const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// const app = express();
const port = 8080; //3000;

// game_setup.js 
const WebSocket = require('ws');
const http = require('http');
// const express = require('express');
// const cors = require('cors');
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



// Start HTTP server
const httpServer = app.listen(port, () => {
    console.log('HTTP server running on http://localhost:' + port);
});


// const wss = new WebSocket.Server({ port: 8080 });
const wss = new WebSocket.Server({ 
    server: httpServer ,
    path: MAIN_DIR + '/ws'
});
const games = new Map(); // Stores active games

wss.on('connection', (ws) => {
  console.log('New client connected');

  
  ws.on('message', (message) => {
    // console.log('Raw message:', message); // Add this to see exactly what's received

    try {
      const data = JSON.parse(message);
      // console.log(data);
      console.log('Parsed data:', data); // Add this to see the parsed data


      switch(data.type) {
        case 'create':
          handleCreate(ws, data);
          break;
        case 'join':
          handleJoin(ws, data);
          break;
        case 'move':
          handleMove(ws, data);
          break;
        case 'listGames':
          handleListGames(ws);
          break;
        case 'viewGame':
          handleViewGame(ws, data.gameId);
          break;
        case 'chat':
            handleChat(ws, msg);
            break;
        case 'reconnect':
            handleReconnect(ws, data);
            break;
        case 'resign':
            handleResign(ws, msg);
            break;
        default:
          ws.send(JSON.stringify({ error: 'Invalid message type' }));
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      console.error('Problematic message:', message);
      ws.send(JSON.stringify({ error: 'Invalid JSON format' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    // Clean up any game references
  });
    // ws.on('close', () => {
    //     // Check if this was the last player in any games
    //     games.forEach((game, gameId) => {
    //     if (game.players.has(ws)) {
    //         game.players.delete(ws);
            
    //         if (game.players.size === 0) {
    //         // Start shorter timeout since no players remain
    //         clearTimeout(game.timeout);
    //         game.timeout = setTimeout(() => {
    //             games.delete(gameId);
    //         }, 5 * 60 * 1000); // 5 minute timeout for empty games
    //         }
    //     }
    //     });
    // });

});



function handleCreate(ws) {
  const gameId = uuidv4();
    const chess = new Chess();
    
    // games.set(gameId, {
    //   players: new Set([ws]),
    //   chess,
    //   status: 'waiting'
    // });
    // Create game object
    const game = {
      players: new Set([ws]),
      viewers: new Set(),
      chess,
      status: 'waiting'
    };
    
    // Add to games Map
    games.set(gameId, game);
    
    ws.send(JSON.stringify({
      type: 'created',
      gameId,
      fen: chess.fen(),
      color: 'w'
    }));

    console.log(JSON.stringify({
      type: 'created',
      gameId,
      fen: chess.fen(),
      color: 'w'
    }));
    console.log(`Game created: ${gameId}`);
}

/* function handleCreate(ws) {
    const gameId = uuidv4();
    const chess = new Chess();
    
    // Create game with timeout
    const game = {
        players: new Set([ws]),
        chess,
        status: 'waiting',
        timeout: setTimeout(() => {
            console.log(`Game ${gameId} expired due to inactivity`);
            games.delete(gameId);
            
            // Notify any connected players
            game.players.forEach(player => {
                if (player.readyState === WebSocket.OPEN) {
                player.send(JSON.stringify({
                    type: 'gameEnded',
                    reason: 'inactivity'
                }));
                }
            });
        }, 30 * 60 * 1000) // 30 minute timeout
    };
    
    games.set(gameId, game);
    
    ws.send(JSON.stringify({
        type: 'created',
        gameId,
        fen: chess.fen(),
        color: 'w'
    }));
    
    console.log(`Game created: ${gameId}`);
}
 */
  
function handleJoin(ws, data) {
    // console.log(JSON.stringify(games));
    console.log('Games:', Array.from(games.entries()));
    let gameId = data.gameId;
    console.log(`Attempting to join game: ${data.gameId}`);
    console.log('Available games:', Array.from(games.keys()));

    const game = games.get(gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
    }
    
    if (game.players.size >= 2) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game full'
      }));
    }
    
    game.players.add(ws);
    game.status = 'active'; //running
    
    // Notify both players
    const players = [...game.players];
    players[0].send(JSON.stringify({
      type: 'joined',
      gameId,
      fen: game.chess.fen(),
      color: 'w'
    }));
    
    players[1].send(JSON.stringify({
      type: 'joined',
      gameId,
      fen: game.chess.fen(),
      color: 'b'
    }));
    
    console.log(`Player joined: ${gameId}`);
  }
  
  function handleMove(ws, { gameId, fen, client }) {
    const game = games.get(gameId);
    if (!game) return;
    
    try {
      game.chess.load(fen);
      
      let message = {
        type: 'move',
        fen: game.chess.fen(),
        turn: game.chess.turn(),
        valid: true
      }

      broadcastToAll(game, message);
      
      // // Broadcast new state to players
      // game.players.forEach(player => {
      //   player.send(JSON.stringify({
      //     type: 'move',
      //     fen: game.chess.fen(),
      //     turn: game.chess.turn(),
      //     valid: true
      //   }));
      // });

      // // Broadcast new state to players
      // game.viewers.forEach(viewer => {
      //   viewer.send(JSON.stringify({
      //     type: 'move',
      //     fen: game.chess.fen(),
      //     turn: null,
      //     valid: true
          
      //   }));
      // });
      
      console.log(`Move in ${gameId} by ${client}`);
    } catch (e) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid move'
      }));
    }
  }

  function handleListGames(ws) {
    const availableGames = Array.from(games.entries())
      .filter(([_, game]) => game.status === 'waiting' || game.status === 'active')
      .map(([gameId, game]) => ({
        gameId,
        status: game.status,
        players: game.players.size,
        viewers: game.viewers.size,
        fen: game.chess.fen()
      }));
  
    ws.send(JSON.stringify({
      type: 'gameList',
      games: availableGames
    }));
  }
  
  function handleViewGame(ws, gameId) {
    const game = games.get(gameId);
    
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
    }
  
    // Add to viewers (remove from players if they were there)
    // game.players.delete(ws);
    // Check if already a player in this game
    if (game.players.has(ws)) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'You are already a player in this game'
      }));
    }

    // Check if already a viewer
    if (game.viewers.has(ws)) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'You are already viewing this game'
      }));
    }

    game.viewers.add(ws);
    
    ws.send(JSON.stringify({
      type: 'viewingGame',
      gameId,
      fen: game.chess.fen(),
      status: game.status,
      players: game.players.size,
      viewers: game.viewers.size
    }));
  
    console.log(`New viewer for game ${gameId}`);
  }
  
  function handleChat(ws, { gameId, message, client }) {
    const game = games.get(gameId);
    if (!game) return;
    
    game.players.forEach(player => {
      player.send(JSON.stringify({
        type: 'chat',
        from: client,
        message
      }));
    });
    
    console.log(`Chat in ${gameId}: ${message}`);
  }

  function handleReconnect(ws, { gameId, playerId }) {
    const game = games.get(gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error', 
        message: 'Game no longer exists'
      }));
    }
  
    // Simple version - just find by playerId (wallet address)
    const player = game.players.get(playerId);
    if (!player) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Not originally part of this game'
      }));
    }
  
    // Update the WebSocket reference
    player.ws = ws;
  
    ws.send(JSON.stringify({
      type: 'reconnected',
      fen: game.chess.fen(),
      color: player.color,
      status: game.status
    }));
  
    console.log(`Player ${playerId} reconnected`);
  }

  function handleResign(ws, { gameId, playerId }) {
    const game = games.get(gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
    }
  
    // Notify both players
    game.players.forEach(player => {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(JSON.stringify({
          type: 'gameEnded',
          winner: player.ws === ws ? 'opponent' : playerId,
          reason: 'resignation'
        }));
      }
    });
  
    // Clean up game
    clearTimeout(game.timeout);
    games.delete(gameId);
    console.log(`Game ${gameId} ended by resignation`);
  }

  function broadcastToAll(game, message) {
    const allParticipants = new Set([...game.players, ...game.viewers]);
    allParticipants.forEach(participant => {
      if (participant.readyState === WebSocket.OPEN) {
        participant.send(JSON.stringify(message));
      }
    });
  }

console.log('Chess WebSocket server running on ws://localhost:'+port);


/* // Absolute path to Stockfish
// const stockfishPath = "chess-engine/stockfish_16/stockfish-ubuntu-x86-64-modern";
const stockfishPath = "chess-engine/Stockfish-sf_16/src/stockfish";

let MAIN_DIR = "/chesssol/backend";


// Custom CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost');
    res.header('Access-Control-Allow-Methods', 'GET, POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });


app.use(express.json());

function getBestMove(fen, callback, stockfishPath) {
    console.log(`Attempting to launch Stockfish from: ${stockfishPath}`);
    
    const stockfish = spawn(stockfishPath);
    let bestMove = null;
    let isReady = false;
    let timeout;

    // Set a timeout for the entire operation
    timeout = setTimeout(() => {
        if (!bestMove) {
            stockfish.kill();
            callback(new Error('Stockfish calculation timed out (10 seconds)'));
        }
    }, 10000);

    stockfish.on('error', (err) => {
        clearTimeout(timeout);
        console.error('Stockfish spawn error:', err);
        callback(new Error(`Failed to launch Stockfish: ${err.message}`));
    });

    stockfish.stdin.write('uci\n');
    stockfish.stdin.write(`setoption name Skill Level value 20\n`);
    stockfish.stdin.write('isready\n');

    let buffer = '';
    stockfish.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Save incomplete line for next chunk

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            console.log('Stockfish:', line); // Debug logging
            
            if (line.includes('readyok') && !isReady) {
                isReady = true;
                console.log(`Setting position with FEN: ${fen}`);
                stockfish.stdin.write(`position fen ${fen}\n`);
                stockfish.stdin.write(`go depth 18\n`);
            }
            
            if (line.startsWith('bestmove')) {
                const match = line.match(/bestmove (\w+)/);
                if (match?.[1]) {
                    clearTimeout(timeout);
                    bestMove = match[1];
                    console.log(`Found best move: ${bestMove}`);
                    stockfish.stdin.write('quit\n');
                    return callback(null, bestMove);
                }
            }
        }
    });

    stockfish.stderr.on('data', (data) => {
        console.error('Stockfish stderr:', data.toString());
    });

    stockfish.on('close', (code) => {
        clearTimeout(timeout);
        if (!bestMove) {
            console.error(`Stockfish exited with code ${code} before returning best move`);
            console.error(`Last buffer content: ${buffer}`);
            callback(new Error(`Stockfish process failed (code ${code})`));
        }
    });
}

// Serve "Hello World" at /sonic_universe/client/sonic_planet/api/


app.post(MAIN_DIR+'/get_best_move', (req, res) => {
    const { fen, game_id, level } = req.body;
    
    if (!fen || !game_id) {
        return res.status(400).json({ error: "Missing fen or game_id" });
    }

    // Validate FEN format
    if (!/^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+ [bw] (-|K?Q?k?q?) (-|[a-h][36]) \d+ \d+$/.test(fen)) {
        return res.status(400).json({ error: "Invalid FEN format" });
    }

    getBestMove(fen, (err, move) => {
        if (err) {
            console.log('Problem FEN:', fen);
            console.error('Error in getBestMove:', err);
            return res.status(500).json({ 
                error: 'Engine error',
                details: err.message,
                fen: fen
            });
        }
        res.json({ game_id, fen, best_move: move });
    }, stockfishPath);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Stockfish path configured as: ${stockfishPath}`);
    // Verify Stockfish is executable
    require('fs').access(stockfishPath, require('fs').constants.X_OK, (err) => {
        console.log(err ? 'Stockfish is NOT executable' : 'Stockfish is executable');
    });
}); */