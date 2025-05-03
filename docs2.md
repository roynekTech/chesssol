# Chess Multiplayer API Documentation  
**Base URL**: `http://localhost:8080/chesssol/backend`  
**WebSocket URL**: `ws://localhost:8080/chesssol/backend/ws`

## 🌐 HTTP Endpoints

### 1. Game Management
| Endpoint | Method | Description | Request Body | Success Response |
|----------|--------|-------------|--------------|------------------|
| `/games` | POST | Create new game | `{ walletAddress, side, isBetting, transactionId, playerAmount }` | `{ game_id, message, player_position }` |
| `/games/:gameId/join` | POST | Join existing game | `{ walletAddress, side, transactionId }` | `{ message, game_id, player_position, game_state }` |
| `/games/:gameId/state` | PUT | Update game status | `{ gameState, reward }` | `{ message, game_id, new_state }` |

### 2. Game Data
| Endpoint | Method | Description | Request Body | Success Response |
|----------|--------|-------------|--------------|------------------|
| `/games/:gameId/data` | POST | Submit move | `{ fen, client }` | `{ message, current_fen, moves }` |
| `/games/:gameId/data` | GET | Get current state | `{ client, currentFen }` | `{ message, is_current, current_fen }` |
| `/games/legal-moves` | POST | Get possible moves | `{ fen, side }` | `{ moves: [...] }` |
| `/get_best_move` | POST | Get AI suggestion | `{ fen, game_id, level }` | `{ game_id, fen, best_move }` |

---

## 🔌 WebSocket API

### **Game Flow Messages**
| Client Sends → Server | Server Responds → Client |
|-----------------------|--------------------------|
| `{"type":"create"}` | `{"type":"created", "gameId": "...", "fen": "...", "color": "w"}` |
| `{"type":"join", "gameId": "..."}` | `{"type":"joined", "gameId": "...", "fen": "...", "color": "b"}` |
| `{"type":"move", "gameId": "...", "fen": "...", "client": "..."}` | Broadcasts `{"type":"move", "fen": "...", "turn": "w/b"}` to all |

### **Spectator Features**
| Client Sends → Server | Server Responds → Client |
|-----------------------|--------------------------|
| `{"type":"listGames"}` | `{"type":"gameList", "games": [...]}` |
| `{"type":"viewGame", "gameId": "..."}` | `{"type":"viewingGame", "gameId": "...", "fen": "...", "players": X, "viewers": Y}` |

### **Special Commands**
| Client Sends → Server | Server Responds → Client |
|-----------------------|--------------------------|
| `{"type":"chat", "gameId": "...", "message": "..."}` | Broadcasts to all in game |
| `{"type":"resign", "gameId": "...", "playerId": "..."}` | `{"type":"gameEnded", "reason": "resignation"}` |

---

## 🚨 Error Format (Both HTTP/WS)
```json
{
  "error": "string",
  "message": "Detailed error description"
}
```

## 📋 WebSocket Message Reference Table

| Message Type | Direction | Fields | Description |
|--------------|-----------|--------|-------------|
| `create` | Client→Server | - | Initiate new game |
| `created` | Server→Client | gameId, fen, color | Confirm game creation |
| `join` | Client→Server | gameId | Request to join |
| `move` | Bidirectional | gameId, fen, client | Move submission/broadcast |
| `viewGame` | Client→Server | gameId | Spectator request |
| `chat` | Bidirectional | gameId, message, client | Chat messages |

---

## Example Flows

**1. HTTP Game Creation**
```bash
curl -X POST http://localhost:8080/chesssol/backend/games \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x123", "side":"w", "isBetting":false}'
```

**2. WebSocket Move Submission**
```javascript
ws.send(JSON.stringify({
  type: "move",
  gameId: "abc123",
  fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  client: "player1"
}));
```





THere are comprehensive examples based strictly on your code, covering both HTTP and WebSocket APIs:

---

### HTTP API Examples

#### 1. Create Game
**Request**:
```http
POST /chesssol/backend/games
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "side": "random",
  "isBetting": true,
  "transactionId": "tx_789012",
  "playerAmount": 0.5
}
```

**Response**:
```json
{
  "game_id": 42,
  "message": "Game created successfully",
  "player_position": "player1 (white)",
  "game_hash": "28jd0-2945..."
}
```

#### 2. Join Game
**Request**:
```http
POST /chesssol/backend/games/42/join
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44f",
  "side": "b",
  "transactionId": "tx_789013"
}
```

**Response**:
```json
{
  "message": "Successfully joined the game",
  "game_id": 42,
  "player_position": "player2", // player2 is b and player1 is w
  "game_state": "running"
}
```

#### 3. Submit Move
**Request**:
```http
POST /chesssol/backend/games/42/data
Content-Type: application/json

{
  "fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
  "client": "player1"
}
```

**Response**:
```json
{
  "message": "Game state updated successfully",
  "current_fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
  "moves": ["c5c4", "b8a6", "g8f6"]
}
```

#### 4. Get Best Move (Stockfish)
**Request**:
```http
POST /chesssol/backend/get_best_move
Content-Type: application/json

{
  "fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
  "game_id": "42",
  "level": 18
}
```

**Response**:
```json
{
  "game_id": "42",
  "fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
  "best_move": "g8f6"
}
```



#### 5. Game Data
**Request**:
```http
POST /chesssol/backend/gameData/GAME_HASH
Content-Type: application/json
example: curl -X GET http://localhost:3000/chesssol/backend/gameData/6d15fd86-eeda-4bf1-8c27-43f3addace31

```

**Response**:
```json
{
  "state": true,
  "gameData": "JSON",
  "duration": 30000,
  "game_state": "waiting",
  "bet_status": "false",
}
```

#### 6. list games

curl "http://localhost:3000/chesssol/backend/listGames"

curl "http://localhost:3000/chesssol/backend/listGames?mode=checkmate"

curl "https://chesssol.com/api/chesssol/backend/listGames"

{"status":true,"msg":"Games listed successfully","data":[{"bet_status":1,"player_amount":"1.00000000","duration":600000,"current_fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","time_difference":null,"game_state":"active"},{"bet_status":1,"player_amount":"1.00000000","duration":600000,"current_fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","time_difference":null,"game_state":"active"},

#### 7. view games

curl  "http://local
host:3000/chesssol/backend/viewGame?gameId=421a396d-4c1f-44ed-b057-66e262fc2e58"

curl  "https://chesssol.com/api/chesssol/backend/viewGame?gameId=1b3dd3f2-601e-4b02-a110-2c976ff43a84"

{
  "status": true,
  "msg": "Game retrieved successfully",
  "data": {
    "bet_status": 1,
    "player_amount": "0.00500000",
    "entire_game": "...",
    "duration": 5000,
    "move_history": "...",
    "current_fen": "some FEN string",
    "time_difference": "...",
    "game_state": "active"
  }
}




### WebSocket API Examples

#### 1. Create Game
**Client**:
```javascript
ws.send(JSON.stringify({
  type: "create"
}));
```

**Server Response**:
```json
{
  "type": "created",
  "gameId": "abc123",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "color": "w"
}
```

#### 2. Join Game
**Client**:
```javascript
ws.send(JSON.stringify({
  type: "join",
  gameId: "abc123"
}));
```

**Server Response**:
```json
{
  "type": "joined",
  "gameId": "abc123",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "color": "b"
}
```

#### 3. Make Move
**Client**:
```javascript
ws.send(JSON.stringify({
  type: "move",
  gameId: "abc123",
  fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  client: "player_xyz"
}));
```

**Server Broadcast** (to all participants):
```json
{
  "type": "move",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "turn": "b",
  "valid": true
}
```

#### 4. View Game (Spectator)
**Client**:
```javascript
ws.send(JSON.stringify({
  type: "viewGame",
  gameId: "abc123"
}));
```

**Server Response**:
```json
{
  "type": "viewingGame",
  "gameId": "abc123",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "status": "active",
  "players": 2,
  "viewers": 1
}
```

#### 5. Chat Message
**Client**:
```javascript
ws.send(JSON.stringify({
  type: "chat",
  gameId: "abc123",
  message: "Good move!",
  client: "spectator_123"
}));
```

**Server Broadcast**:
```json
{
  "type": "chat",
  "from": "spectator_123",
  "message": "Good move!"
}
```

#### 6. Resign Game
**Client**:
```javascript
ws.send(JSON.stringify({
  type: "resign",
  gameId: "abc123",
  playerId: "player_xyz"
}));
```

**Server Broadcast**:
```json
{
  "type": "gameEnded",
  "winner": "opponent",
  "reason": "resignation"
}
```

---

### Error Examples

#### WebSocket Error
```json
{
  "type": "error",
  "message": "Game not found"
}
```

#### HTTP Error (400)
```json
{
  "error": "Invalid FEN string",
  "message": "Failed to parse FEN: rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

#### HTTP Error (500)
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```
