const { getDbConnection } = require('./db');
const { transferSol } = require('./solanaUtils'); // Custom function to transfer SOL

async function processViewerClaims(gameId) {
  const connection = await getDbConnection();

  const [rows] = await connection.query('SELECT viewsBets, game_state, odds, reward, current_fen FROM games WHERE gameId = ?', [gameId]);
  if (rows.length === 0) {
    return console.error(`No record found in database for game ${gameId}`);
  }

  const gameData = rows[0];
  const { viewsBets, game_state, odds, reward, current_fen } = gameData;

  console.log('Game data:', gameData);

  if (!viewsBets) {
    return console.log(`No viewer bets for game ${gameId}`);
  }

  let viewerBets;
  try {
    viewerBets = JSON.parse(viewsBets);
  } catch (err) {
    return console.error(`Failed to parse viewsBets JSON for game ${gameId}`);
  }

  let oddsObj;
  try {
    oddsObj = JSON.parse(odds);
  } catch (err) {
    return console.error(`Failed to parse odds JSON for game ${gameId}`);
  }

  const conditionToCode = {
    stalemate: "1:1",
    aborted: "1:1",
    checkmate: "1:0", // assuming white wins in checkmate by default
    abandoned: "1:0", // assuming similar to checkmate
    resign: "0:1" // assuming black wins by default
  };

  const correctCode = conditionToCode[game_state];

  if (!correctCode) {
    return console.error(`Invalid game state: ${game_state} for game ${gameId}`);
  }

  console.log(`Correct prediction code: ${correctCode}`);

  for (const [wallet, bet] of Object.entries(viewerBets)) {
    console.log(`Processing bet for wallet: ${wallet}`);

    if (bet.paid) {
      console.log(`Bet already paid for wallet: ${wallet}`);
      continue; // already paid
    }

    if (bet.prediction !== correctCode) {
      console.log(`Incorrect prediction for wallet ${wallet}: expected ${correctCode}, but got ${bet.prediction}`);
      continue; // wrong prediction
    }

    if (!bet.transactionId || !bet.amount) {
      console.log(`Invalid bet structure for wallet ${wallet}: missing transactionId or amount`);
      continue; // invalid bet structure
    }

    // TODO: Add logic to verify the transactionId on the blockchain if needed

    const payoutAmount = (bet.amount * oddsObj[correctCode]).toFixed(6);

    console.log(`Calculated payout amount for wallet ${wallet}: ${payoutAmount} SOL`);

    try {
      const transferResult = await transferSol(wallet, payoutAmount);
      console.log(`Paid ${payoutAmount} SOL to viewer ${wallet}`);
      
      if (transferResult.success) {
        viewerBets[wallet].paid = true;
      } else {
        console.error(`Failed to transfer to ${wallet}: ${transferResult.error}`);
      }
    } catch (err) {
      console.error(`Error paying viewer ${wallet}:`, err);
    }
  }

  // Ensure payment is initialized and correct before updating the DB
  const paymentInitialized = viewerBets.every(bet => bet.paid);

  if (paymentInitialized) {
    try {
      await connection.query('UPDATE games SET viewsBets = ? WHERE gameId = ?', [JSON.stringify(viewerBets), gameId]);
      console.log(`Viewer claims for game ${gameId} processed.`);
    } catch (err) {
      console.error(`Error updating database for game ${gameId}:`, err);
    }
  } else {
    console.log(`Payment not initialized for all viewers for game ${gameId}`);
  }
}

module.exports = { processViewerClaims };



/* const { getDbConnection } = require('./db');
const { transferSol } = require('./solanaUtils'); // Custom function to transfer SOL

async function processViewerClaims(gameId) {
  const connection = await getDbConnection();

  const [rows] = await connection.query('SELECT viewsBets, game_state, odds, reward, current_fen FROM games WHERE gameId = ?', [gameId]);
  if (rows.length === 0) {
    return console.error(`No record found in database for game ${gameId}`);
  }

  const gameData = rows[0];
  const { viewsBets, game_state, odds, reward, current_fen } = gameData;

  if (!viewsBets) return console.log(`No viewer bets for game ${gameId}`);

  let viewerBets;
  try {
    viewerBets = JSON.parse(viewsBets);
  } catch (err) {
    return console.error(`Failed to parse viewsBets JSON for game ${gameId}`);
  }

  let oddsObj;
  try {
    oddsObj = JSON.parse(odds);
  } catch (err) {
    return console.error(`Failed to parse odds JSON for game ${gameId}`);
  }

  const conditionToCode = {
    stalemate: "1:1",
    aborted: "1:1",
    checkmate: reward === 'white' ? "1:0" : "0:1",
    abandoned: reward === 'white' ? "1:0" : "0:1",
    resign: reward === 'white' ? "1:0" : "0:1"
  };

  const correctCode = conditionToCode[game_state];

  for (const [wallet, bet] of Object.entries(viewerBets)) {
    if (bet.paid) continue; // already paid
    if (bet.prediction !== correctCode) continue; // wrong prediction
    if (!bet.transactionId || !bet.amount) continue; // invalid bet structure

    // TODO: Add logic to verify the transactionId on the blockchain if needed

    const payoutAmount = (bet.amount * oddsObj[correctCode]).toFixed(6);

    try {
      await transferSol(wallet, payoutAmount);
      console.log(`Paid ${payoutAmount} SOL to viewer ${wallet}`);
      viewerBets[wallet].paid = true;
    } catch (err) {
      console.error(`Error paying viewer ${wallet}:`, err);
    }
  }

  // Update the viewsBets column with the updated paid status
  await connection.query('UPDATE games SET viewsBets = ? WHERE gameId = ?', [JSON.stringify(viewerBets), gameId]);
  console.log(`Viewer claims for game ${gameId} processed.`);
}

module.exports = { processViewerClaims };
 */