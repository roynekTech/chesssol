const WebSocket = require('ws');
const { Chess } = require('chess.js');

// Adjust to match your WebSocket server URL
const ws = new WebSocket('ws://localhost:3000/chesssol/backend/ws');

const testWallet = 'testWallet123';
const aiGameStates = []; // Track AI game IDs and current FENs

ws.on('open', () => {
    console.log('Connected to server.');

    // Create requests
    const requests = [
        {
            type: 'create',
            duration: 120000,
            cat: 'AI',
            walletAddress: testWallet,
            side: 'w' // We move first, then AI responds
        },
        {
            type: 'create',
            duration: 120000,
            cat: 'AI',
            walletAddress: testWallet,
            side: 'b' // AI moves first, then we respond
        }
    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i >= requests.length) {
            clearInterval(interval);
            return;
        }

        console.log(`\n🔹 Sending request (${requests[i].cat}):`);
        ws.send(JSON.stringify(requests[i]));
        i++;
    }, 3000); // Delay each request
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('📩 Message from server:');
        console.dir(message, { depth: null });

        if (message.type === 'created' && message.cat === 'AI') {
            // Store AI game info to make a move after some time
            aiGameStates.push({
                gameId: message.gameId,
                fen: message.fen,
                side: message.side,
                moveMade: false
            });

            // Wait and make a move if it's our turn
            setTimeout(() => makeTestMove(message), 5000);
        }

        // Update FEN after a move (from AI or us)
        if (message.type === 'move') {
            const aiGame = aiGameStates.find(g => g.gameId === message.gameId);
            if (aiGame) aiGame.fen = message.fen;
        }

    } catch (err) {
        console.error('Invalid JSON from server:', data);
    }
});

function makeTestMove({ gameId, fen, side }) {
    const chess = new Chess(fen);

    // Only play if it's our turn
    if (chess.turn() !== side) {
        console.log(`⏳ Not our turn yet in game ${gameId}.`);
        return;
    }

    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) {
        console.log(`♟️ No legal moves available for game ${gameId}.`);
        return;
    }

    // Pick the first legal move for testing
    const move = legalMoves[0];
    chess.move(move); // Apply move locally

    const movePayload = {
        type: 'move',
        gameId: gameId,
        fen: chess.fen(),
        move: move.from + move.to + (move.promotion || ''),
        initialFen: fen,
        walletAddress: testWallet,
        clientTime: Date.now(),
        signature: null
    };

    console.log(`♟️ Sending test move: ${movePayload.move}`);
    ws.send(JSON.stringify(movePayload));
}

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
    console.log('Connection closed.');
});
