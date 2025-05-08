const WebSocket = require('ws');

// Adjust to match your WebSocket server URL
const ws = new WebSocket('ws://localhost:3000/chesssol/backend/ws');
// const ws = new WebSocket('wss://chesssol.com/api/chesssol/backend/ws');

// Unique wallet address for the test
const testWallet = 'testWallet123';
const wallet1 = '0xWalletAddress1';


function sendWhenReady(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  } else {
    ws.on('open', () => ws.send(JSON.stringify(message)));
  }
}


ws.on('open', () => {
    console.log('Connected to server.');

    // Example requests for each category
    const requests = [
        // {
        //     type: 'create',
        //     duration: 120000,
        //     cat: 'human',
        //     walletAddress: testWallet,
        //     side: 'random'
        // },
        {
            type: 'create',
            duration: 120000,
            cat: 'pair',
            walletAddress: testWallet,
            side: 'w'
        },

        {
            type: 'create',
            duration: 120000,
            cat: 'pair',
            walletAddress: wallet1,
            side: 'random'
        },

        // {
        //     type: 'create',
        //     duration: 120000,
        //     cat: 'AI',
        //     walletAddress: testWallet,
        //     side: 'b' // the user is b so AI would play first - handled by create
        // },

        // {
        //     type: 'create',
        //     duration: 120000,
        //     cat: 'AI',
        //     walletAddress: testWallet,
        //     side: 'w' // the user would play first, the AI would respond as b
        // }

        //TODO:
        // Make a move for the user - to see if the AI responses correctly

    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i >= requests.length) {
            clearInterval(interval);
            return;
        }

        console.log(`\n🔹 Sending request (${requests[i].cat}):`);
        console.log(requests[i]);

        ws.send(JSON.stringify(requests[i]));
        i++;
    }, 3000); // Delay each request for clarity
});

ws.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log('📩 Message from server:');
        console.dir(message, { depth: null });


        if (message.type === 'joined') {
            const gameId = message.gameId;
            console.log('Wallet2 joined the game successfully!');
          
          // Now make a move (player 1 move first if w)
          setTimeout(() => {
            if (message.color === 'w') {
              sendWhenReady(ws, {
                type: 'move',
                gameId: gameId,
                walletAddress: wallet1,
                move: 'e2e4',
                fen: message.fen,
                initialFen: message.fen
              });
            } else {
              sendWhenReady(ws, {
                type: 'move',
                gameId: gameId,
                walletAddress: wallet1,
                move: 'e7e5',
                fen: message.fen,
                initialFen: message.fen
              });
            }
          }, 3000);
      
          
        }
    } catch (err) {
        console.error('Invalid JSON message from server:', data);
    }


        

});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
    console.log('Connection closed.');
});
