const { spawn } = require('child_process');

// Configuration
const stockfishPath = '/home/kenyor/stockfish_engine/stockfish/stockfish-ubuntu-x86-64-modern'; // Make sure Stockfish is in your PATH or provide full path
const skillLevel = 20; // 0-20 (20 is strongest)
const depth = 18; // Higher depth = stronger analysis (but slower)

function getBestMove(fen, callback) {
    const stockfish = spawn(stockfishPath);
    let bestMove = null;
    let isReady = false;

    // Initialize Stockfish
    stockfish.stdin.write('uci\n');
    stockfish.stdin.write(`setoption name Skill Level value ${skillLevel}\n`);

    stockfish.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        
        for (const line of lines) {
            // Check for "uciok" to know when Stockfish is ready
            if (line.includes('uciok')) {
                isReady = true;
                // Now we can send our position
                stockfish.stdin.write(`position fen ${fen}\n`);
                stockfish.stdin.write(`go depth ${depth}\n`);
            }
            
            // Parse best move from output
            if (line.startsWith('bestmove')) {
                const match = line.match(/bestmove (\w+)/);
                if (match && match[1]) {
                    bestMove = match[1];
                    stockfish.stdin.write('quit\n');
                    callback(null, bestMove);
                }
            }
        }
    });

    stockfish.on('close', (code) => {
        if (!bestMove) {
            callback(new Error(`Stockfish process exited with code ${code}`));
        }
    });

    stockfish.on('error', (err) => {
        callback(err);
    });
}

// Example usage
const exampleFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; // Starting position

getBestMove(exampleFEN, (err, move) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log(`Best move for FEN "${exampleFEN}": ${move}`);
});