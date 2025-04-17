// gameHandlers.js
// const db = require('./db');
const { getDbConnection } = require('./db');
const { Chess } = require('chess.js');
const { v4: uuidv4 } = require('uuid');


function assignRandomSide() {
  return Math.random() < 0.5 ? 'w' : 'b';
}


async function createGame(req, res){
    const { walletAddress, side, isBetting, transactionId, playerAmount, game_hash, startDate } = req.body;
    
    try {
        const connection = await getDbConnection();
        
        // Validate required fields
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        let d_game_hash = (!game_hash) ? uuidv4() : game_hash;
        
        // Determine player positions
        let player1 = "";
        let player2 = "";
        const assignedSide = side === 'random' ? assignRandomSide() : side;
        
        if (assignedSide === 'w') {
            player1 = walletAddress;
        } else {
            player2 = walletAddress;
        }
        
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
        
        // Insert into database
        // const [result] = await connection.execute(
        //   'INSERT INTO games SET ?',
        //   [gameData]
        // );
        const keys = Object.keys(gameData).join(', ');
        const placeholders = Object.keys(gameData).map(() => '?').join(', ');
        const values = Object.values(gameData);

        const [result] = await connection.execute(
        `INSERT INTO games (${keys}) VALUES (${placeholders})`,
        values
        );

        //TODO: if you are using a pool, I believe you do not use end? so use the pool current or go back to useing the db.connect
        connection.end();
        
        res.status(201).json({
            game_id: result.insertId,
            message: 'Game created successfully',
            player_position: assignedSide === 'w' ? 'player1 (white)' : 'player2 (black)'
        });
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function joinGame(req, res){
    const { gameId } = req.params;
    const { walletAddress, side, transactionId } = req.body;
    
    try {
        const connection = await getDbConnection();
        
        // Get the game
        const [games] = await connection.execute(
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
        
        // Check betting requirements
        if (game.bet_status) {
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required for betting games' });
        }
        
        // Update transaction ID with delimiter if needed
        // TODO: use a stronger delimeter
        const updatedTxId = game.transaction_id 
            ? `${game.transaction_id}|${transactionId}`
            : transactionId;
        
        await connection.execute(
            'UPDATE games SET transaction_id = ? WHERE game_id = ?',
            [updatedTxId, gameId]
        );
        }
        
        // Determine which player position to fill
        let updateField;
        // if (!game.player1 && (side === 'w' || (!side && !game.player2))) {
        //   updateField = 'player1';
        // } else if (!game.player2 && (side === 'b' || (!side && !game.player1))) {
        //   updateField = 'player2';
        // } else {
        //   return res.status(400).json({ error: 'No available position for your selected side' });
        // }
        if(game.player1 == ""){
            updateField = 'player1';
        }else if (game.player2 == ""){
            updateField = 'player2';
        }else{
            return res.status(400).json({ error: 'No available position for your selected side' });
        }
        
        // Update the game with the joining player
        await connection.execute(
        `UPDATE games SET ${updateField} = ?, game_state = 'running' WHERE game_id = ?`,
        [walletAddress, gameId]
        );
        
        connection.end();
        
        res.status(200).json({
        message: 'Successfully joined the game',
        game_id: gameId,
        player_position: updateField,
        game_state: 'running'
        });
    } catch (error) {
        console.error('Error joining game:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function updateGameState(req, res){
    const { gameId } = req.params;
    const { gameState, reward } = req.body;
    
    try {
        const connection = await getDbConnection();
    
        const validStates = ['starting', 'running', 'checkmate', 'aborted', 'abandoned', 'draw'];
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
        await connection.execute(
          `UPDATE games SET ${setClause} WHERE game_id = ?`,
          [...values, gameId]
        );
    
        connection.release(); // Better than .end() for pooled connections
    
        res.status(200).json({
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
        const connection = await getDbConnection();
        
        // Validate required fields
        if (!fen || !client) {
            connection.release();
            return res.status(400).json({ error: 'FEN and client are required' });
        }

        // Check if game exists and is running
        const [games] = await connection.execute(
        'SELECT * FROM games WHERE game_id = ?',
        [gameId]
        );

        if (games.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Game not found' });
        }

        const game = games[0];
        if (game.game_state !== 'running') {
        connection.release();
        return res.status(400).json({ error: 'Game is not running' });
        }

        // Verify it's the player's turn
        const chessGame = new Chess(fen);
        const currentTurn = chessGame.turn(); // 'w' or 'b'
        const playerSide = client === 'player1' ? 'w' : 'b';

        // if (currentTurn !== playerSide) {
        // connection.release();
        // return res.status(400).json({ error: 'Not your turn' });
        // }
        // console.log(currentTurn + " : " + playerSide);
        if (currentTurn == playerSide) {
            connection.release();
            return res.status(400).json({ error: 'Not your turn' });
        }

        // Get latest FEN from database
        const [latestData] = await connection.execute(
        'SELECT * FROM game_data WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1',
        [gameId]
        );

        const moves = await legalMoves(fen);  // ✅ Await this!

        // Validate move if there's previous state
        if (latestData.length > 0) {
            const latestFen = latestData[0].fen_state;
            
            if (latestFen === fen) {
                    connection.release();
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
                connection.release();
                return res.status(400).json({ error: 'Invalid FEN' });
            }
        }

        // Insert new game data
        await connection.execute(
        'INSERT INTO game_data (game_id, fen_state, client, client_time) VALUES (?, ?, ?, ?)',
        [gameId, fen, client, clientTime || new Date()]
        );

        connection.release();
            res.status(200).json({
                message: 'Game state updated successfully',
                current_fen: fen,
                moves: moves || []  // Just in case it returns undefined
        });

    } catch (error) {
        console.error('Error updating game data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}


async function getLatestGameData(req, res) {
    const { gameId } = req.params;
    const { client, currentFen } = req.body;

    try {
        const connection = await getDbConnection();
        
        // Get latest game data
        const [latestData] = await connection.execute(
        'SELECT * FROM game_data WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1',
        [gameId]
        );

        if (latestData.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'No game data found' });
        }

        const latest = latestData[0];

        // Check if client's FEN is outdated
        if (currentFen && currentFen === latest.fen_state) {
        connection.release();
        return res.status(200).json({
            message: 'Client FEN is current',
            is_current: true,
            current_fen: currentFen
        });
        }

        // Verify the last move wasn't made by this client
        if (latest.client === client) {
        connection.release();
        return res.status(200).json({
            message: 'You made the last move',
            is_current: true,
            current_fen: latest.fen_state
        });
        }

        connection.release();
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
      const connection = await getDbConnection();
  
      // Validate and fetch current game
      const [games] = await connection.execute(
        'SELECT * FROM games WHERE game_id = ?',
        [gameId]
      );
  
      if (games.length === 0) return { error: 'Game not found' };
      const game = games[0];
  
      if (game.game_state !== 'running') return { error: 'Game not running' };
  
      const chess = new Chess(fen);
      try { chess.load(fen); } catch (e) {
        return { error: 'Could not Load FEN' };
      }
      const currentTurn = chess.turn();
      const playerSide = client === 'player1' ? 'w' : 'b';
  
      if (currentTurn === playerSide) {
        return { error: 'Not your turn' };
      }
  
      // Save FEN to DB
      await connection.execute(
        'INSERT INTO game_data (game_id, fen_state, client, client_time) VALUES (?, ?, ?, ?)',
        [gameId, fen, client, clientTime || new Date()]
      );
  
      const moves = chess.moves({ verbose: false });
  
      connection.release();
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
      let stockfishPath = "chess-engine/Stockfish-sf_"+toString(d_level)+"/src/stockfish";

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



module.exports = {
  createGame,
  joinGame,
  updateGameState,
  updateGameData,
  getLatestGameData,
  getLegalMoves,
  processMove, // new
  getBestMoves
};