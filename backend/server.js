const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 3000;

const STOCKFISH_PATH = 'chess-engine/stockfish_16/stockfish-ubuntu-x86-64-modern';

let MAIN_DIR = "/chesssol/backend";

app.use(express.json());

function getBestMove(fen, depth = 15) {
    return new Promise((resolve, reject) => {
        const stockfish = spawn(STOCKFISH_PATH);

        let bestMove = null;
        let isReady = false;

        stockfish.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');

            for (const line of lines) {
                if (line.startsWith('readyok') && !isReady) {
                    isReady = true;
                    stockfish.stdin.write(`position fen ${fen}\n`);
                    stockfish.stdin.write(`go depth ${depth}\n`);
                }

                if (line.startsWith('bestmove')) {
                    bestMove = line.split(' ')[1];
                    stockfish.stdin.write('quit\n');
                }
            }
        });

        stockfish.stderr.on('data', (data) => {
            console.error(`Stockfish error: ${data.toString()}`);
        });

        stockfish.on('close', (code) => {
            if (bestMove) {
                resolve(bestMove);
            } else {
                reject(new Error('No best move received from stockfish'));
            }
        });

        // Initialize Stockfish and wait for readyok
        stockfish.stdin.write('uci\n');
        stockfish.stdin.write('isready\n');
    });
}

// Serve "Hello World" at /sonic_universe/client/sonic_planet/api/
app.get(MAIN_DIR+'/', (req, res) => {
    res.send('Entrace Point - Hello world');
});

app.post(MAIN_DIR+'/get_best_move', async (req, res) => {
    const { fen, game_id } = req.body;

    if (!fen || !game_id) {
        return res.status(400).json({ error: "'fen' and 'game_id' are required" });
    }

    try {
        const bestMove = await getBestMove(fen);
        res.json({ game_id, fen, best_move: bestMove });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
