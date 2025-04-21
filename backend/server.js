const express = require('express');
const cors = require('cors'); // Add this line
const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDbConnection } = require('./db');

// const app = express();
// const port = 8080; //3000;
const port = process.env.PORT || 3000;


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
// const httpServer = app.listen(port, () => {
//     console.log('HTTP server running on http://localhost:' + port);
// });

console.log('Base dir:', __dirname);
app.listen(port, () => {
    console.log(`HTTP server running on http://localhost: ${port}`);
});

// const httpServer = app.listen(8080, '0.0.0.0', () => {
//     console.log(`Server running on port 8080`);
// });


// const wss = new WebSocket.Server({ port: 8080 });
// const wss = new WebSocket.Server({ 
//     server: httpServer ,
//     path: MAIN_DIR + '/ws',
//     verifyClient: (info, callback) => {
//         // Allow connections from localhost and your domain
//         const allowedOrigins = [
//           'http://localhost',
//           'https://roynek.com'
//         ];
//         if (allowedOrigins.includes(info.origin)) {
//           callback(true); // Accept connection
//         } else {
//           callback(false, 401, 'Unauthorized origin');
//         }
//       }
// });


/* const wss = new WebSocket.Server({ 
    server: httpServer,
    path: MAIN_DIR + '/ws'
    // No verifyClient → allows all connections
}); */

const wss = new WebSocket.Server({ 
    server: httpServer,
    path: MAIN_DIR + '/ws',
    verifyClient: (info, callback) => {
        console.log(`New connection from: ${info.origin || 'Unknown origin'}`);
        callback(true); // Always allow, but log
    }
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
            handleChat(ws, data);
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



/* function handleCreate(ws, data) {
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
  } */
  

// Updated handleCreate with transactionId as array
/* function handleCreate(ws, data) {
    const gameId = uuidv4();
    const chess = new Chess();
    
    // Set defaults - 5 mINS
    const duration = data.duration || 300000;
    const isBetting = data.isBetting || false;

    // Handle side selection (default to 'random')
    let playerSide = 'random';
    if (data.side && (data.side === 'w' || data.side === 'b')) {
        playerSide = data.side;
    }else if(data.side && (data.side !== 'w' || data.side === 'b' || data.side !== 'random')){
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Game side should be random, w or b'
          }));
    }

    // Determine actual color assignment
    const assignedColor = playerSide === 'random' 
    ? (Math.random() < 0.5 ? 'w' : 'b')
    : playerSide;
    
    // Validate betting requirements
    if (isBetting) {
      if (!data.transactionId || typeof data.playerAmount !== 'number' || !data.walletAddress) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Betting games require transactionId, playerAmount and walletAddress'
        }));
      }
    }
  
    const game = {
      players: new Set([ws]),
      viewers: new Set(),
      chess,
      status: 'waiting',
      duration: duration,
      isBetting: isBetting,
      transactionIds: isBetting ? [data.transactionId] : [],
      playerAmount: isBetting ? data.playerAmount : null,
      wallets: isBetting ? [data.walletAddress] : [],
      creator: {
        ws: ws,
        side: assignedColor,
        walletAddress: data.walletAddress || null
      },
      createdAt: Date.now()
    };
    
    games.set(gameId, game);
    
    ws.send(JSON.stringify({
      type: 'created',
      gameId,
      fen: chess.fen(),
      color: assignedColor,
      isBetting: isBetting,
      playerAmount: isBetting ? data.playerAmount : null
    }));
  
    console.log(`Game ${gameId} created`, { 
      isBetting,
      playerAmount: game.playerAmount,
      creatorWallet: game.creator.walletAddress 
    });
  }
   */

  async function handleCreate(ws, data) {
    const gameId = uuidv4();
    const chess = new Chess();
    
    // Set defaults
    const duration = data.duration || 300000;
    const isBetting = data.isBetting || false;

    // Handle side selection
    let playerSide = 'random';
    if (data.side && (data.side === 'w' || data.side === 'b')) {
        playerSide = data.side;
    } else if (data.side) {
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Game side should be random, w or b'
        }));
    }

    // Determine color assignment
    const assignedColor = playerSide === 'random' 
        ? (Math.random() < 0.5 ? 'w' : 'b')
        : playerSide;
    
    // Validate betting requirements
    if (isBetting) {
        if (!data.transactionId || typeof data.playerAmount !== 'number' || !data.walletAddress) {
            return ws.send(JSON.stringify({
                type: 'error',
                message: 'Betting games require transactionId, playerAmount and walletAddress'
            }));
        }
    }

    // Create game object
    const game = {
        players: new Set([ws]),
        viewers: new Set(),
        chess,
        status: 'waiting',
        duration: duration,
        isBetting: isBetting,
        transactionIds: isBetting ? [data.transactionId] : [],
        playerAmount: isBetting ? data.playerAmount : null,
        wallets: isBetting ? [data.walletAddress] : [],
        creator: {
            ws: ws,
            side: assignedColor,
            walletAddress: data.walletAddress || null
        },
        createdAt: Date.now()
    };
    
    // Store in memory
    games.set(gameId, game);
    
        
    // Respond to client
    ws.send(JSON.stringify({
        type: 'created',
        gameId,
        fen: chess.fen(),
        color: assignedColor,
        isBetting: isBetting,
        playerAmount: isBetting ? data.playerAmount : null,
        nonce: generateNonce()
    }));

    console.log(`Game ${gameId} created`, { 
        isBetting,
        playerAmount: game.playerAmount,
        creatorWallet: game.creator.walletAddress 
    });
}
  


  // Updated handleJoin with betting support
  async function handleJoin(ws, data) {
    const game = games.get(data.gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
    }
    
    // Standard validation
    if (game.players.size >= 2) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game full'
      }));
    }
  
    // Betting-specific validation
    if (game.isBetting) {
      if (!data.transactionId || typeof data.playerAmount !== 'number' || !data.walletAddress) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Betting games require transactionId, playerAmount and walletAddress'
        }));
      }
      
      if (data.playerAmount !== game.playerAmount) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: `Bet amount must be exactly ${game.playerAmount}`
        }));
      }
  
      // Add betting details
      game.transactionIds.push(data.transactionId);
    }

    // add joiner wallet address
    if(data.walletAddress){
        game.wallets.push(data.walletAddress);
    }else{
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'WalletAddress is now required in joining games.'
          }));
    }

    //Add nonce
    let game_nonce = generateNonce();
    game.nonce = game_nonce;
  
    // Add player
    game.players.add(ws);
    game.status = 'active';
    
    // Prepare join data
    const joinData = {
      type: 'joined',
      gameId: data.gameId,
      fen: game.chess.fen(),
      isBetting: game.isBetting
    };
  
    // Add betting details if applicable
    if (game.isBetting) {
      joinData.betDetails = {
        playerAmount: game.playerAmount,
        transactionIds: game.transactionIds
      };
    }
    
    let new_opp = game.creator.side === 'w' ? 'b' : 'w';
    

    // Notify all players
    const players = [...game.players];
    players[0].send(JSON.stringify({
      ...joinData,
      color: game.creator.side,
      nonce: game_nonce
    }));
    
    players[1].send(JSON.stringify({
      ...joinData,
      color: new_opp,
      nonce: game_nonce

    }));


    // Database insertion (async - doesn't block gameplay)
    try {
        const connection = await getDbConnection();
        
        const gameData = {
            game_hash: data.gameId,
            game_state: 'active',
            // game_state: 'waiting',
            // player1: assignedColor === 'w' ? data.walletAddress : "",
            // player2: assignedColor === 'b' ? data.walletAddress : "",
            player1: game.wallets[0],
            player2: game.wallets[1],
            bet_status: isBetting,
            move_history: JSON.stringify(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]), // Initial FEN
            start_date: new Date(),
            duration: duration,
            current_fen: chess.fen()
        };

        if (isBetting) {
            gameData.transaction_id = data.transactionId;
            gameData.player_amount = data.playerAmount;
        }

        const keys = Object.keys(gameData).join(', ');
        const placeholders = Object.keys(gameData).map(() => '?').join(', ');
        const values = Object.values(gameData);

        await connection.execute(
            `INSERT INTO games (${keys}) VALUES (${placeholders})`,
            values
        );
        
        connection.release();
        console.log(`Game ${gameId} saved to database`);
    } catch (dbError) {
        console.error('Database save failed:', dbError);
        // Continue even if DB fails - game exists in memory
    }

  
    // console.log(`Player joined ${data.gameId}`, {
    //   isBetting: game.isBetting,
    //   playerAmount: game.playerAmount,
    //   joinerWallet: data.walletAddress
    // });

    console.log(`Player joined ${data.gameId}`, {
        ...joinData,
        color: game.creator.side
      });
  

    
  }


  /* function handleMove(ws, { gameId, fen, client }) {
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
      
      console.log(`Move in ${gameId} by ${client}`);
    } catch (e) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid move'
      }));
    }
  } */

    
    async function handleMove(ws, { gameId, fen, client, move, initialFen }) {
        const game = games.get(gameId);
        if (!game) {
            return ws.send(JSON.stringify({
                type: 'error',
                message: 'Game not found'
            }));
        }
    
        try {
            // 1. Verify move
            // const verificationChess = new Chess(initialFen);
            // verificationChess.move(move);
            // const computedFen = verificationChess.fen();
            
            // if (computedFen !== fen) {
            //     return ws.send(JSON.stringify({
            //         type: 'error',
            //         message: 'Move verification failed - FEN mismatch'
            //     }));
            // }
    
            // 2. Update game state
            game.chess.load(fen);
            const currentFen = game.chess.fen();

            // update nonce
            let ch_nonce = generateNonce();
            game.nonce = ch_nonce;
    
            // 3. Broadcast move
            broadcastToAll(game, {
                type: 'move',
                fen: currentFen,
                turn: game.chess.turn(),
                valid: true,
                lastMove: move,
                nonce: ch_nonce
            });
    
            // 4. Append FEN to DB (lightweight update)
            try {
                const connection = await getDbConnection();
                await connection.execute(
                    `UPDATE games 
                     SET 
                        move_history = JSON_ARRAY_APPEND(COALESCE(move_history, JSON_ARRAY()), '$', ?),
                        current_fen = ?
                     WHERE game_hash = ?`,
                    [currentFen, currentFen, gameId]
                );
                connection.release();
            } catch (dbError) {
                console.error('DB update failed:', dbError);
            }
    
            console.log(`Move processed for ${gameId} by ${client}`);
    
        } catch (e) {
            console.error('Move error:', e);
            ws.send(JSON.stringify({
                type: 'error',
                message: e.message || 'Invalid move'
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
  
  function handleChat(ws, { gameId, message, sender }) {
    const game = games.get(gameId);
    if (!game) return;
    
    game.players.forEach(player => {
      player.send(JSON.stringify({
        type: 'chat',
        from: sender,
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
    // games.delete(gameId);
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


  function handlePairRequest(ws, data) {
    // Validate pairing request
    if (pairingPool.has(ws)) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Already in pairing pool'
      }));
    }
  
    // First send acknowledgment
    ws.send(JSON.stringify({
      type: 'pairing',
      status: 'searching',
      message: 'Looking for opponent...'
    }));
  
    // Store player data including the WS connection
    const playerData = {
      ws,
      sidePreference: data.side || 'random',
      isBetting: data.isBetting || false,
      walletAddress: data.walletAddress || null,
      playerAmount: data.playerAmount || null,
      transactionId: data.transactionId || null,
      timestamp: Date.now() // For FIFO matching
    };
  
    // Add player to pool
    pairingPool.add(playerData); // Now storing full player data object
    console.log(`Player added to pairing pool. Current size: ${pairingPool.size}`);
  
    // Now try to find a match including the new player
    tryMatchPlayers(playerData); // Pass the current player as potential matchee
  }
  
  function tryMatchPlayers(currentPlayer = null) {
    // Get all available players including the current one
    const availablePlayers = Array.from(pairingPool);
  
    // If we have a specific current player to match
    if (currentPlayer) {
      // Find oldest waiting opponent (FIFO)
      const opponents = availablePlayers.filter(p => p.ws !== currentPlayer.ws);
      
      if (opponents.length > 0) {
        const opponent = opponents[0]; // Get oldest waiting player
        return createMatch(currentPlayer, opponent);
      }
    } 
    
    // General matching for pool
    if (availablePlayers.length >= 2) {
      // Sort by oldest first (FIFO)
      const sortedPlayers = [...availablePlayers].sort((a,b) => a.timestamp - b.timestamp);
      return createMatch(sortedPlayers[0], sortedPlayers[1]);
    }
  
    // Fallback to bot if enabled and only one human waiting
    if (availablePlayers.length === 1 && defaultBots.length > 0) {
      return matchWithBot(availablePlayers[0]);
    }
  }
  
  function createMatch(player1, player2) {
    const gameId = uuidv4();
    const chess = new Chess();
    
    // Remove both players from pool
    pairingPool.delete(player1);
    pairingPool.delete(player2);
  
    // Determine colors (honor preferences if possible)
    let p1Color, p2Color;
    
    if (player1.sidePreference === player2.sidePreference && player1.sidePreference !== 'random') {
      // If both want same color, randomize
      p1Color = Math.random() < 0.5 ? 'w' : 'b';
      p2Color = p1Color === 'w' ? 'b' : 'w';
    } else {
      // Try to honor preferences
      p1Color = player1.sidePreference === 'random' 
        ? (Math.random() < 0.5 ? 'w' : 'b')
        : player1.sidePreference;
      p2Color = p1Color === 'w' ? 'b' : 'w';
    }
  
    // Create game (similar to your existing structure)
    const game = {
        players: new Set([player1.ws, player2.ws]),
        viewers: new Set(),
        chess,
        status: 'active',
        duration: 300000, // 5 minutes default
        isBetting: player1.isBetting || false,
        transactionIds: player1.isBetting ? [player1.transactionId,player2.transactionId] : [],
        playerAmount: player1.isBetting ? player1.playerAmount : null,
        wallets: player1.isBetting ? [player1.walletAddress, player2.walletAddress] : [],
        nonce: generateNonce(),
        createdAt: Date.now()
      // ... rest of game setup ...
    };
  
    games.set(gameId, game);
  
    // Notify players
    notifyPlayersOfMatch(gameId, player1, p1Color, player2, p2Color);
  }

  function matchWithBot(humanPlayer) {
    const bot = {
      ws: null, // Would be actual bot connection in real implementation
      isBot: true,
      sidePreference: humanPlayer.sidePreference === 'w' ? 'b' : 'w',
      walletAddress: null,
      transactionId: null,
    };
  
    // Create game between human and bot
    createMatchedGame(humanPlayer, bot);
    pairingPool.delete(humanPlayer);
  }

  
  
  function notifyPlayersOfMatch(gameId, player1, p1Color, player2, p2Color) {
    const baseNotification = {
      type: 'paired',
      gameId,
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      isBetting: player1.isBetting || false
    };
  
    // Notify player1
    player1.ws.send(JSON.stringify({
      ...baseNotification,
      color: p1Color,
      opponent: player2.isBot ? 'bot' : 'human'
    }));
  
    // Notify player2 if not a bot
    if (!player2.isBot) {
      player2.ws.send(JSON.stringify({
        ...baseNotification,
        color: p2Color,
        opponent: 'human'
      }));
    }
  
    console.log(`Created match ${gameId}`, {
      player1: player1.walletAddress || 'bot',
      player2: player2.walletAddress || 'bot',
      p1Color,
      p2Color
    });
  }

  // Helper function
function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
  }


async function legalMoves(fen){
    try {
        const chess = new Chess();

        try {
            chess.load(fen);
        } catch (e) {
            // return res.status(400).json({ error: 'Invalid FEN string' });
            return
        }

        // Get all legal moves for that side
        let moves = chess.moves({ verbose: true });
        // console.log(moves);
        return moves;
    }
    catch (error) {
        console.error('Error getting legal moves:', error);
        return;
    }
}


function generateNonce() {
    return "Sign this message to prove wallet ownership. Nonce: " + 
      Math.floor(Math.random() * 1000000);
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