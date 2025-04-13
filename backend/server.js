const express = require('express');
const cors = require('cors'); // Add this line
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const port = 3000;

// Absolute path to Stockfish
const stockfishPath = "chess-engine/stockfish_16/stockfish-ubuntu-x86-64-modern";

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

function getBestMove(fen, callback) {
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
app.get(MAIN_DIR+'/', (req, res) => {
    res.send('Entrace Point - Hello world');
});

app.post('/chesssol/backend/get_best_move', (req, res) => {
    const { fen, game_id } = req.body;
    
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
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`Stockfish path configured as: ${stockfishPath}`);
    // Verify Stockfish is executable
    require('fs').access(stockfishPath, require('fs').constants.X_OK, (err) => {
        console.log(err ? 'Stockfish is NOT executable' : 'Stockfish is executable');
    });
});