update

curl -X PUT http://localhost:3000/games/1/state -H "Content-Type: application/json" -d '{"gameState":"draw", "reward":"winner_wallet"}'

create
curl -X OST http://localhost:3000/games -H "Content-Type: application/json" -d '{"walletAddress":"player1_wallet", "side":"random"}'

join
curl -X OST http://localhost:3000/games/1/join -H "Content-Type: application/json" -d '{"walletAddress":"player2_wallet"}'



# 1. Create a new game
curl -X POST http://localhost:3000/games \
-H "Content-Type: application/json" \
-d '{
  "walletAddress": "player1_wallet",
  "side": "w"
}'

# 2. Join the game (from another player)
curl -X POST http://localhost:3000/games/1/join \
-H "Content-Type: application/json" \
-d '{
  "walletAddress": "player2_wallet"
}'

# 3. Player1 makes first move (e4)
curl -X POST http://localhost:3000/games/1/data \
-H "Content-Type: application/json" \
-d '{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "client": "player1"
}'

<!-- curl -X POST http://localhost:3000/games/1/data -H "Content-Type: application/json" -d '{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0",
  "client": "player1"
}'
{"message":"Game state updated successfully","current_fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0"} -->

# 4. Player2 checks for updates
curl -X GET http://localhost:3000/games/1/data \
-H "Content-Type: application/json" \
-d '{
  "client": "player2",
  "currentFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}'

# 5. Player2 checks legal moves
curl -X POST http://localhost:3000/games/legal-moves \
-H "Content-Type: application/json" \
-d '{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "side": "b"
}'

# 6. Player2 makes move (e5)
curl -X POST http://localhost:3000/games/1/data \
-H "Content-Type: application/json" \
-d '{
  "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  "client": "player2"
}'

# Legal Moves
curl -X POST http://localhost:3000/games/legal-moves   -H "Content-Type: application/json"   -d '{"fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "side": "w"}'