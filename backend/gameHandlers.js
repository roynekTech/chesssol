// gameHandlers.js
// const db = require('./db');
const { query, pool, getPoolStats } = require('./db');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function assignRandomSide() {
  return Math.random() < 0.5 ? 'w' : 'b';
}

async function createGame(req, res) {
  const { walletAddress, side, isBetting, transactionId, playerAmount, game_hash, startDate } = req.body;

  try {
    // Validate required fields
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const d_game_hash = game_hash || uuidv4();

    // Determine player positions
    const assignedSide = side === 'random' ? assignRandomSide() : side;
    const player1 = assignedSide === 'w' ? walletAddress : '';
    const player2 = assignedSide === 'b' ? walletAddress : '';

    // Prepare game data
    const gameData = {
      game_state: 'starting',
      player1,
      player2,
      bet_status: isBetting || false,
      game_hash: d_game_hash,
      start_date: startDate || new Date(),
      timestamp: new Date()
    };

    // Add betting-specific fields if it's a betting game
    if (isBetting) {
      if (!transactionId || !playerAmount) {
        return res.status(400).json({ error: 'Transaction ID and player amount are required for betting games' });
      }
      gameData.transaction_id = transactionId;
      gameData.player_amount = playerAmount;
    }

    // Dynamically construct query
    const keys = Object.keys(gameData).join(', ');
    const placeholders = Object.keys(gameData).map(() => '?').join(', ');
    const values = Object.values(gameData);

    const result = await query(
      `INSERT INTO games (${keys}) VALUES (${placeholders})`,
      values
    );

    res.status(201).json({
      game_id: result.insertId,
      message: 'Game created successfully',
      player_position: assignedSide === 'w' ? 'player1 (white)' : 'player2 (black)',
      game_hash: d_game_hash
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}


async function joinGame(req, res) {
    const { gameId } = req.params;
    const { walletAddress, side, transactionId } = req.body;

    let connection;

    try {
        connection = await pool.getConnection();

        // Get the game
        const [games] = await connection.query(
            'SELECT * FROM games WHERE game_id = ?',
            [gameId]
        );

        if (games.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const game = games[0];

        // Validate the game can be joined
        if (game.game_state !== 'starting') {
            return res.status(400).json({ error: 'Game is not in starting state' });
        }

        // Check if wallet is already in the game
        if (game.player1 === walletAddress || game.player2 === walletAddress) {
            return res.status(400).json({ error: 'You are already in this game' });
        }

        // Handle betting
        if (game.bet_status) {
            if (!transactionId) {
                return res.status(400).json({ error: 'Transaction ID is required for betting games' });
            }

            const updatedTxId = game.transaction_id
                ? `${game.transaction_id}|${transactionId}`
                : transactionId;

            await connection.query(
                'UPDATE games SET transaction_id = ? WHERE game_id = ?',
                [updatedTxId, gameId]
            );
        }

        // Assign player position
        let updateField = null;
        if (!game.player1) {
            updateField = 'player1';
        } else if (!game.player2) {
            updateField = 'player2';
        } else {
            return res.status(400).json({ error: 'No available position to join this game' });
        }

        await connection.query(
            `UPDATE games SET ${updateField} = ?, game_state = 'running' WHERE game_id = ?`,
            [walletAddress, gameId]
        );

        res.status(200).json({
            message: 'Successfully joined the game',
            game_id: gameId,
            player_position: updateField,
            game_state: 'running'
        });

    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ error: 'Internal server error' });

    } finally {
        if (connection) connection.release();
    }
}

async function updateGameState(req, res) {
    const { gameId } = req.params;
    const { gameState, reward } = req.body;

    try {
        const validStates = ['starting', 'running', 'waiting', 'joined', 'active', 'checkmate', 'aborted', 'abandoned', 'draw'];
        if (!validStates.includes(gameState)) {
            return res.status(400).json({ error: 'Invalid game state' });
        }

        const updateFields = ['game_state'];
        const values = [gameState];

        if (reward !== undefined) {
            updateFields.push('reward');
            values.push(reward);
        }

        // Create the SET clause dynamically
        const setClause = updateFields.map(field => `${field} = ?`).join(', ');

        // Run the prepared statement
        await query(
            `UPDATE games SET ${setClause} WHERE game_id = ?`,
            [...values, gameId]
        );

        return res.status(200).json({
            message: 'Game state updated successfully',
            game_id: gameId,
            new_state: gameState
        });
    } catch (error) {
        console.error('Error updating game state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


async function updateGameData(req, res) {
    const { gameId } = req.params;
    const { fen, client, clientTime } = req.body;

    try {
        // Validate required fields
        if (!fen || !client) {
            return res.status(400).json({ error: 'FEN and client are required' });
        }

        // Check if game exists and is running
        const games = await query(
            'SELECT * FROM games WHERE game_id = ?',
            [gameId]
        );

        if (games.length === 0) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const game = games[0];
        if (game.game_state !== 'running') {
            return res.status(400).json({ error: 'Game is not running' });
        }

        // Verify it's the player's turn
        const chessGame = new Chess(fen);
        const currentTurn = chessGame.turn(); // 'w' or 'b'
        const playerSide = client === 'player1' ? 'w' : 'b';

        if (currentTurn === playerSide) {
            return res.status(400).json({ error: 'Not your turn' });
        }

        // Get latest FEN from database
        const latestData = await query(
            'SELECT * FROM game_data WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1',
            [gameId]
        );

        const moves = await legalMoves(fen);  // ✅ Await this!

        // Validate move if there's previous state
        if (latestData.length > 0) {
            const latestFen = latestData[0].fen_state;

            if (latestFen === fen) {
                return res.status(200).json({
                    message: 'FEN unchanged',
                    current_fen: fen,
                    moves: moves || []  // Just in case it returns undefined
                });
            }

            const prevChess = new Chess();
            try {
                prevChess.load(fen);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid FEN' });
            }
        }

        // Insert new game data
        await query(
            'INSERT INTO game_data (game_id, fen_state, client, client_time) VALUES (?, ?, ?, ?)',
            [gameId, fen, client, clientTime || new Date()]
        );

        return res.status(200).json({
            message: 'Game state updated successfully',
            current_fen: fen,
            moves: moves || []  // Just in case it returns undefined
        });

    } catch (error) {
        console.error('Error updating game data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


// async function getGameData(req, res) {
//     const { game_hash } = req.params;
//     // const { client, currentFen } = req.body;

//     try {
        
//         // Get latest game data
//         const [latestData] = await connection.execute(
//         'SELECT * FROM games WHERE game_hash = ? ORDER BY timestamp DESC LIMIT 1',
//         [game_hash]
//         );

//         if (latestData.length === 0) {
//         connection.release();
//         return res.status(404).json({ error: 'No game data found' });
//         }

//         const latest = latestData[0];

//         connection.release();
//         res.status(200).json({
//             state: true,
//             gameData: latest,
//             duration: latest.duration,
//             game_state: latest.game_state,
//             bet_status: latest.bet_status,
//         });

//     } catch (error) {
//         console.error('Error getting game data:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }


async function getGameData(req, res) {
    const { game_hash } = req.params;

    try {
        // Query the database using the new query function
        const rows = await query(
            `SELECT *
             FROM games
             WHERE game_hash = ?
             ORDER BY timestamp DESC
             LIMIT 1`,
            [game_hash]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No game data found' });
        }

        const latest = rows[0];

        return res.status(200).json({
            state: true,
            duration: latest.duration,
            game_state: latest.game_state,
            bet_status: latest.bet_status,
        });

    } catch (error) {
        console.error('Error getting game data:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}


async function getLatestGameData(req, res) {
    const { gameId } = req.params;
    const { client, currentFen } = req.body;

    try {
        // Get latest game data using the query function
        const latestData = await query(
            'SELECT * FROM game_data WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1',
            [gameId]
        );

        if (latestData.length === 0) {
            return res.status(404).json({ error: 'No game data found' });
        }

        const latest = latestData[0];

        // Check if client's FEN is outdated
        if (currentFen && currentFen === latest.fen_state) {
            return res.status(200).json({
                message: 'Client FEN is current',
                is_current: true,
                current_fen: currentFen
            });
        }

        // Verify the last move wasn't made by this client
        if (latest.client === client) {
            return res.status(200).json({
                message: 'You made the last move',
                is_current: true,
                current_fen: latest.fen_state
            });
        }

        res.status(200).json({
            message: 'FEN updated',
            is_current: false,
            current_fen: latest.fen_state,
            last_updated: latest.timestamp
        });

    } catch (error) {
        console.error('Error getting game data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}



async function getLegalMoves(req, res) {
    const { fen, side } = req.body;

    try {
        const chess = new Chess();

        // Load the position from FEN
        // console.log(chess.load(fen));
        // if (fen && !chess.load(fen)) {
        //     return res.status(400).json({ error: 'Invalid FEN string' });
        // }
        try {
            chess.load(fen);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid FEN string' });
        }

        // Check that the side is valid
        if (side !== 'w' && side !== 'b') {
            return res.status(400).json({ error: 'Invalid side. Use "w" or "b".' });
        }

        // If the current turn doesn't match the requested side, reject
        if (chess.turn() !== side) {
            return res.status(400).json({ error: `It's not ${side === 'w' ? 'white' : 'black'}'s turn.` });
        }

        // Get all legal moves for that side
        const moves = chess.moves({ verbose: true });

        // console.log(moves);

        // return res.status(200).json({ "status": "true" });
        return res.status(200).json({ moves });
    } catch (error) {
        console.error('Error getting legal moves:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
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

async function checkGameState(fen) {
    try {
        const chess = new Chess();
        
        try {
            chess.load(fen);
        } catch (e) {
            // Invalid FEN string
            return { error: 'Invalid FEN string' };
        }

        const result = {
            isCheckmate: chess.isCheckmate(),
            isStalemate: chess.isStalemate(),
            isDraw: chess.isDraw(),
            isCheck: chess.isCheck(),
            turn: chess.turn() // 'w' or 'b'
        };

        return result;
    }
    catch (error) {
        console.error('Error checking game state:', error);
        return { error: 'Error checking game state' };
    }
}


async function processMove(gameId, fen, client, clientTime) {
    try {
        // Validate and fetch current game
        const games = await query(
            'SELECT * FROM games WHERE game_id = ?',
            [gameId]
        );

        if (games.length === 0) return { error: 'Game not found' };
        const game = games[0];

        if (game.game_state !== 'running') return { error: 'Game not running' };

        const chess = new Chess(fen);
        try { 
            chess.load(fen); 
        } catch (e) {
            return { error: 'Could not Load FEN' };
        }
        
        const currentTurn = chess.turn();
        const playerSide = client === 'player1' ? 'w' : 'b';

        if (currentTurn === playerSide) {
            return { error: 'Not your turn' };
        }

        // Save FEN to DB
        await query(
            'INSERT INTO game_data (game_id, fen_state, client, client_time) VALUES (?, ?, ?, ?)',
            [gameId, fen, client, clientTime || new Date()]
        );

        const moves = chess.moves({ verbose: false });

        return {
            message: 'Move accepted',
            fen,
            moves
        };
    } catch (err) {
        console.error('Move error:', err);
        return { error: 'Internal server error' };
    }
}


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
    
  async function getBestMoves(req, res) {
    
    const { fen, game_id, level } = req.body;
    
      if (!fen || !game_id) {
          return res.status(400).json({ error: "Missing fen or game_id" });
      }

    let d_level = (!level) ? 16 : level;
    //   let stockfishPath = "chess-engine/Stockfish-sf_16/src/stockfish";
    //   let stockfishPath = "chess-engine/Stockfish-sf_"+toString(d_level)+"/src/stockfish";
    // let stockfishPath = `chess-engine/Stockfish-sf_${d_level}/src/stockfish`;
    let stockfishPath;

    // Try relative path first
    const relativePath = path.join(__dirname, `../chess-engine/Stockfish-sf_${d_level}/src/stockfish`);
    if (fs.existsSync(relativePath)) {
        stockfishPath = relativePath;
    } else {
    // Fall back to absolute path
        stockfishPath = `/home/azureuser/chesssol-backend/backend/chess-engine/Stockfish-sf_${d_level}/src/stockfish`;
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
  }



async function viewGames(req, res) {
    const game_hash = req.query.gameId;
    if (!game_hash) {
        return res.status(400).json({
            status: false,
            msg: 'Missing required query parameter: gameId',
        });
    }

    try {
        // Use the query function to fetch the game data
        const rows = await query(
            `SELECT player1, player2, bet_status, player_amount, entire_game, duration, move_history, current_fen, time_difference, game_state
             FROM games
             WHERE game_hash = ?
             LIMIT 1`,
            [game_hash]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                status: false,
                msg: 'Game not found',
            });
        }

        return res.json({
            status: true,
            msg: 'Game retrieved successfully',
            data: rows[0],
        });

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            status: false,
            msg: 'Internal Server Error',
        });
    }
}



async function listGames(req, res) {
    const game_state = req.query.mode || 'active';

    try {
        // Use the query function to list the games
        const rows = await query(
            `SELECT player1, player2, bet_status, player_amount, duration, current_fen, time_difference, game_hash, game_state
            FROM games
            WHERE game_state = ?
            ORDER BY timestamp DESC
            LIMIT 7`,
            [game_state]
        );

        return res.json({
            status: true,
            msg: 'Games listed successfully',
            data: rows,
        });

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({
            status: false,
            msg: 'Internal Server Error',
        });
    }
}


// Then add this new endpoint (you can replace the existing root endpoint or add a new one)
async function poolStats(req, res) {
    try {
        const stats = getPoolStats();
        res.json({
            status: true,
            msg: 'Pool stats retrieved successfully',
            data: stats
        });
    } catch (error) {
        console.error('Error retrieving pool stats:', error);
        res.status(500).json({
            status: false,
            msg: 'Internal Server Error',
            error: error.message
        });
    }
}



// const express = require('express');
// const router = express.Router();
// const { query } = require('../db'); // adjust the path as needed

//create-tournament
async function create_tournament(req, res) {
  try {
    const body = req.body;


    if (!body.walletAddress) {
        return res.status(400).json({
          status: 'fail',
          error: true,
          msg: 'unique_hash and walletAddress are required',
          insertId: null,
          insertHash: null
        });
    }

    const name = body.name || 'Demo Tournament';
    const description = body.description || 'A demo tournament for testing.';
    const link = body.link || 'https://example.com';
    const socals = body.socals || 'https://twitter.com/demo';
    const totalPlayers = body.totalPlayers || 16;
    // const wallets = JSON.stringify(body.wallets || {}); // {wallet1: "{}"}
    const wallets = JSON.stringify({});
    const transactions = JSON.stringify({});
    const status = "upcoming";
    const isBet = typeof body.isBet !== 'undefined' ? body.isBet : 0;
    const configuration = JSON.stringify(body.configuration || { mode: "fast", max_rounds: 5 });
    configuration.creator = body.walletAddress;
    configuration.paymentAmount = body.paymentAmount || 0;
    // configuration.entryFee = body.entryFee || body.paymentAmount;

    const nonce = Math.floor(Math.random() * 100000);
    const registeredNum = body.registeredNum || 2;
    const changeValue = body.changeValue || 0;
    const starterScore = typeof body.starterScore !== 'undefined' ? body.starterScore : 100;
    const scoring = JSON.stringify(body.scoring || { win: 3, draw: 1, loss: 0 });
    const image = body.image || 'https://example.com/image.png';
    const type = body.type || 'tournament';
    const level = body.level || 1;
    const unique_hash = body.unique_hash || uuidv4();
    const winners = JSON.stringify(body.winners || {});
    const payoutStatus = body.payoutStatus || 'unpaid';
    const contact = JSON.stringify(body.contact || { email: 'contact@example.com' });
    // const emails = JSON.stringify(body.emails || ['player1@example.com', 'player2@example.com']);
    const emails = JSON.stringify({});
    const addon = body.addon || 'none';
    const date = body.date ? new Date(body.date) : new Date();

    const sql = `
      INSERT INTO tournament (
        name, description, link, socals, totalPlayers, wallets, transactions, status, isBet, configuration, nonce,
        registeredNum, changeValue, starterScore, scoring, image, type, level, unique_hash,
        winners, payoutStatus, contact, emails, addon, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      name, description, link, socals, totalPlayers, wallets, transactions, status, isBet, configuration, nonce,
      registeredNum, changeValue, starterScore, scoring, image, type, level, unique_hash,
      winners, payoutStatus, contact, emails, addon, date
    ];

    const result = await query(sql, params);

    res.status(201).json({
      status: 'success',
      error: false,
      msg: 'Tournament created successfully',
      insertId: result.insertId,
      insertHash: unique_hash
    });
  } catch (error) {
    console.error('Create tournament error:', error);
    res.status(500).json({
      status: 'fail',
      error: true,
      msg: 'Failed to create tournament',
      insertId: null,
      insertHash: null
    });
  }
}

//'/join-tournament'
async function join_tournament(req, res) {
  try {
    const {
      unique_hash,
      walletAddress,
      email,
      contact,
      nickname,
      transactionSignature,
      paymentAmount
    } = req.body;

    if (!unique_hash || !walletAddress) {
      return res.status(400).json({
        status: 'fail',
        error: true,
        msg: 'unique_hash and walletAddress are required',
        insertId: null,
        insertHash: null
      });
    }

    const rows = await query('SELECT * FROM tournament WHERE unique_hash = ?', [unique_hash]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        error: true,
        msg: 'Tournament not found',
        insertId: null,
        insertHash: unique_hash
      });
    }

    const tournament = rows[0];
    const isBet = tournament.isBet;
    console.log(`is wallet:  ${tournament.wallets}`);
    // const wallets = JSON.parse(tournament.wallets || '{}');
    // const contacts = JSON.parse(tournament.contact || '{}');
    // const emails = JSON.parse(tournament.emails || '{}');
    // const config = JSON.parse(tournament.configuration || '{}');
    // const transactions = JSON.parse(tournament.transactions || '{}');
    

    const wallets = typeof tournament.wallets === 'string'
    ? JSON.parse(tournament.wallets || '{}')
    : tournament.wallets || {};

    
    const contacts = typeof tournament.contact === 'string'
    ? JSON.parse(tournament.contact || '{}')
    : tournament.contact || {};

    const emails = typeof tournament.emails === 'string'
    ? JSON.parse(tournament.emails || '{}')
    : tournament.emails || {};

    const config = typeof tournament.configuration === 'string'
    ? JSON.parse(tournament.configuration || '{}')
    : tournament.configuration || {};

    const transactions = typeof tournament.transactions === 'string'
    ? JSON.parse(tournament.transactions || '{}')
    : tournament.transactions || {};



    // Already joined check
    if (wallets[walletAddress]) {
      return res.status(409).json({
        status: 'fail',
        error: true,
        msg: 'Wallet already registered in this tournament',
        insertId: null,
        insertHash: unique_hash
      });
    }

    // Betting-specific logic
    if (isBet) {
      if (!transactionSignature || typeof paymentAmount === 'undefined') {
        return res.status(400).json({
          status: 'fail',
          error: true,
          msg: 'Betting tournament requires transactionSignature and paymentAmount.',
          insertId: null,
          insertHash: unique_hash
        });
      }

      const requiredAmount = config?.entryFee || config?.paymentAmount;
      if (requiredAmount && Number(paymentAmount) !== Number(requiredAmount)) {
        return res.status(400).json({
          status: 'fail',
          error: true,
          msg: `Invalid payment amount. Required: ${requiredAmount}`,
          insertId: null,
          insertHash: unique_hash
        });
      }

      // Store transactionSignature under walletAddress
      transactions[walletAddress] = transactionSignature;
    }

    // Append user info
    wallets[walletAddress] = {
      ...(email ? { email } : {}),
      ...(contact ? { contact } : {}),
      ...(nickname ? { nickname } : {})
    };

    if (email) emails[walletAddress] = email;
    if (contact) contacts[walletAddress] = contact;

    const newRegisteredNum = tournament.registeredNum + 1;

    const updateSQL = `
      UPDATE tournament
      SET wallets = ?, contact = ?, emails = ?, registeredNum = ?, transactions = ?
      WHERE unique_hash = ?
    `;
    const params = [
      JSON.stringify(wallets),
      JSON.stringify(contacts),
      JSON.stringify(emails),
      newRegisteredNum,
      JSON.stringify(transactions),
      unique_hash
    ];

    await query(updateSQL, params);

    return res.status(200).json({
      status: 'success',
      error: false,
      msg: 'Successfully joined tournament',
      insertId: null,
      insertHash: unique_hash
    });

  } catch (error) {
    console.error('Join tournament error:', error);
    return res.status(500).json({
      status: 'fail',
      error: true,
      msg: 'Internal server error',
      insertId: null,
      insertHash: null
    });
  }
}

//update-score
async function update_score(req, res) {
  try {
    const { unique_hash, walletAddress, creatorWalletAddress, changeValue } = req.body;

    if (!unique_hash || !walletAddress || typeof changeValue === 'undefined') {
      return res.status(400).json({
        status: 'fail',
        error: true,
        msg: 'unique_hash, walletAddress, and changeValue are required',
        insertId: null,
        insertHash: null
      });
    }

    const rows = await query('SELECT * FROM tournament WHERE unique_hash = ?', [unique_hash]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: 'fail',
        error: true,
        msg: 'Tournament not found',
        insertId: null,
        insertHash: unique_hash
      });
    }

    const tournament = rows[0];
    // const scoring = JSON.parse(tournament.scoring || '{}');
    const scoring = tournament.scoring || '{}';
    const starterScore = tournament.starterScore || 0;

    const currentScore = scoring[walletAddress] || starterScore;
    const updatedScore = currentScore + Number(changeValue);

    scoring[walletAddress] = updatedScore;

    await query('UPDATE tournament SET scoring = ? WHERE unique_hash = ?', [
      JSON.stringify(scoring),
      unique_hash
    ]);

    return res.status(200).json({
      status: 'success',
      error: false,
      msg: `Score updated for ${walletAddress}`,
      insertId: null,
      insertHash: unique_hash
    });

  } catch (error) {
    console.error('Update score error:', error);
    return res.status(500).json({
      status: 'fail',
      error: true,
      msg: 'Internal server error',
      insertId: null,
      insertHash: null
    });
  }
}


//tournament
async function tournament (req, res) {
    const { unique_hash } = req.params;
  
    try {
      const results = await query('SELECT * FROM tournament WHERE unique_hash = ?', [unique_hash]);
  
      if (results.length === 0) {
        return res.status(404).json({
          status: false,
          error: 'Tournament not found',
          msg: `No tournament found for hash: ${unique_hash}`
        });
      }
  
      res.json({
        status: true,
        error: null,
        msg: 'Tournament retrieved successfully',
        tournament: results[0]
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message,
        msg: 'Database query failed'
      });
    }
}

// GET /tournaments
async function tournaments (req, res) {
    let { status } = req.query;
    status = status?.trim().toLowerCase() || 'all';
  
    try {
      let queryStr = `
        SELECT 
          tournmt_id, name, type, level, unique_hash, date, image, description, status 
        FROM tournament
      `;
  
      const params = [];
  
      if (status !== 'all') {
        queryStr += ' WHERE status = ?';
        params.push(status);
      }
  
      queryStr += ' ORDER BY date DESC LIMIT 50';
  
      const results = await query(queryStr, params);
  
      res.json({
        status: true,
        error: null,
        msg: 'Tournaments retrieved successfully',
        tournaments: results
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        error: err.message,
        msg: 'Database query failed'
      });
    }
}



module.exports = {
  createGame,
  joinGame,
  updateGameState,
  updateGameData,
  getLatestGameData,
  getLegalMoves,
  processMove, // new
  getBestMoves,
  getGameData, // new - db
  viewGames,
  listGames,  //new
  poolStats,    //v new
  create_tournament,
  join_tournament,
  update_score,
  tournament,
  tournaments
};