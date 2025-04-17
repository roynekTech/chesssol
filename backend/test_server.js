const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const express = require('express');

// --- HTTP Server Setup ---
const app = express();
app.use(express.json()); // Parse JSON bodies

// Example HTTP endpoint to create a game via REST
app.post('/api/games', (req, res) => {
    const gameId = uuidv4();
    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    games.set(gameId, {
        players: new Map(),
        fen: initialFen,
        status: 'waiting',
        createdAt: Date.now()
    });

    res.json({
        gameId,
        fen: initialFen,
        status: 'waiting'
    });
});

// Example HTTP endpoint to fetch game state
app.get('/api/games/:gameId', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
        gameId: req.params.gameId,
        fen: game.fen,
        status: game.status,
        players: Array.from(game.players.keys())
    });
});

// Start HTTP server
const httpServer = app.listen(8080, () => {
    console.log('HTTP server running on http://localhost:8080');
});



// const wss = new WebSocket.Server({ port: 8080 });
const wss = new WebSocket.Server({ server: httpServer });
const games = new Map(); // Stores active games

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
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
    
    games.set(gameId, {
      players: new Set([ws]),
      chess,
      status: 'waiting'
    });
    
    ws.send(JSON.stringify({
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
  
function handleJoin(ws, gameId) {
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
    game.status = 'active';
    
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
      
      // Broadcast new state
      game.players.forEach(player => {
        player.send(JSON.stringify({
          type: 'move',
          fen: game.chess.fen(),
          turn: game.chess.turn()
        }));
      });
      
      console.log(`Move in ${gameId} by ${client}`);
    } catch (e) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid move'
      }));
    }
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

console.log('Chess WebSocket server running on ws://localhost:8080');