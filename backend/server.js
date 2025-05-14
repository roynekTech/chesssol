const express = require('express');
const cors = require('cors'); // Add this line
const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4, validate } = require('uuid');
// const { getDbConnection } = require('./db');
const { query, pool, getPoolStats } = require('./db');

const { transferSol } = require('./solanaUtils');
const fs = require('fs');


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

app.get(MAIN_DIR+'/db-stats', gameHandlers.poolStats);
app.get(MAIN_DIR+'/gameData/:game_hash', gameHandlers.getGameData); // Get latest state
app.get(MAIN_DIR+'/viewGame', gameHandlers.viewGames); // Get latest state
app.get(MAIN_DIR+'/listGames', gameHandlers.listGames); // Get latest state


app.post(MAIN_DIR+'/create-tournament', gameHandlers.create_tournament);
app.post(MAIN_DIR+'/join-tournament', gameHandlers.join_tournament);
app.post(MAIN_DIR+'/update-score', gameHandlers.update_score);

app.get(MAIN_DIR+'/tournaments', gameHandlers.tournaments);
app.get(MAIN_DIR+'/tournament/:unique_hash', gameHandlers.tournament); 

app.post(MAIN_DIR+'/update-tournament', gameHandlers.update_tournament);
app.post(MAIN_DIR+'/generate-fixtures', gameHandlers.generate_fixtures);
app.get(MAIN_DIR+'/solana-price', gameHandlers.getSolanaPrice);




// Start HTTP server
const httpServer = app.listen(port, () => {
    console.log('HTTP server running on http://localhost:' + port);
});
console.log('Base dir:', __dirname);


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
const availablePairGames = new Set(); // store only gameIds of available games


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
          handleListGames(ws, data);
          break;
        case 'viewGame':
          handleViewGame(ws, data);
          break;
        case 'stateGame':
          handleGameState(ws, data);
          break;
        case 'chat':
            handleChat(ws, data);
            break;
        case 'reconnect':
            handleReconnect(ws, data);
            break;
        case 'resign':
            handleResign(ws, data);
            break;
        case 'draw':
            handleStale(ws, data);
            break;
        case 'checkmate':
            handleCheckmate(ws, data);
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
    
    game.players.push(ws);
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

  const AIDefaultWallet = "aiBF7k3AKkSyMY5Y8E3umtPQFAeQf2g4KoaZGngZzr7";


  async function handleCreate(ws, data) {
    const gameId = uuidv4();
    const chess = new Chess();
    let config;
    
    // Set defaults
    const duration = data.duration || 300000;
    const isBetting = data.isBetting || false;
    const cat = (!data.cat) ? "human" : data.cat; // can only be "human", "AI" or "pair"


    // Handle side selection
    let playerSide = 'random';
    if (data.side && (data.side === 'w' || data.side === 'b')) {
        playerSide = data.side;
    }else if(data.side === 'random'){} 
    else if (data.side) {
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Game side should be random, w or b'
        }));
    }

    //handle config
    if(!data.config){
      //use the default configurations
      // config = {randomStart: false, moveTimeout: duration, numberOfGames: 1 };
      let ranCondi = (isBetting) ? true : false;
      config = {randomStart: ranCondi, moveTimeout: duration, numberOfGames: 1, resignationTime: null, abortTimeout: null};
    }else{
      config = data.config;
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

    // Mkaing wallets required
    if (!data.walletAddress) {
      return ws.send(JSON.stringify({
          type: 'error',
          message: 'You need to include a User Wallet'
      }));
  }

    // Create game object
    const game = {
        players: [ws],
        viewers: new Set(),
        chess,
        status: 'waiting',
        cat: cat,
        duration: duration,
        isBetting: isBetting,
        transactionIds: isBetting ? [data.transactionId] : [],
        playerAmount: isBetting ? data.playerAmount : null,
        // wallets: isBetting ? [data.walletAddress] : [],
        wallets: [data.walletAddress],
        creator: {
            // ws: ws,
            side: assignedColor,
            walletAddress: data.walletAddress || null,
            timeLeft: duration
        },
        opponent:{
            // ws: null,
            side: assignedColor === 'w' ? 'b' : 'w',
            walletAddress: null,
            timeLeft: duration
        },
        stale: 0,
        count: 0,
        numberOfGames: config.numberOfGames,
        winnersList: [],
        forwarded: null,
        config: config,
        gameId: gameId,
        createdAt: Date.now()
    };

    const starterFENs = [
        "rnbqk1nr/pppp1ppp/8/2b1p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 4",
        "rnbqkbnr/1ppp1ppp/p3p3/1B2P3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
        "rnbqkbnr/ppp2ppp/4p3/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R w KQkq - 0 3",
        "r1bqkbnr/pp1ppppp/2n5/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        "rnbqkbnr/ppp2ppp/4p3/3pP3/8/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3",
        "rnbqkb1r/pppppp1p/5np1/8/2P5/5N2/PP1PPPPP/RNBQKB1R w KQkq - 2 3"
    ];
    
    if(game.config.randomStart){
        // Randomly select a FEN string from the starterFENs array
        const randomFEN = starterFENs[Math.floor(Math.random() * starterFENs.length)];
        // const chess = new Chess(randomFEN);
        game.chess.load(randomFEN);
        
    }

   

    // Set a timeout to auto-end the game after duration * 3
    game.timeout = setTimeout(async () => {
      const activeGame = games.get(gameId);
      if (!activeGame) return;
    
      broadcastToAll(activeGame, {
        type: 'gameEnded',
        reason: 'timeout',
        message: 'Game ended by Automatic General Game Timer.'
      }, 1);
      
      if(activeGame.status === 'active'){
        let winnerColor = activeGame.chess.turn() === 'w' ? 'b' : 'w';
        // await cleanUpAndPayments(game, winnerColor, 'abandoned');
        let winnerWallet = (winnerColor === activeGame.creator.side) ? activeGame.creator.walletAddress : activeGame.opponent.walletAddress;
        activeGame.winnersList.push(winnerWallet);

        console.log( 'abandoned state... ADMIN TIMEOUT' );
      }else{
        // await updateGameState('ended', gameId);
        // games.delete(gameId);
        // await cleanUpAndPayments(game, '', 'aborted');
        console.log(`Aborted State... ADMIN TIMEOUT`);
      }
      
      console.log(`Game ${gameId} ended automatically after ${duration * 3}ms`);


      activeGame.count += 1;
      // game.winnersList.push(winnerWallet);

      if (activeGame.count === activeGame.numberOfGames) {

          // Validate that winnersList only contains valid wallet addresses
          const validWallets = [activeGame.creator.walletAddress, activeGame.opponent.walletAddress];
          const isValidWinnersList = activeGame.winnersList.every(winner => validWallets.includes(winner));

          if (!isValidWinnersList) {
              // throw new Error('Invalid winner detected in winnersList!');
              return ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid winner detected in winnersList!'
              }));
          }


          if(data.walletAddress !== activeGame.creator.walletAddress && data.walletAddress !== activeGame.opponent.walletAddress){
            return ws.send(JSON.stringify({
              type: 'error',
              message: 'Unrelated differences in Wallet Addresses...'
            }));
          }


          const totalGamesPlayed = activeGame.winnersList.length;
          const playerWins = activeGame.winnersList.filter(winner => winner === data.walletAddress).length;
          const opponentWins = totalGamesPlayed - playerWins;

          if(playerWins > opponentWins){
              const winnerColorFinal = (activeGame.creator.walletAddress === data.walletAddress)
                    ? activeGame.creator.side
                    : activeGame.opponent.side;
              await cleanUpAndPayments(activeGame, winnerColorFinal, 'checkmate');
          }else if(opponentWins > playerWins){
            const winnerColorFinal = (activeGame.creator.walletAddress === data.walletAddress)
                  ? activeGame.opponent.side
                  : activeGame.creator.side;

              await cleanUpAndPayments(activeGame, winnerColorFinal, 'checkmate');
          }
          else if (playerWins === opponentWins) {
              await cleanUpAndPayments(activeGame, '', 'stalemate');
          } else {
              // const winnerColorFinal = (game.creator.walletAddress === walletAddress)
              //     ? game.opponent.side
              //     : game.creator.side;

              // await cleanUpAndPayments(game, winnerColorFinal, 'resign');
              console.log("last bench mark on ADMIN TIMEOUT...");
          }

      }else{
          console.log("creating a forwarded game -- FROM ADMIN TIMEOUT...");
          await createForwardedGame(activeGame, gameId);
      }

    }, duration * 3);


    let paired = false;
    if (cat === "AI") {
          game.opponent.walletAddress = AIDefaultWallet;
          game.wallets.push(AIDefaultWallet);
          game.players.push(null);

          // if (game.opponent.side === 'w') {
          //   game.wallets.unshift(AIDefaultWallet); // add to beginning
          //   game.players.unshift(null);
          //   // g.players.unshift(ws);
          // } else if (game.opponent.side === 'b') {
          //   game.wallets.push(AIDefaultWallet); // add to end
          //   game.players.push(null);
          //   // g.players.push(ws);
          // }

          game.status = 'joined'; // Start the game immediately
          console.log(`AI opponent assigned to game ${gameId}`);

          // Store in memory
          games.set(gameId, game);

              
          // Respond to client
          ws.send(JSON.stringify({
              type: 'created',
              gameId,
              fen: chess.fen(),
              color: assignedColor,
              // color: game.creator.side,
              isBetting: isBetting,
              playerAmount: isBetting ? data.playerAmount : null,
              duration: duration,
              nonce: generateNonce()
          }));

          // Prepare join data
          const joinData = {
            type: 'joined',
            gameId: gameId,
            fen: game.chess.fen(),
            isBetting: game.isBetting,
            // config: JSON.stringify(game.config)
          };
          joinData.config = game.config;

          // Add betting details if applicable
          if (game.isBetting) {
            joinData.betDetails = {
              playerAmount: game.playerAmount,
              transactionIds: game.transactionIds
            };
          }
          
          // let new_opp = g.creator.side === 'w' ? 'b' : 'w';
          // g.opponent.side = new_opp;
          
          //TODO: add a general create broadcast - this would also help the frontend user flow

          // Notify all players
          const players = [...game.players];
          players[0].send(JSON.stringify({
            ...joinData,
            color: game.creator.side,
            nonce: game.nonce,
            duration: game.duration
          }));

          console.log(`Game AI - ${gameId} created`, { 
            isBetting,
            playerAmount: game.playerAmount,
            creatorWallet: game.creator.walletAddress 
          });


          // Database insertion (async - doesn't block gameplay)
          try {
            // const connection = await getDbConnection();
            const gameData = {
                game_hash: gameId,
                game_state: 'active',
                // game_state: 'waiting',
                // player1: assignedColor === 'w' ? data.walletAddress : "",
                // player2: assignedColor === 'b' ? data.walletAddress : "",
                player1: game.wallets[0],
                // player2: AIDefaultWallet,
                player2: game.wallets[1],
                bet_status: isBetting,
                move_history: JSON.stringify([game.chess.fen()]), // Initial FEN
                // move_history: JSON.stringify(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]),
                start_date: new Date(),
                game: JSON.stringify({
                  creator: game.opponent,
                  opponent: game.opponent,
                  wallets: game.wallets,
                  players: game.players,
                  transactionIds: isBetting ? [game.transactionIds] : [],
                  playerAmount: isBetting ? game.playerAmount : null,
                  stale: game.stale,
                  count: 0,
                  numberOfGames: game.numberOfGames,
                  winnersList: game.winner,
                  forwarded: game.forwarded,
                  config: game.config,

                }),
                duration: game.duration,
                // current_fen: JSON.stringify(game.chess.fen()) // same thing like the move_history above...
                current_fen: game.chess.fen()
            };

            if (isBetting) {
                gameData.transaction_id = data.transactionId;
                gameData.player_amount = data.playerAmount;
                gameData.paymentStatus = 'unpaid';
            }

            const keys = Object.keys(gameData).join(', ');
            const placeholders = Object.keys(gameData).map(() => '?').join(', ');
            const values = Object.values(gameData);

            await query(
                `INSERT INTO games (${keys}) VALUES (${placeholders})`,
                values
            );
            
            // connection.release();
            console.log(`Game ${gameId} saved to database`);
          } catch (dbError) {
              console.error('Database save failed:', dbError);
              // Continue even if DB fails - game exists in memory
          }


            // Check if AI is white, make the first move
          const aiSide = game.opponent.side;
          if (aiSide === 'w') {
              const d_level = ['17.1', '17', '16.1', '16', '15.1', '15', '14', '13', '12', '11', '10', '9', '7', '6', '5', '4'];
              const randomLevel = d_level[Math.floor(Math.random() * d_level.length)];
              
              let stockfishPath;
              console.log(`AI is responding with the - Random level: ${randomLevel}`);

              const relativePath = path.join(__dirname, `../chess-engine/Stockfish-sf_${randomLevel}/src/stockfish`);
              if (fs.existsSync(relativePath)) {
                  stockfishPath = relativePath;
              } else {
                  stockfishPath = `/home/azureuser/chesssol/backend/chess-engine/Stockfish-sf_${randomLevel}/src/stockfish`;
              }

              const currentFen = game.chess.fen();
              gameHandlers.getBestMove(currentFen, (err, move) => {
                  if (err) {
                      console.error(`AI (white) failed to get best move: ${err.message}`);
                      return;
                  }

                  const result = game.chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: 'q' });
                  if (!result) {
                      console.error('AI move was invalid:', move);
                      return;
                  }

                  const currentFen = game.chess.fen();
                  const ch_nonce = generateNonce();

                  // Broadcast AI's first move
                  broadcastToAll(game, {
                      type: 'move',
                      fen: currentFen,
                      turn: game.chess.turn(),
                      valid: true,
                      lastMove: move,
                      nonce: ch_nonce
                  });

                  console.log(`AI made the first move (${move}) in game ${gameId}`);
              }, stockfishPath);
          }
    }

    else if (cat === "pair") {
        // Look for an available game with no opponent
        // console.log(`Searching for available pair game for ${data.walletAddress}`);
        console.log("Available games:", Array.from(availablePairGames));
        for (let id of availablePairGames) {
            let g = games.get(id);
            if (g && g.cat === "pair" && g.opponent.walletAddress === null && g.creator.walletAddress !== data.walletAddress ) {
            // if (g && g.cat === "pair" && g.opponent.walletAddress === null ) {
                g.opponent.walletAddress = data.walletAddress;
                g.players.push(ws);
                g.wallets.push(data.walletAddress); // add to end

                // if (g.opponent.side === 'w') {
                //   g.wallets.unshift(data.walletAddress); // add to beginning
                //   g.players.unshift(ws);
                // } else if (g.opponent.side === 'b') {
                //   g.wallets.push(data.walletAddress); // add to end
                //   g.players.push(ws);
                // }

                g.status = 'joined';
                availablePairGames.delete(id);
                // games.set(id, g); // where id is the existing gameId from availablePairGames
                paired = true;

                console.log(`Player paired into existing game ${id}`);
                
                // Send confirmation to player who joined
                // ws.send(JSON.stringify({
                //     type: 'joined',
                //     gameId: id,
                //     fen: g.chess.fen(),
                //     color: g.opponent.side,
                //     isBetting: g.isBetting,
                //     playerAmount: g.playerAmount,
                //     duration: g.duration,
                //     nonce: generateNonce()
                // }));

                
                // Prepare join data
                const joinData = {
                  type: 'joined',
                  gameId: id,
                  fen: g.chess.fen(),
                  isBetting: g.isBetting,
                  // config: JSON.stringify(game.config)
                };
                joinData.config = g.config;

                // Add betting details if applicable
                if (g.isBetting) {
                  joinData.betDetails = {
                    playerAmount: g.playerAmount,
                    transactionIds: g.transactionIds
                  };
                }
                
                let new_opp = g.creator.side === 'w' ? 'b' : 'w';
                // g.opponent.side = new_opp;
                
                //TODO: add a general create broadcast - this would also help the frontend user flow

                // Notify all players
                const players = [...g.players];
                players[0].send(JSON.stringify({
                  ...joinData,
                  color: g.creator.side,
                  nonce: g.nonce,
                  duration: g.duration
                }));
                
                players[1].send(JSON.stringify({
                  ...joinData,
                  color: g.opponent.side, //new_opp,
                  nonce: g.nonce,
                  duration: g.duration
                }));


                // Database insertion (async - doesn't block gameplay)
                try {
                    // const connection = await getDbConnection();
                    
                    const gameData = {
                        game_hash: id,
                        game_state: 'active',
                        // game_state: 'waiting',
                        // player1: assignedColor === 'w' ? data.walletAddress : "",
                        // player2: assignedColor === 'b' ? data.walletAddress : "",
                        player1: g.wallets[0],
                        player2: g.wallets[1],
                        bet_status: isBetting,
                        move_history: JSON.stringify([g.chess.fen()]), // Initial FEN
                        // move_history: JSON.stringify(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]),
                        start_date: new Date(),
                        duration: g.duration,
                        game: JSON.stringify({
                          creator: game.opponent,
                          opponent: game.opponent,
                          wallets: game.wallets,
                          players: game.players,
                          transactionIds: isBetting ? [game.transactionIds] : [],
                          playerAmount: isBetting ? game.playerAmount : null,
                          stale: game.stale,
                          count: 0,
                          numberOfGames: game.numberOfGames,
                          winnersList: game.winner,
                          forwarded: game.forwarded,
                          config: game.config,
        
                        }),
                        // current_fen: JSON.stringify(game.chess.fen()) // same thing like the move_history above...
                        current_fen: g.chess.fen()
                    };

                    if (isBetting) {
                        gameData.transaction_id = data.transactionId;
                        gameData.player_amount = data.playerAmount;
                        gameData.paymentStatus = 'unpaid';
                    }

                    const keys = Object.keys(gameData).join(', ');
                    const placeholders = Object.keys(gameData).map(() => '?').join(', ');
                    const values = Object.values(gameData);

                    await query(
                        `INSERT INTO games (${keys}) VALUES (${placeholders})`,
                        values
                    );
                    
                    // connection.release();
                    console.log(`Game ${id} saved to database`);
                } catch (dbError) {
                    console.error('Database save failed:', dbError);
                    // Continue even if DB fails - game exists in memory
                }

                return;
            }
        }

        if (!paired) {
            // console.log("No available opponent - so switching to AI");
            // game.opponent.walletAddress = AIDefaultWallet;
            // game.status = 'joined';

            games.set(gameId, game);
            availablePairGames.add(gameId);

            ws.send(JSON.stringify({
              type: 'created', //this could be 'waiting' to show some difference and that someone is yet to join them... 
              gameId,
              fen: chess.fen(),
              color: assignedColor,
              isBetting: isBetting,
              playerAmount: isBetting ? data.playerAmount : null,
              duration: duration,
              nonce: generateNonce()
            }));
        
            console.log(`Game Pair ${gameId} created`, { 
                isBetting,
                playerAmount: game.playerAmount,
                creatorWallet: game.creator.walletAddress 
            });
        }
    }


    else if(cat === "human"){
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
            duration: duration,
            nonce: generateNonce()
        }));
    
        console.log(`Game ${gameId} created`, { 
            isBetting,
            playerAmount: game.playerAmount,
            creatorWallet: game.creator.walletAddress 
        });
    }else{
        return ws.send(JSON.stringify({
            type: 'error',
            message: 'Game category should be human, AI or pair'
        }));
    }

     
    
}



  
  async function createForwardedGame(game, prev_gameId){
        const gameId = uuidv4();
        const chess = new Chess();
        let config;
        
        // Set defaults
        const duration = game.duration || 300000;
        const isBetting = game.isBetting || false;

        // Handle side selection
        // let playerSide = 'random';
        let playerSide = (game.creator.side === 'w') ? 'b' : 'w';

        // Determine color assignment
        const assignedColor = playerSide === 'random' 
            ? (Math.random() < 0.5 ? 'w' : 'b')
            : playerSide;
        
        // Validate betting requirements
        if (isBetting) {
            if (!game.transactionId || typeof game.playerAmount !== 'number' || !game.walletAddress) {
                // return ws.send(JSON.stringify({
                //     type: 'error',
                //     message: 'Betting games require transactionId, playerAmount and walletAddress'
                // }));

                return JSON.stringify({
                    type: 'error',
                    message: 'Betting games require transactionId, playerAmount and walletAddress'
                });
            }
        }

        // Mkaing wallets required
        if (!game.creator.walletAddress || !game.opponent.walletAddress) {
          // return ws.send(JSON.stringify({
          //     type: 'error',
          //     message: 'You need to include a User Wallet'
          // }));

          return JSON.stringify({
              type: 'error',
              message: 'You need to include a User Wallet'
          });
      }

        // Create game object
        const dgame = {
            players: game.players,
            viewers: new Set(),
            chess,
            status: 'waiting',
            cat: game.cat,
            duration: game.duration,
            isBetting: game.isBetting,
            transactionIds: isBetting ? game.transactionId : [],
            playerAmount: isBetting ? game.playerAmount : null,
            // wallets: isBetting ? [data.walletAddress] : [],
            wallets: [data.walletAddress],
            creator: {
                // ws: ws,
                side: assignedColor,
                walletAddress: game.creator.walletAddress || null,
                timeLeft: duration
            },
            opponent:{
                // ws: null,
                side: assignedColor === 'w' ? 'b' : 'w',
                walletAddress: null,
                timeLeft: duration
            },
            stale: 0,
            count: game.count,
            numberOfGames: game.numberOfGames,
            winnersList: game.winnersList,
            forwarded: prev_gameId,
            config: game.config,
            gameId: gameId,
            createdAt: Date.now()
        };
        
        // Store in memory
        games.set(gameId, dgame);


        // Set a timeout to auto-end the game after duration * 3
        // dgame.timeout = setTimeout(async () => {
        //   const activeGame = games.get(gameId);
        //   if (!activeGame) return;
        
        //   broadcastToAll(activeGame, {
        //     type: 'gameEnded',
        //     reason: 'timeout',
        //     message: 'Game ended by Automatic General Game Timer.'
        //   });
          
        //   // if(dgame.status === 'active'){
        //   //   let winnerColor = activeGame.chess.turn() === 'w' ? 'b' : 'w';
        //   //   await cleanUpAndPayments(game, winnerColor, 'abandoned');
        //   //   console.log( 'abandoned state...' );
        //   // }else if(dgame.status !== 'checkmate' || dgame.status !== 'stalemate' || dgame.status !== 'waiting' ){
        //   //   // await updateGameState('ended', gameId);
        //   //   // games.delete(gameId);
        //   //   await cleanUpAndPayments(game, '', 'aborted');
        //   //   console.log(`Game ${gameId} ended automatically after ${duration * 3}ms`);
        //   // }
          
        
        //   console.log(`Game ${gameId} ended automatically after ${duration * 3}ms`);
        // }, duration * 3);

        // Set a timeout to auto-end the game after duration * 3
        dgame.timeout = setTimeout(async () => {
          const activeGame = games.get(gameId);
          if (!activeGame) return;
        
          broadcastToAll(activeGame, {
            type: 'gameEnded',
            reason: 'timeout',
            message: 'Game ended by Automatic General Game Timer.'
          }, 1);
          
          if(activeGame.status === 'active'){
            let winnerColor = activeGame.chess.turn() === 'w' ? 'b' : 'w';
            // await cleanUpAndPayments(game, winnerColor, 'abandoned');
            let winnerWallet = (winnerColor === activeGame.creator.side) ? activeGame.creator.walletAddress : activeGame.opponent.walletAddress;
            activeGame.winnersList.push(winnerWallet);

            console.log( 'abandoned state... ADMIN TIMEOUT' );
          }else{
            // await updateGameState('ended', gameId);
            // games.delete(gameId);
            // await cleanUpAndPayments(game, '', 'aborted');
            console.log(`Aborted State... ADMIN TIMEOUT`);
          }
          
          console.log(`Game ${gameId} ended automatically after ${duration * 3}ms`);


          activeGame.count += 1;
          // game.winnersList.push(winnerWallet);

          if (activeGame.count === activeGame.numberOfGames) {

              // Validate that winnersList only contains valid wallet addresses
              const validWallets = [activeGame.creator.walletAddress, activeGame.opponent.walletAddress];
              const isValidWinnersList = activeGame.winnersList.every(winner => validWallets.includes(winner));

              if (!isValidWinnersList) {
                  // throw new Error('Invalid winner detected in winnersList!');
                  // return ws.send(JSON.stringify({
                  //   type: 'error',
                  //   message: 'Invalid winner detected in winnersList!'
                  // }));

                  return JSON.stringify({
                    type: 'error',
                    message: 'Invalid winner detected in winnersList!'
                  });
              }

              // if(data.walletAddress !== activeGame.creator.walletAddress && data.walletAddress !== activeGame.opponent.walletAddress){
              //   return ws.send(JSON.stringify({
              //     type: 'error',
              //     message: 'Unrelated differences in Wallet Addresses...'
              //   }));
              // }


              const totalGamesPlayed = activeGame.winnersList.length;
              const playerWins = activeGame.winnersList.filter(winner => winner === data.walletAddress).length;
              const opponentWins = totalGamesPlayed - playerWins;

              if(playerWins > opponentWins){
                  const winnerColorFinal = (activeGame.creator.walletAddress === data.walletAddress)
                        ? activeGame.creator.side
                        : activeGame.opponent.side;
                  await cleanUpAndPayments(activeGame, winnerColorFinal, 'checkmate');
              }else if(opponentWins > playerWins){
                const winnerColorFinal = (activeGame.creator.walletAddress === data.walletAddress)
                      ? activeGame.opponent.side
                      : activeGame.creator.side;

                  await cleanUpAndPayments(activeGame, winnerColorFinal, 'checkmate');
              }
              else if (playerWins === opponentWins) {
                  await cleanUpAndPayments(activeGame, '', 'stalemate');
              } else {
                  // const winnerColorFinal = (game.creator.walletAddress === walletAddress)
                  //     ? game.opponent.side
                  //     : game.creator.side;

                  // await cleanUpAndPayments(game, winnerColorFinal, 'resign');
                  console.log("last bench mark on ADMIN TIMEOUT - FORWARDED...");
              }

          }else{
              console.log("creating a forwarded game -- FROM ADMIN TIMEOUT...");
              await createForwardedGame(activeGame, gameId);
          }

        }, duration * 3);
            

            
        // Respond to client
        // ws.send(JSON.stringify({
        //     type: 'created',
        //     gameId,
        //     fen: chess.fen(),
        //     color: assignedColor,
        //     isBetting: isBetting,
        //     playerAmount: isBetting ? data.playerAmount : null,
        //     mode: "forwarded",
        //     duration: duration,
        //     nonce: generateNonce()
        // }));

        broadcastToAll(gameId,
          {
            type: 'created',
            gameId,
            fen: chess.fen(),
            color: assignedColor,
            isBetting: isBetting,
            playerAmount: isBetting ? data.playerAmount : null,
            mode: "forwarded",
            duration: duration,
            nonce: generateNonce()
        }, 3
        )

        console.log(`Game ${gameId} created - in Forwarded -`, { 
            isBetting,
            playerAmount: game.playerAmount,
            creatorWallet: game.creator.walletAddress 
        });


        updateGameState('forwarded', prev_gameId);

        if (game.timeout) {
          clearTimeout(game.timeout);
        }
        games.delete(gameId);
  }


  // Updated handleJoin with betting support
  async function handleJoin(ws, data) {
    const game = games.get(data.gameId);
    let isBetting = game.isBetting;
    
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
    // game.players.add(ws);
    game.players.push(ws);
    game.opponent.walletAddress = data.walletAddress;
    // game.status = 'active';
    game.status = 'joined';
    
    // Prepare join data
    const joinData = {
      type: 'joined',
      gameId: data.gameId,
      fen: game.chess.fen(),
      isBetting: game.isBetting,
      // config: JSON.stringify(game.config)
    };
    joinData.config = game.config;

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
      nonce: game_nonce,
      duration: game.duration
    }));
    
    players[1].send(JSON.stringify({
      ...joinData,
      color: new_opp,
      nonce: game_nonce,
      duration: game.duration
    }));


    // Database insertion (async - doesn't block gameplay)
    try {
        // const connection = await getDbConnection();
        
        const gameData = {
            game_hash: data.gameId,
            game_state: 'active',
            // game_state: 'waiting',
            // player1: assignedColor === 'w' ? data.walletAddress : "",
            // player2: assignedColor === 'b' ? data.walletAddress : "",
            player1: game.wallets[0],
            player2: game.wallets[1],
            bet_status: isBetting,
            move_history: JSON.stringify([game.chess.fen()]), // Initial FEN
            // move_history: JSON.stringify(["rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]),
            start_date: new Date(),
            duration: game.duration,
            // current_fen: JSON.stringify(game.chess.fen()) // same thing like the move_history above...
            current_fen: game.chess.fen()
        };

        if (isBetting) {
            gameData.transaction_id = data.transactionId;
            gameData.player_amount = data.playerAmount;
            gameData.paymentStatus = 'unpaid';
        }

        const keys = Object.keys(gameData).join(', ');
        const placeholders = Object.keys(gameData).map(() => '?').join(', ');
        const values = Object.values(gameData);

        await query(
            `INSERT INTO games (${keys}) VALUES (${placeholders})`,
            values
        );
        
        // connection.release();
        console.log(`Game ${data.gameId} saved to database`);
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

      // console.log("the game: ", game);
  

    
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

    async function validateConnection(ws, game, walletAddress) {
          let state = game.creator.walletAddress === walletAddress;
          let user = (state) ? game.creator : game.opponent;
          let user_ws = (state) ? game.players[0] : game.players[1];
          console.log(`On the Matter: ${user.side} ${game.chess.turn()}`);

          if(user.side !== game.chess.turn()){
            
            return ws.send(JSON.stringify({
                type: 'error',
                message: `It is not your turn to move. It's ${game.chess.turn()} to move.`
            }));
          }

          if(user_ws !== ws){
              return ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Move verification failed - WebSocket mismatch'
              }));
          }
      }


    
    async function handleMove(ws, { gameId, fen, move, initialFen, walletAddress, clientTime, signature }) {
        const game = games.get(gameId);
        if (!game) {
            return ws.send(JSON.stringify({
                type: 'error',
                message: 'Game not found'
            }));
        }

        if( !walletAddress ){
            return ws.send(JSON.stringify({
                type: 'error',
                message: 'You need a walletAddress for this endpoint.'
            }));
        }
    
        try {
            // 1. Verify move
            const verificationChess = new Chess();
            // verificationChess.load(initialFen);

            // // if(verificationChess.turn() !== game.chess.turn() && fen.split(' ')[1] !== game.chess.turn()){
            //   console.log(verificationChess.turn(), game.chess.turn());
            //   if(verificationChess.turn() !== game.chess.turn()){ // if the last turn to play belows to this player..
            //       return ws.send(JSON.stringify({
            //           type: 'error',
            //           message: 'Move verification failed - turn mismatch'
            //       }));
            //   }

            // verificationChess.move(move);
            // const computedFen = verificationChess.fen();
            
            // if (computedFen !== fen) {
            //     return ws.send(JSON.stringify({
            //         type: 'error',
            //         message: 'Move verification failed - FEN mismatch'
            //     }));
            // }

            console.log('Initial FEN:', initialFen);
            console.log('Current FEN:', game.chess.fen());
            

            if( initialFen !== game.chess.fen()){
                return ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Move verification failed - FEN mismatch'
                }));
            }

            
          //   creator: {
          //     // ws: ws,
          //     side: assignedColor,
          //     walletAddress: data.walletAddress || null,
          //     timeLeft: duration
          // },
          // opponent:{
          //     // ws: null,
          //     side: assignedColor === 'w' ? 'b' : 'w',
          //     walletAddress: null,
          //     timeLeft: duration
          // },
            let state = game.creator.walletAddress === walletAddress;
            let user = (state) ? game.creator : game.opponent;
            let user_ws = (state) ? game.players[0] : game.players[1];
            console.log(`On the Matter: ${user.side} ${game.chess.turn()}`);

            if(user.side !== game.chess.turn()){
              
              return ws.send(JSON.stringify({
                  type: 'error',
                  message: `It is not your turn to move. It's ${game.chess.turn()} to move.`
              }));
            }

            if(user_ws !== ws){
                return ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Move verification failed - WebSocket mismatch'
                }));
            }

            // 2. Update game state
            // game.chess.load(fen);
            // const currentFen = game.chess.fen();

            /* try {
                // const moveString = "e2e4";
            
                // Apply the move directly using the string
                const moveResult = game.chess.move(move);
            
                if (!moveResult) {
                    return ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid move - move could not be applied'
                    }));
                }
            
                // Compare the current FEN with the provided one
                if (game.chess.fen() !== fen) {
                    return ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Move verification failed - applied fen different from generated fen'
                    }));
                }
            
                // Check game-ending conditions
                let activeend = (ws == game.players[0]) ? 0 : 1;
                if (game.chess.in_checkmate()) {
                    console.log("Checkmate!");
                    handleCheckmate(game.players[activeend], {
                      gameId: gameId,
                      walletAddress: game.wallets[activeend]
                    });
                } else if (game.chess.in_stalemate()) {
                    console.log("Stalemate!");
                    handleStale(game.players[activeend], {
                      gameId: gameId,
                      walletAddress: game.wallets[activeend]
                    });
                } else if (game.chess.in_threefold_repetition()) {
                    console.log("Draw by threefold repetition!");
                    handleStale(game.players[activeend], {
                      gameId: gameId,
                      walletAddress: game.wallets[activeend]
                    });
                }
            } catch (error) {
                return ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unexpected error: ' + error.message
                }));
            } */

            try {
              // Apply the move directly using the string
              const moveResult = game.chess.move(move);
          
              if (!moveResult) {
                  return ws.send(JSON.stringify({
                      type: 'error',
                      message: 'Invalid move - move could not be applied'
                  }));
              }
          
              // Compare the current FEN with the provided one
              if (game.chess.fen() !== fen) {
                  return ws.send(JSON.stringify({
                      type: 'error',
                      message: 'Move verification failed - applied fen different from generated fen'
                  }));
              }
          
              

            // update nonce
            let ch_nonce = generateNonce();
            game.nonce = ch_nonce;
            const currentFen = game.chess.fen();
    
            // 3. Broadcast move
            broadcastToAll(game, {
                type: 'move',
                fen: currentFen,
                // fen: game.chess.fen(),
                turn: game.chess.turn(),
                valid: true,
                lastMove: move,
                nonce: game.nonce
            });
    
            // 4. Append FEN to DB (lightweight update)
            try {
                // const connection = await getDbConnection();
                await query(
                    `UPDATE games 
                     SET 
                        move_history = JSON_ARRAY_APPEND(COALESCE(move_history, JSON_ARRAY()), '$', ?),
                        current_fen = ?
                     WHERE game_hash = ?`,
                    [currentFen, currentFen, gameId]
                );
                // connection.release();
            } catch (dbError) {
                console.error('DB update failed:', dbError);
            }

            if(game.status === 'joined'){

                if(getFullMoveNumber(currentFen) >= 2){
                  game.status = 'active';
                  let connection ;
                  try {
                      // connection = await getDbConnection();
                      await query(
                          `UPDATE games 
                          SET game_state = ?
                          WHERE game_hash = ?`,
                          [game.status, gameId]
                      );
                      // connection.release();
                  } catch (dbError) {
                      console.error('DB update failed for game_state:', dbError);
                  }

                }else {
                    console.log('Waiting for both players to Initialize');
                }
              
            }
    
            console.log(`Move processed for ${gameId} by ${walletAddress}`);


            // === AUTO-MOVE FOR AI IF IT'S THEIR TURN ===
            if (game.opponent.walletAddress === AIDefaultWallet && game.chess.turn() === game.opponent.side) {
                const aiFen = game.chess.fen();
                const aiSide = game.opponent.side;

                // Pick random engine version
                const engineVersions = ["17.1", "17", "16.1", "16", "15.1", "15", "14", "13", "12", "11", "10", "9", "7", "6", "5", "4"];
                const selectedVersion = engineVersions[Math.floor(Math.random() * engineVersions.length)];

                const stockfishPath = fs.existsSync(path.join(__dirname, `../chess-engine/Stockfish-sf_${selectedVersion}/src/stockfish`))
                    ? path.join(__dirname, `../chess-engine/Stockfish-sf_${selectedVersion}/src/stockfish`)
                    : `/home/azureuser/chesssol/backend/chess-engine/Stockfish-sf_${selectedVersion}/src/stockfish`;

                gameHandlers.getBestMove(aiFen, async (err, aiMove) => {
                    if (err) return console.error('AI move error:', err.message);

                    const newChess = new Chess();
                    newChess.load(aiFen);
                    newChess.move(aiMove);
                    const newFen = newChess.fen();

                    const aiPlayer = game.players[1]; // AI always 2nd player
                    const aiAddress = game.opponent.walletAddress;

                    // Recursively call the move handler
                    await handleMove(aiPlayer, {
                        gameId: gameId,
                        fen: newFen,
                        move: aiMove,
                        initialFen: aiFen,
                        walletAddress: aiAddress,
                        clientTime: Date.now(),
                        signature: null
                    });
                }, stockfishPath);
            }


            // Determine the active player index
            let activeend = (ws === game.players[0]) ? 0 : 1;
          
            // Check game-ending conditions
            if (game.chess.isCheckmate()) {
                console.log("Checkmate!");
                handleCheckmate(game.players[activeend], {
                    gameId: gameId,
                    walletAddress: game.wallets[activeend]
                });
            } else if (game.chess.isStalemate()) {
                console.log("Stalemate!");
                handleStale(game.players[activeend], {
                    gameId: gameId,
                    walletAddress: game.wallets[activeend]
                });
            } else if (game.chess.isThreefoldRepetition()) {
                console.log("Draw by threefold repetition!");
                handleStale(game.players[activeend], {
                    gameId: gameId,
                    walletAddress: game.wallets[activeend]
                });
            }
            
          } catch (error) {
              return ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Unexpected error: ' + error.message
              }));
          }

        } catch (e) {
            console.error('Move error:', e);
            ws.send(JSON.stringify({
                type: 'error',
                message: e.message || 'Invalid move'
            }));
        }

        // finally {
        //     if (connection) connection.release();
        // }
    }


  async function handleListGames(ws, data) {
    const availableGames = Array.from(games.entries())
      .filter(([_, game]) => game.status === 'waiting' || game.status === 'active')
      .map(([gameId, game]) => ({
        gameId,
        status: game.status,
        players: game.players.size,
        viewers: game.viewers.size,
        fen: game.chess.fen()
      }));
  
    const msg2Send = {
      type: 'gameList',
      count: availableGames.length, // Number of games
      games: availableGames
    };
  
    ws.send(JSON.stringify(msg2Send));
  }
  

  async function handleGameState(ws, data) {
      const gameId = data.gameId;
      const game = games.get(gameId);
      
      if (!game) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Game not found'
        }));
      }
    
      // ws.send(JSON.stringify({
      //   type: 'gameState',
      //   game: game
      // }));
      ws.send(JSON.stringify({
        type: 'gameState',
        game: {
        // players: [ws],
        // viewers: new Set(),
        chess: game.chess,
        status: game.status,
        cat: game.cat,
        duration: game.duration,
        isBetting: game.isBetting,
        transactionIds: game.isBetting ? [data.transactionId] : [],
        playerAmount: game.isBetting ? data.playerAmount : null,
        // wallets: isBetting ? [data.walletAddress] : [],
        wallets: [data.walletAddress],
        // creator: {
        //     // ws: ws,
        //     side: assignedColor,
        //     walletAddress: data.walletAddress || null,
        //     timeLeft: duration
        // },
        // opponent:{
        //     // ws: null,
        //     side: assignedColor === 'w' ? 'b' : 'w',
        //     walletAddress: null,
        //     timeLeft: duration
        // },
        // stale: 0,
        // count: 0,
        // numberOfGames: config.numberOfGames,
        // winnersList: [],
        // forwarded: null,
        // config: config,
        // gameId: gameId,
        // createdAt: Date.now()
      }
    }));
      console.log(`Reporting this gameState: ${gameId}`);
  }

  
  async function handleViewGame(ws, data) {
    const gameId = data.gameId;
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
    // if (game.players.has(ws)) {
    if (game.players.includes(ws)){ //using this instead. since it is an array and not a set/map
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
  
  async function handleChat(ws, { gameId, message, sender }) {
    const game = games.get(gameId);
    if (!game) return;
    
    game.players.forEach(player => {
      player.send(JSON.stringify({
        type: 'chat',
        sender: sender,
        message
      }));
    });
    
    console.log(`Chat in ${gameId}: ${message}`);
  }

  /* async function handleReconnect(ws, { gameId, walletAddress, signature }) {
    const game = games.get(gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error', 
        message: 'Game no longer exists'
      }));
    }
  
    // Simple version - just find by playerId (wallet address)
    // const player = game.players.get(playerId);
    // const player = game.wallet.get(walletAddress);
    // 9de0b52a-9950-40a8-ad71-6d951c165a36
    const found = game.wallets.find(addr => addr === walletAddress);

    if (!found) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Not originally part of this game'
      }));
    }
  
    // Update the WebSocket reference
    // game.ws = ws;
    if(game.wallets[0] === walletAddress){
      game.players[0] = ws;
    }else{
      game.players[1] = ws;
    }
  
    ws.send(JSON.stringify({
      type: 'reconnected',
      fen: game.chess.fen(),
      // color: player.color,
      turn: game.chess.turn(),
      status: game.status
    }));
  
    console.log(`Player ${walletAddress} reconnected`);
  } */

  
    async function handleReconnect(ws, { gameId, walletAddress, signature }) {
      let game = games.get(gameId);
    
      if (!game) {
        try {
          // Try to fetch from the database
          const rows = await query(
            `SELECT * FROM games WHERE game_hash = ? ORDER BY timestamp DESC LIMIT 1`,
            [gameId]
          );
    
          if (rows.length === 0) {
            return ws.send(JSON.stringify({
              type: 'error',
              message: 'Game not found in database'
            }));
          }
    
          const latest = rows[0];
    
          // Only recover if the game is still active
          if (latest.game_state === 'active') {
            const recoveredGame = latest.game;
    
            recoveredGame.status = latest.game_state;
            recoveredGame.duration = latest.duration;
            recoveredGame.isBetting = latest.bet_status;
            recoveredGame.playerAmount = latest.player_amount;
    
            games.set(gameId, recoveredGame);
            game = recoveredGame;
    
            console.log(`Recovered game ${gameId} from DB into memory`);
          } else {
            return ws.send(JSON.stringify({
              type: 'error',
              message: 'Game is no longer active'
            }));
          }
        } catch (error) {
          console.error('Error during game recovery:', error);
          return ws.send(JSON.stringify({
            type: 'error',
            message: 'Internal server error during recovery'
          }));
        }
      }
    
      // Proceed with reconnection logic
      const found = game.wallets.find(addr => addr === walletAddress);
    
      if (!found) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Not originally part of this game'
        }));
      }
    
      // Update the WebSocket reference
      if (game.wallets[0] === walletAddress) {
        if(game.players[0]){
          game.players[0] = ws;
        }
        // game.players[0] = ws;
        
      } else {
        if(game.players[1]){
          game.players[1] = ws;
        }
        // game.players[1] = ws;
      }
    
      ws.send(JSON.stringify({
        type: 'reconnected',
        fen: game.chess.fen(),
        turn: game.chess.turn(),
        status: game.status
      }));
    
      console.log(`Player ${walletAddress} reconnected to game ${gameId}`);
    }

    

  async function handleResign(ws, { gameId, walletAddress }) {
    const game = games.get(gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
    }

    if(!walletAddress){
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'WalletAddress is required in resigning games.'
      }));
    }

    if(walletAddress!==game.creator.walletAddress && walletAddress!==game.opponent.walletAddress){
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'You are not a player in this game.'
      }));
    }

    let win1 = (game.players[0] === ws) ? game.players[1] : game.players[0] ;
    let win2 = (game.wallets[0] === walletAddress) ? game.wallets[1] : game.wallets[0] ;
    // if(game.players[0] === ws){
      // winnerColor    // }

    
  
    // Clean up game
    // clearTimeout(game.timeout);
    // Cleanup
    
    // if(game.isBetting){
    //     let winnerSide = (game.creator.walletAddress === walletAddress) ? game.opponent.side : game.creator.side;
    //     let tryPay = await processGamePayout(gameId, 'resign', winnerSide);
    //     if(tryPay.state){
    //         console.log(`Game ${gameId} ended by resignation. Winner: ${winnerSide}`);
    //         if (game.timeout) {
    //           clearTimeout(game.timeout);
    //         }
    //         games.delete(gameId);

    //         game.status = 'resigned';
    //         await updateGameState(game.status, gameId);

    //     }
    // }else{
    //     if (game.timeout) {
    //       clearTimeout(game.timeout);
    //     }
    //     games.delete(gameId);

    //     game.status = 'resigned';
    //     await updateGameState(game.status, gameId);

    // }


    // let winnerColor = (game.creator.walletAddress === walletAddress) ? game.opponent.side : game.creator.side;
    // await cleanUpAndPayments(game, winnerColor, 'resign');

    let msg = {
      type: 'gameEnded',
      // winner: game.players[0] ===  'opponent' : playerId,
      winner:  win2,
      winnerColor: (win2 === game.creator.walletAddress) ? game.creator.side : game.opponent.side,
      reason: 'resignation'
    };
    broadcastToAll(game, msg);

    game.count += 1;
    game.winnersList.push(win2);

    console.log(`the count${game.count} the stat number: ${game.numberOfGames}`)
    if (game.count === game.numberOfGames) {

        // Validate that winnersList only contains valid wallet addresses
        const validWallets = [game.creator.walletAddress, game.opponent.walletAddress];
        const isValidWinnersList = game.winnersList.every(winner => validWallets.includes(winner));

        if (!isValidWinnersList) {
            // throw new Error('Invalid winner detected in winnersList!');
            return ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid winner detected in winnersList!'
            }));
        }


        const totalGamesPlayed = game.winnersList.length;
        const playerWins = game.winnersList.filter(winner => winner === walletAddress).length;
        const opponentWins = totalGamesPlayed - playerWins;

        if(playerWins > opponentWins){
            const winnerColor = (game.creator.walletAddress === walletAddress)
                  ? game.creator.side
                  : game.opponent.side;
            await cleanUpAndPayments(game, winnerColor, 'resign');
        }else if(opponentWins > playerWins){
          const winnerColor = (game.creator.walletAddress === walletAddress)
                ? game.opponent.side
                : game.creator.side;

            await cleanUpAndPayments(game, winnerColor, 'resign');
        }
        else if (playerWins === opponentWins) {
            await cleanUpAndPayments(game, '', 'stalemate');
        } else {
            // const winnerColor = (game.creator.walletAddress === walletAddress)
            //     ? game.opponent.side
            //     : game.creator.side;

            // await cleanUpAndPayments(game, winnerColor, 'resign');
            console.log("last bench mark...");
        }

    }else{
        console.log("creating a forwarded game");
        await createForwardedGame(game, gameId);
    }
    
    //TODO, update the game state in the db and make possible pay-outs

    console.log(`Game ${gameId} ended by resignation`);
  }

  async function updateGameState(gameState, gameId){
    // game.status = 'resigned';
    let connection ;
    try {
        // connection = await getDbConnection();
        await query(
            `UPDATE games 
            SET game_state = ?
            WHERE game_hash = ?`,
            [gameState, gameId]
        );

        console.log(`Game State: ${gameId} Updated Successfully`);

    } catch (dbError) {
        console.error('DB update failed (in updateGamesState fucntion) for game_state:', dbError);
    }

    // finally {
    //     if (connection) connection.release();
    // }
  }

  // I had to research and I discovered that Javascript passes variables by reference.
  async function cleanUpAndPayments(game, winnerColor, condition){
      if(game.isBetting){
        // let winnerSide = (game.creator.walletAddress === walletAddress) ? game.opponent.side : game.creator.side;
        let tryPay = await processGamePayout(game.gameId, condition, winnerColor);
        if(tryPay.state){
            console.log(`Game ${game.gameId} ended by ${condition}. Winner: ${winnerColor}`);
            

            game.status = condition;
            await updateGameState(game.status, game.gameId);

            if (game.timeout) {
              clearTimeout(game.timeout);
            }
            games.delete(game.gameId);

        }
    }else{
        
        game.status = condition;
        await updateGameState(game.status, game.gameId);

        if (game.timeout) {
          clearTimeout(game.timeout);
        }
        games.delete(game.gameId);

    }
  }


  function getFullMoveNumber(fen) {
      const parts = fen.split(' ');
      return parseInt(parts[5], 10);
  }


  async function handleCheckmate(ws, { gameId, walletAddress }) {
      const game = games.get(gameId);
    
      // 1. Validate the game exists
      if (!game) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Game not found'
        }));
      }
    
      // 2. Get FEN and verify checkmate using chess.js
      if (!game.chess.isCheckmate()) {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Game is not in a checkmate state.'
        }));
      }
    
      // 3. Determine winner
      const loserColor = game.chess.turn(); // it's the loser’s turn
      const winnerColor = loserColor === 'w' ? 'b' : 'w';
    
      // 4. Identify the winner’s wallet address
      let winnerWallet;
      if (game.creator.side === winnerColor) {
        winnerWallet = game.creator.walletAddress;
      } else if (game.opponent.walletAddress && game.opponent.side === winnerColor) {
        winnerWallet = game.opponent.walletAddress;
      } else {
        return ws.send(JSON.stringify({
          type: 'error',
          message: 'Unable to determine winner.'
        }));
      }
    
      // 5. Broadcast endgame
      const msg = {
        type: 'gameEnded',
        reason: 'checkmate',
        winner: winnerWallet,
        winnerColor: winnerColor,
        fen: game.chess.fen()
      };
      broadcastToAll(game, msg);
    
      // 6. Clean up
      // if (game.timeout) {
      //   clearTimeout(game.timeout);
      // }
      // games.delete(gameId);
      // let winnerColor = (game.creator.walletAddress === walletAddress) ? game.opponent.side : game.creator.side;
      // await cleanUpAndPayments(game, winnerColor, 'checkmate');


      game.count += 1;
      game.winnersList.push(winnerWallet);

      if (game.count === game.numberOfGames) {

          // Validate that winnersList only contains valid wallet addresses
          const validWallets = [game.creator.walletAddress, game.opponent.walletAddress];
          const isValidWinnersList = game.winnersList.every(winner => validWallets.includes(winner));

          if (!isValidWinnersList) {
              // throw new Error('Invalid winner detected in winnersList!');
              return ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid winner detected in winnersList!'
              }));
          }


          const totalGamesPlayed = game.winnersList.length;
          const playerWins = game.winnersList.filter(winner => winner === winnerWallet).length;
          const opponentWins = totalGamesPlayed - playerWins;

          if(playerWins > opponentWins){
              const winnerColorFinal = (game.creator.walletAddress === winnerWallet)
                    ? game.creator.side
                    : game.opponent.side;
              await cleanUpAndPayments(game, winnerColorFinal, 'checkmate');
          }else if(opponentWins > playerWins){
            const winnerColorFinal = (game.creator.walletAddress === winnerWallet)
                  ? game.opponent.side
                  : game.creator.side;

              await cleanUpAndPayments(game, winnerColorFinal, 'checkmate');
          }
          else if (playerWins === opponentWins) {
              await cleanUpAndPayments(game, '', 'stalemate');
          } else {
              // const winnerColorFinal = (game.creator.walletAddress === walletAddress)
              //     ? game.opponent.side
              //     : game.creator.side;

              // await cleanUpAndPayments(game, winnerColorFinal, 'resign');
              console.log("last bench mark on checkmate...");
          }

      }else{
          console.log("creating a forwarded game -- FROM CHECKMATE...");
          await createForwardedGame(game, gameId);
      }
      
      console.log(`Game ${gameId} ended by checkmate. Winner: ${winnerColor}`);
  }
  

  async function handleStale(ws, { gameId, walletAddress }) {
    const game = games.get(gameId);
    if (!game) {
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'Game not found'
      }));
    }

    if(!walletAddress){
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'WalletAddress is required in offering draw.'
      }));
    }

    if(walletAddress!==game.creator.walletAddress && walletAddress!==game.opponent.walletAddress){
      return ws.send(JSON.stringify({
        type: 'error',
        message: 'You are not a player in this game.'
      }));
    }
  
    game.stale = game.stale + 1;
    // let win1 = (game.players[0] === ws) ? game.players[1] : game.players[0] ;
    // let win2 = (game.wallets[0] === walletAddress) ? game.wallets[1] : game.wallets[0] ;

    if (game.stale >= 2 && game.creator.stale && game.opponent.stale){
      let msg = {
        type: 'gameEnded',
        // winner: game.players[0] ===  'opponent' : playerId,
        winner:  null,
        reason: 'stalemate',
        
      };
      
      broadcastToAll(game, msg);

      // Cleanup
      // if (game.timeout) {
      //   clearTimeout(game.timeout);
      // }

      // games.delete(gameId);
      // let winnerColor = (game.creator.walletAddress === walletAddress) ? game.opponent.side : game.creator.side;
      // await cleanUpAndPayments(game, '', 'stalemate');

      game.count += 1;
      // game.winnersList.push(winnerWallet);

      if (game.count === game.numberOfGames) {

          // Validate that winnersList only contains valid wallet addresses
          const validWallets = [game.creator.walletAddress, game.opponent.walletAddress];
          const isValidWinnersList = game.winnersList.every(winner => validWallets.includes(winner));

          if (!isValidWinnersList) {
              // throw new Error('Invalid winner detected in winnersList!');
              return ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid winner detected in winnersList!'
              }));
          }


          const totalGamesPlayed = game.winnersList.length;
          const playerWins = game.winnersList.filter(winner => winner === walletAddress).length;
          const opponentWins = totalGamesPlayed - playerWins;

          if(playerWins > opponentWins){
              const winnerColorFinal = (game.creator.walletAddress === walletAddress)
                    ? game.creator.side
                    : game.opponent.side;
              await cleanUpAndPayments(game, winnerColorFinal, 'checkmate');
          }else if(opponentWins > playerWins){
            const winnerColorFinal = (game.creator.walletAddress === walletAddress)
                  ? game.opponent.side
                  : game.creator.side;

              await cleanUpAndPayments(game, winnerColorFinal, 'checkmate');
          }
          else if (playerWins === opponentWins) {
              await cleanUpAndPayments(game, '', 'stalemate');
          } else {
              // const winnerColorFinal = (game.creator.walletAddress === walletAddress)
              //     ? game.opponent.side
              //     : game.creator.side;

              // await cleanUpAndPayments(game, winnerColorFinal, 'resign');
              console.log("last bench mark on checkmate...");
          }

      }else{
          console.log("creating a forwarded game -- FROM STALEMATE...");
          await createForwardedGame(game, gameId);
      }

    }else{

      user = (game.creator.walletAddress === walletAddress) ? game.creator : game.opponent;
      user.stale = 1;

      let msg = {
        type: 'chat',
        // winner: game.players[0] ===  'opponent' : playerId,
        message:  "offering stalemate. You can Accept(by using the Draw Button) or Decline(by Ignoring)",
        // sender: walletAddress,
        sender: "Server",
        initiator: walletAddress
      };

      broadcastToAll(game, msg);
    }
    

    
  
    // Clean up game
    // clearTimeout(game.timeout);
    // games.delete(gameId);
    //TODO, update the game state in the db and make possible pay-outs

    
    console.log(`Game ${gameId} ended by resignation`);
  }


  // function broadcastToAll(game, message) {
  //   const allParticipants = new Set([...game.players, ...game.viewers]);
  //   allParticipants.forEach(participant => {
  //     if (participant.readyState === WebSocket.OPEN) {
  //       participant.send(JSON.stringify(message));
  //     }
  //   });
  // }

  /* function broadcastToAll(game, message, to=3, type=false) {
    // 3 = "all", 2 = viewers, 1 = players
    if(to === 3){
      const allParticipants = [...game.players, ...game.viewers];
      allParticipants.forEach(participant => {
        if (participant.readyState === WebSocket.OPEN) {
          participant.send(JSON.stringify(message));
        }
      });
    }
    else if(to === 2){
      const allParticipants = [...game.viewers];
      allParticipants.forEach(participant => {
        if (participant.readyState === WebSocket.OPEN) {
          participant.send(JSON.stringify(message));
        }
      });
    }
    else if(to === 1){
      const allParticipants = [...game.players];
      allParticipants.forEach(participant => {
        if (participant.readyState === WebSocket.OPEN) {
          participant.send(JSON.stringify(message));
        }
      });
    }
    
    


    // if(end){
    //   games.delete(game);
    // }
  } */
  

    function broadcastToAll(game, message, to = 3, type = false) {
      let allParticipants = [];
    
      if (to === 3) {
        allParticipants = [...game.players, ...game.viewers];
      } else if (to === 2) {
        allParticipants = [...game.viewers];
      } else if (to === 1) {
        allParticipants = [...game.players];
      }
    
      allParticipants.forEach(participant => {
        if (participant && participant.readyState === WebSocket.OPEN) {
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
    // return "Sign this message to prove wallet ownership. Nonce: " + 
    //   Math.floor(Math.random() * 1000000);

    return Math.floor(Math.random() * 1000000);
  }


  async function processGamePayout(gameId, endCondition, winner = null) {
    const game = games.get(gameId);
    if (!game || !game.isBetting || !game.transactionIds || game.transactionIds.length === 0) {
      const msg = `Game ${gameId} is invalid for payout processing.`;
      console.error(msg);
      return { state: 0, msg };
    }
  
    // const connection = await getDbConnection();
    // const [row] = await connection.query('SELECT paymentStatus FROM games WHERE game_hash = ?', [gameId]);
  
    // if (row.length === 0) {
    //   const msg = `No record found in database for game ${gameId}`;
    //   console.error(msg);
    //   return { state: 0, msg };
    // }
  
    // if (row[0].paymentStatus === 'paid') {
    //   const msg = `Payment already processed for game ${gameId}`;
    //   console.log(msg);
    //   return { state: 0, msg };
    // }
  
    // // Attempt to mark payment as "processing" to avoid double payouts
    // try {
    //   await connection.query('UPDATE games SET paymentStatus = ? WHERE game_hash = ?', ['processing', gameId]);
    //   console.log(`Marked game ${gameId} as processing.`);
    // } catch (err) {
    //   const msg = `Error updating game ${gameId} payment status to 'processing': ${err.message}`;
    //   console.error(msg);
    //   return { state: 0, msg };
    // }

    // const connection = await getDbConnection();

    // Use execute for secure, parameterized query
    const [rows] = await query(
      'SELECT game_state, paymentStatus FROM games WHERE game_hash = ?', 
      [gameId]
    );

    if (rows.length === 0) {
      const msg = `No record found in database for game ${gameId}`;
      console.error(msg);
      return { state: 0, msg };
    }

    // Handle both array and direct object cases
    const paymentStatus = Array.isArray(rows) ? rows[0]?.paymentStatus : rows?.paymentStatus;

    console.log(`Row: ${JSON.stringify(rows)}`);

    if (paymentStatus === 'paid') {
      const msg = `Payment already processed for game ${gameId}`;
      console.log(msg);
      return { state: 0, msg };
    }

    // Attempt to mark payment as "processing" to avoid double payouts
    try {
      await query(
        'UPDATE games SET paymentStatus = ? WHERE game_hash = ?', 
        ['processing', gameId]
      );
      console.log(`Marked game ${gameId} as processing.`);
    } catch (err) {
      const msg = `Error updating game ${gameId} payment status to 'processing': ${err.message}`;
      console.error(msg);
      return { state: 0, msg };
    }

    // finally {
    //     if (connection) connection.release();
    // }

  
    const amount = game.playerAmount * 2;
    const creator = game.creator.walletAddress;
    const opponent = game.opponent.walletAddress;
    let payouts = [];
  
    switch (endCondition) {
      case 'stalemate':
      case 'aborted': {
        const halfAfterCut = (game.playerAmount * 0.975).toFixed(6);
        payouts.push({ to: creator, amount: halfAfterCut });
        payouts.push({ to: opponent, amount: halfAfterCut });
        break;
      }
  
      case 'checkmate': {
        const winnerSide = game.chess.turn() === 'w' ? 'b' : 'w';
        // if (winner && winner !== winnerSide) {
        //   const msg = `Winner side for '${endCondition}' does not match passed value in game ${gameId}`;
        //   console.error(msg);
        //   return { state: 0, msg };
        // }

        if (!winner) {
          const msg = `Winner not provided for end condition '${endCondition}' in game ${gameId}`;
          console.error(msg);
          return { state: 0, msg };
        }
        const winnerWallet = (game.creator.side === winnerSide) ? creator : opponent;
        // const winnerWallet = (game.creator.side === winner) ? creator : opponent;
        const payoutAmount = (amount * 0.95).toFixed(6);
        payouts.push({ to: winnerWallet, amount: payoutAmount });
        break;
      }

      // case 'abandoned': {
      //   const winnerSide = game.chess.turn() === 'w' ? 'b' : 'w';
      //   const winnerWallet = (game.creator.side === winnerSide) ? creator : opponent;
      //   const payoutAmount = (amount * 0.95).toFixed(6);
      //   payouts.push({ to: winnerWallet, amount: payoutAmount });
      //   break;
      // }
  
      // case 'resign': {
      //   const loserSide = winner !== null ? winner : game.chess.turn();
      //   const loserWallet = (loserSide === game.creator.side) ? creator : opponent;
      //   const winnerWallet = loserWallet === creator ? opponent : creator;
      //   const payoutAmount = (amount * 0.96).toFixed(6);
      //   payouts.push({ to: winnerWallet, amount: payoutAmount });
      //   break;
      // }

      case 'abandoned':
      case 'resign': {
        if (!winner) {
          const msg = `Winner not provided for end condition '${endCondition}' in game ${gameId}`;
          console.error(msg);
          return { state: 0, msg };
        }

        const winnerWallet = (winner === game.creator.side) ? creator : opponent;
        const payoutAmount = (endCondition === 'resign' ? amount * 0.96 : amount * 0.95).toFixed(6);
        payouts.push({ to: winnerWallet, amount: payoutAmount });
        break;
      }

  
      default: {
        const msg = `Unknown end condition: ${endCondition}`;
        console.error(msg);
        return { state: 0, msg };
      }
    }
  
    // Process payouts
    let payoutSignatures = [];
    try {
      for (let p of payouts) {
        const { to, amount } = p;
        const result = await transferSol(to, parseFloat(amount));
        if (!result.success) {
          throw result.error;
          // console.log("transfer was not so successful");
        }else if(result.success && result.signature){
          console.log(`Transferred ${amount} SOL to ${to}`);
          payoutSignatures.push(result.signature);
        }else{
          console.log("unknwon error conditions in payment - fix required")
        }
        
        
      }
  
      // Final DB update to mark as paid
      await query('UPDATE games SET paymentStatus = ? WHERE game_hash = ?', ['paid', gameId]);
      const msg = `Payout for game ${gameId} processed successfully.`;
      console.log(msg);
      return { state: 1, msg };
    } catch (err) {
      const msg = `Error during payout for game ${gameId}: ${err.message}`;
      console.error(msg);
      // Optional: Revert 'processing' status or mark as 'failed'
      await query('UPDATE games SET paymentStatus = ? WHERE game_hash = ?', ['error', gameId]);
      return { state: 0, msg };
    }
    
    // finally {
    //     if (connection) connection.release();
    // }
  }
  



  async function gameStateMem(req, res) {
      const { game_hash } = req.params;

      const game = games.get(game_hash);
      
      if (!game) {
        return res.status(404).json({ error: 'No game data found' });
      }
    
      return res.status(200).json({
          state: true,
          // gameData: /latest,
          duration: game.duration,
          game_state: game.status,
          bet_status: game.isBetting,
          amount: game.playerAmount
      });
    
      // console.log(`New viewer for game ${game_hash}`);
  }
  
  async function unifiedGameData(req, res) {
    const { game_hash } = req.params;
  
    // 1. Check in-memory first
    const game = games.get(game_hash);
  
    if (game) {
      return res.status(200).json({
        state: true,
        duration: game.duration,
        game_state: game.status,
        bet_status: game.isBetting,
        amount: game.playerAmount
      });
    }
  
    try {
      // 2. If not in memory, query the database
      const rows = await query(
        `SELECT * FROM games WHERE game_hash = ? ORDER BY timestamp DESC LIMIT 1`,
        [game_hash]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No game data found' });
      }
  
      const latest = rows[0];
  
      // 3. Check if the game is active before recovering to memory
      if (latest.game_state === 'active') {
        try {
          // const recoveredGame = JSON.parse(latest.game);
          const recoveredGame = latest.game;
  
          // Add any additional recovery processing here if needed
          recoveredGame.status = latest.game_state;
          recoveredGame.duration = latest.duration;
          recoveredGame.isBetting = latest.bet_status;
          recoveredGame.playerAmount = latest.player_amount;
  
          games.set(game_hash, recoveredGame);
          return res.status(200).json({
            state: true,
            duration: latest.duration,
            game_state: latest.game_state,
            bet_status: latest.bet_status,
            amount: latest.player_amount
          });
        } catch (parseError) {
          console.error('Error parsing recovered game:', parseError);
          return res.status(500).json({ error: 'Corrupted game data in database' });
        }
      } else {
        return res.status(404).json({ error: 'Game is not active' });
      }
  
    } catch (error) {
      console.error('Error getting game data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  // Use this combined route
  app.get(MAIN_DIR + '/gameDataUnified/:game_hash', unifiedGameData);
  

  // app.get(MAIN_DIR+'/gameDataMem/:game_hash', gameStateMem); // Get latest state
  app.get(MAIN_DIR+'/gameDataMem/:game_hash', unifiedGameData); // Get latest state



  // async function processGamePayout(gameId, endCondition, winner= null) {
  //   const game = games.get(gameId);
  //   if (!game || !game.isBetting || !game.transactionIds || game.transactionIds.length === 0) {
  //     return console.error(`Game ${gameId} is invalid for payout processing.`);
  //   }
  
  //   const connection = await getDbConnection();
  //   const [row] = await connection.query('SELECT paymentStatus FROM games WHERE gameId = ?', [gameId]);
  
  //   if (row.length === 0) {
  //     return console.error(`No record found in database for game ${gameId}`);
  //   }
  
  //   if (row[0].paymentStatus === 'paid') {
  //     return console.log(`Payment already processed for game ${gameId}`);
  //   }
  
  //   const amount = game.playerAmount * 2;
  //   let payouts = [];
  
  //   const creator = game.creator.walletAddress;
  //   const opponent = game.opponent.walletAddress;
  
  //   switch (endCondition) {
  //     case 'stalemate':
  //     case 'aborted':
  //       const halfAfterCut = (game.playerAmount * 0.975).toFixed(6);
  //       payouts.push({ to: creator, amount: halfAfterCut });
  //       payouts.push({ to: opponent, amount: halfAfterCut });
  //       break;
  
  //     case 'checkmate':
  //     case 'abandoned': {
  //       const winnerSide = game.chess.turn() === 'w' ? 'b' : 'w';
  //       const winner = (game.creator.side === winnerSide) ? creator : opponent;
  //       const payoutAmount = (amount * 0.95).toFixed(6);
  //       payouts.push({ to: winner, amount: payoutAmount });
  //       break;
  //     }
  
  //     case 'resign': {
  //       const loser = (winner!==null ? winner: game.chess.turn()) === game.creator.side ? creator : opponent;
  //       const winner = loser === creator ? opponent : creator;
  //       const payoutAmount = (amount * 0.96).toFixed(6);
  //       payouts.push({ to: winner, amount: payoutAmount });
  //       break;
  //     }
  
  //     default:
  //       return console.error(`Unknown end condition: ${endCondition}`);
  //   }
  
  //   // Transfer funds
  //   for (let p of payouts) {
  //     try {
  //       await transferSol(p.to, p.amount);
  //       console.log(`Transferred ${p.amount} SOL to ${p.to}`);
  //     } catch (err) {
  //       console.error(`Error transferring to ${p.to}:`, err);
  //     }
  //   }
  
  //   // Update database
  //   await connection.query('UPDATE games SET paymentStatus = ? WHERE gameId = ?', ['paid', gameId]);
  
  //   console.log(`Payout for game ${gameId} processed successfully.`);
  // } 
  
  // module.exports = { processGamePayout };


console.log('Chess WebSocket server running on ws://localhost:'+port);

