const express = require('express');
const router = express.Router();
const { getDbConnection } = require('../utils/db');
const { assignRandomSide, combineTransactionIds } = require('../utils/helpers');

// Create a game
router.post('/', async (req, res) => {
  const { walletAddress, side, isBetting, transactionId, playerAmount, startDate } = req.body;

  if (!walletAddress) return res.status(400).json({ error: 'Wallet address is required' });

  const assignedSide = side === 'random' ? assignRandomSide() : side;
  const player1 = assignedSide === 'w' ? walletAddress : '';
  const player2 = assignedSide === 'b' ? walletAddress : '';

  const gameData = {
    game_state: 'starting',
    player1,
    player2,
    bet_status: isBetting || false,
    start_date: startDate || new Date(),
    timestamp: new Date()
  };

  if (isBetting) {
    if (!transactionId || !playerAmount) {
      return res.status(400).json({ error: 'Transaction ID and player amount are required for betting games' });
    }
    gameData.transaction_id = transactionId;
    gameData.player_amount = playerAmount;
  }

  try {
    const connection = await getDbConnection();
    const keys = Object.keys(gameData).join(', ');
    const placeholders = Object.keys(gameData).map(() => '?').join(', ');
    const values = Object.values(gameData);

    const [result] = await connection.execute(
      `INSERT INTO games (${keys}) VALUES (${placeholders})`,
      values
    );

    connection.release();

    res.status(201).json({
      game_id: result.insertId,
      message: 'Game created successfully',
      player_position: assignedSide === 'w' ? 'player1 (white)' : 'player2 (black)'
    });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Join a game
router.post('/:gameId/join', async (req, res) => {
  const { gameId } = req.params;
  const { walletAddress, side, transactionId } = req.body;

  try {
    const connection = await getDbConnection();

    const [games] = await connection.execute('SELECT * FROM games WHERE game_id = ?', [gameId]);
    if (games.length === 0) return res.status(404).json({ error: 'Game not found' });

    const game = games[0];
    if (game.game_state !== 'starting') return res.status(400).json({ error: 'Game is not in starting state' });
    if (game.player1 === walletAddress || game.player2 === walletAddress) {
      return res.status(400).json({ error: 'You are already in this game' });
    }

    if (game.bet_status && !transactionId) {
      return res.status(400).json({ error: 'Transaction ID is required for betting games' });
    }

    if (game.bet_status) {
      const updatedTxId = combineTransactionIds(game.transaction_id, transactionId);
      await connection.execute('UPDATE games SET transaction_id = ? WHERE game_id = ?', [updatedTxId, gameId]);
    }

    let updateField;
    if (!game.player1) updateField = 'player1';
    else if (!game.player2) updateField = 'player2';
    else return res.status(400).json({ error: 'No available position in this game' });

    await connection.execute(
      `UPDATE games SET ${updateField} = ?, game_state = 'running' WHERE game_id = ?`,
      [walletAddress, gameId]
    );

    connection.release();

    res.status(200).json({
      message: 'Successfully joined the game',
      game_id: gameId,
      player_position: updateField,
      game_state: 'running'
    });
  } catch (err) {
    console.error('Error joining game:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update game state
router.put('/:gameId/state', async (req, res) => {
  const { gameId } = req.params;
  const { gameState, reward } = req.body;

  const validStates = ['starting', 'running', 'checkmate', 'aborted', 'abandoned', 'draw'];
  if (!validStates.includes(gameState)) {
    return res.status(400).json({ error: 'Invalid game state' });
  }

  try {
    const connection = await getDbConnection();
    const updateFields = ['game_state'];
    const values = [gameState];

    if (reward !== undefined) {
      updateFields.push('reward');
      values.push(reward);
    }

    const setClause = updateFields.map(f => `${f} = ?`).join(', ');
    await connection.execute(`UPDATE games SET ${setClause} WHERE game_id = ?`, [...values, gameId]);

    connection.release();

    res.status(200).json({
      message: 'Game state updated successfully',
      game_id: gameId,
      new_state: gameState
    });
  } catch (err) {
    console.error('Error updating game state:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
