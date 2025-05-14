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

```bash
curl "http://localhost:3000/chesssol/backend/listGames"

curl "http://localhost:3000/chesssol/backend/listGames?mode=checkmate"

curl "https://chesssol.com/api/chesssol/backend/listGames"

{"status":true,"msg":"Games listed successfully","data":[{"bet_status":1,"player_amount":"1.00000000","duration":600000,"current_fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","time_difference":null,"game_state":"active"},{"bet_status":1,"player_amount":"1.00000000","duration":600000,"current_fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","time_difference":null,"game_state":"active"},
```


#### 7. view games
```bash
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
```


#### 8. create tournament
```bash
curl -X POST http://localhost:3000/chesssol/backend/create-tournament \
-H "Content-Type: application/json" \
-d '{
  "name": "My First Cup",
  "description": "A high-stakes chess event.",
  "link": "https://chess-tournament.com",
  "walletAddress": "0x123..."
}'

curl -X POST https://chesssol.com/api/chesssol/backend/create-tournament \
-H "Content-Type: application/json" \
-d '{
  "name": "My First Cup",
  "description": "A high-stakes chess event.",
  "link": "https://chess-tournament.com",
  "walletAddress": "0x123..."
}'


curl -X POST  "https://chesssol.com/api/chesssol/backend/create-tournament \
-H "Content-Type: application/json" \
-d '{
  "name": "My First Cup",
  "description": "A high-stakes chess event.",
  "link": "https://chess-tournament.com",
  "walletAddress": "0xasder3",
  "wallets": ["walletA", "walletB", "walletC"],
  "configuration": { 
    "mode": "rapid", 
    "max_rounds": 4,
    "randomStart": true, 
    "moveTimeout": 30000, 
    "numberOfGames": 1, 
    "resignationTime": "null or integers",
    "abortTimeout": "null or integers" 
  },

}'
```

Response
```bash
{"status":"success","error":false,"msg":"Tournament created successfully","insertId":2,"insertHash":"65b44a56-2b72-41a2-9299-908c97385f59"}
```

#### 9. join tournament

```bash
curl -X POST http://localhost:3000/chesssol/backend/join-tournament \
-H "Content-Type: application/json" \
-d '{
  "unique_hash": "xyz789unique",
  "walletAddress": "wallet88",
  "email": "bettor@example.com", // opt
  "contact": "08098765432", // opt
  "nickname": "QueenCrusher", // opt
  "transactionSignature": "abc-signature-123", // for bet
  "paymentAmount": 200 // for bet
}'

curl -X POST http://localhost:3000/chesssol/backend/join-tournament -H "Content-Type: application/json" -d '{
  "unique_hash": "402c3137-bec4-40b3-9b68-3a937faeeebf",
  "walletAddress": "wallet32",
  "email": "bettor@example.com",
  "contact": "08098765432"
}'

{"status":"success","error":false,"msg":"Successfully joined tournament","insertId":null,"insertHash":"402c3137-bec4-40b3-9b68-3a937faeeebf"}

```


Response
```bash
{"status":"success","error":false,"msg":"Successfully joined tournament","insertId":null,"insertHash":"7d05ee6b-f555-47d0-b444-046b0c1965be"}
```

#### 10. update-score
```bash
curl -X POST http://localhost:3000/chesssol/backend/update-score   -H "Content-Type: application/json"   -d '{
    "unique_hash": "7d05ee6b-f555-47d0-b444-046b0c1965be",
    "walletAddress": "wallet1",
    creatorWalletAddress: "walletCreatx9485",
    "changeValue": 6
  }'
```

Response
```bash
{"status":"success","error":false,"msg":"Score updated for wallet1","insertId":null,"insertHash":"7d05ee6b-f555-47d0-b444-046b0c1965be"}
```

#### 11. list tournaments
```bash
curl http://localhost:3000/chesssol/backend/tournaments


curl "http://localhost:3000/chesssol/backend/tournaments?status=active"

{"status":true,"error":null,"msg":"Tournaments retrieved successfully","tournaments":[{"tournmt_id":2,"name":"MyFirstCup","type":"tournament","level":1,"unique_hash":"65b44a56-2b72-41a2-9299-908c97385f59","date":"2025-05-04T16:28:14.000Z","image":"https://example.com/image.png","description":"A high-stakes chess event.","status":"upcoming"}...}
```

#### 12. details about a tournament
```bash
curl http://localhost:3000/chesssol/backend/tournament/xyz789unique
```

```bash
{"status":true,"error":null,"msg":"Tournament retrieved successfully","tournament":{"tournmt_id":1,"name":"My First Cup","description":"A high-stakes chess event.","link":"https://chess-tournament.com","socials":"https://twitter.com/demo","totalPlayers":16,"wallets":{},..."addon":"none","date":"2025-05-04T16:22:52.000Z","timestamp":"2025-05-04T16:22:52.000Z"}}
```

#### 12. update tournament
```bash

curl -X POST http://localhost:3000/chesssol/backend/update-tournament \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123...",
    "unique_hash": "3c4e1fa3-4f45-41d0-a380-b71d17320750",
    "level": 4,
    "status": "active",
    "winners": {
      "1st": "0xabc...",
      "2nd": "0xdef..."
    }
  }'

// or

curl -X POST http://localhost:3000/chesssol/backend/update-tournament \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123...",
    "unique_hash": "3c4e1fa3-4f45-41d0-a380-b71d17320750",
    "level": 2,
    "description": "Updated tournament description"
  }'

// or

curl -X POST http://localhost:3000/chesssol/backend/update-tournament \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x123...",
    "unique_hash": "3c4e1fa3-4f45-41d0-a380-b71d17320750",
    "level": 3,
  }'


```

```bash
{"status":true,"error":null,"msg":"Tournament retrieved successfully","tournament":{"tournmt_id":1,"name":"My First Cup","description":"A high-stakes chess event.","link":"https://chess-tournament.com","socials":"https://twitter.com/demo","totalPlayers":16,"wallets":{},..."addon":"none","date":"2025-05-04T16:22:52.000Z","timestamp":"2025-05-04T16:22:52.000Z"}}
```


#### 13. Solana Price
```bash
curl http://localhost:3000/chesssol/backend/solana-price


curl "curl https://chesssol.com/api/chesssol/backend/solana-price"


{"price":177.04,"source":"api"}


{"price":177.04,"source":"cache"}

```


# ChessSol Tournament API Documentation

## Base URLs
- **Local Development**: `http://localhost:3000/chesssol/backend`
- **Production**: `https://chesssol.com/api/chesssol/backend`

## Authentication
No authentication required for these endpoints.

## Endpoints

### 1. Create Tournament
Creates a new tournament with customizable settings.

**Endpoint**: `POST /create-tournament`

#### Parameters
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| walletAddress | string | Yes | Creator's wallet address | - |
| name | string | No | Tournament name | "Demo Tournament" |
| description | string | No | Tournament description | "A demo tournament for testing." |
| link | string | No | Tournament website | "https://example.com" |
| socials | json | No | Social media link | {"twitter": "https://twitter.com/demo"} |
| totalPlayers | number | No | Maximum players | 16 |
| isBet | boolean | No | Whether tournament involves betting | 0 (false) |
| configuration | object | No | Tournament rules/settings | { mode: "fast", max_rounds: 5 } |
| paymentAmount | number | No | Entry fee for betting tournaments | 0 |
| starterScore | number | No | Starting score for players | 100 |
| scoring | object | No | Scoring rules | { win: 3, draw: 1, loss: 0 } |
| image | string | No | Tournament image URL | "https://example.com/image.png" |
| type | string | No | Tournament type | "tournament" |
| level | number | No | Tournament level | 1 |
| unique_hash | string | No | Custom unique ID | Auto-generated UUID |
| date | string | No | Tournament date | Current date |

#### Example Requests

**Basic Tournament (Local)**
```bash
curl -X POST http://localhost:3000/chesssol/backend/create-tournament \
-H "Content-Type: application/json" \
-d '{
  "name": "Community Chess Cup",
  "description": "Monthly community tournament",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
}'
```

**Betting Tournament (Production)**
```bash
curl -X POST https://chesssol.com/api/chesssol/backend/create-tournament \
-H "Content-Type: application/json" \
-d '{
  "name": "High Stakes Championship",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "isBet": true,
  "paymentAmount": 100,
  "configuration": {
    "mode": "rapid",
    "max_rounds": 5,
    "moveTimeout": 30000,
    "randomStart": true, 
    "numberOfGames": 1, 
    "resignationTime": "null or integers",
    "abortTimeout": "null or integers"
  }
}'
```

#### Response
```json
{
  "status": "success",
  "error": false,
  "msg": "Tournament created successfully",
  "insertId": 5,
  "insertHash": "7d05ee6b-f555-47d0-b444-046b0c1965be"
}
```

### 2. Join Tournament
Allows players to join an existing tournament.

**Endpoint**: `POST /join-tournament`

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| unique_hash | string | Yes | Tournament unique identifier |
| walletAddress | string | Yes | Player's wallet address |
| email | string | No | Player's email |
| contact | string | No | Player's contact info |
| nickname | string | No | Player's display name |
| transactionSignature | string | Conditional | Required for betting tournaments |
| paymentAmount | number | Conditional | Must match entry fee for betting tournaments |

#### Example Requests

**Basic Tournament Join (Local)**
```bash
curl -X POST http://localhost:3000/chesssol/backend/join-tournament \
-H "Content-Type: application/json" \
-d '{
  "unique_hash": "7d05ee6b-f555-47d0-b444-046b0c1965be",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "nickname": "ChessMaster"
}'
```

**Betting Tournament Join (Production)**
```bash
curl -X POST https://chesssol.com/api/chesssol/backend/join-tournament \
-H "Content-Type: application/json" \
-d '{
  "unique_hash": "7d05ee6b-f555-47d0-b444-046b0c1965be",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "transactionSignature": "0xabc123...",
  "paymentAmount": 100
}'
```

#### Response
```json
{
  "status": "success",
  "error": false,
  "msg": "Successfully joined tournament",
  "insertId": null,
  "insertHash": "7d05ee6b-f555-47d0-b444-046b0c1965be"
}
```

### 3. Update Score
Updates a player's score in a tournament.

**Endpoint**: `POST /update-score`

#### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| unique_hash | string | Yes | Tournament unique identifier |
| walletAddress | string | Yes | Player's wallet address |
| changeValue | number | Yes | Points to add/subtract |
| creatorWalletAddress | string | No | Tournament creator's wallet (for verification) |

#### Example Request
```bash
curl -X POST https://chesssol.com/api/chesssol/backend/update-score \
-H "Content-Type: application/json" \
-d '{
  "unique_hash": "7d05ee6b-f555-47d0-b444-046b0c1965be",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "changeValue": 3
}'
```

#### Response
```json
{
  "status": "success",
  "error": false,
  "msg": "Score updated for 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
  "insertId": null,
  "insertHash": "7d05ee6b-f555-47d0-b444-046b0c1965be"
}
```

### 4. List Tournaments
Retrieves a list of tournaments with optional filtering.

**Endpoint**: `GET /tournaments`

#### Query Parameters
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| status | string | Filter by status (upcoming, active, completed) | all |

#### Example Requests

**All Tournaments (Local)**
```bash
curl http://localhost:3000/chesssol/backend/tournaments
```

**Active Tournaments (Production)**
```bash
curl "https://chesssol.com/api/chesssol/backend/tournaments?status=active"
```

#### Response
```json
{
  "status": true,
  "error": null,
  "msg": "Tournaments retrieved successfully",
  "tournaments": [
    {
      "tournmt_id": 1,
      "name": "Community Chess Cup",
      "type": "tournament",
      "level": 1,
      "unique_hash": "7d05ee6b-f555-47d0-b444-046b0c1965be",
      "date": "2025-05-10T00:00:00.000Z",
      "image": "https://example.com/image.png",
      "description": "Monthly community tournament",
      "status": "upcoming"
    }
  ]
}
```

### 5. Get Tournament Details
Retrieves detailed information about a specific tournament.

**Endpoint**: `GET /tournament/:unique_hash`

#### Example Request
```bash
curl https://chesssol.com/api/chesssol/backend/tournament/7d05ee6b-f555-47d0-b444-046b0c1965be
```

#### Response
```json
{
  "status": true,
  "error": null,
  "msg": "Tournament retrieved successfully",
  "tournament": {
    "tournmt_id": 1,
    "name": "Community Chess Cup",
    "description": "Monthly community tournament",
    "link": "https://chess-tournament.com",
    "socials": "https://twitter.com/demo",
    "totalPlayers": 16,
    "wallets": {
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e": {
        "nickname": "ChessMaster"
      }
    },
    "status": "upcoming",
    "isBet": 0,
    "configuration": {
      "mode": "fast",
      "max_rounds": 5
    },
    "starterScore": 100,
    "scoring": {
      "0x742d35Cc6634C0532925a3b844Bc454e4438f44e": 100,
    },
    "unique_hash": "7d05ee6b-f555-47d0-b444-046b0c1965be",
    "date": "2025-05-10T00:00:00.000Z"
  }
}
```

## Error Responses
All endpoints return consistent error formats:

```json
{
  "status": "fail",
  "error": true,
  "msg": "Error description",
  "insertId": null,
  "insertHash": null
}
```



## ✅ 6. Update Tournament

**Endpoint:** `/update-tournament`

Updates fields in an existing tournament.

**Request Body:**

```json
{
  "walletAddress": "0x123...",
  "unique_hash": "c9097e30-2698-4e1e-8294-da40c7aecf42",
  "level": 2,
  "description": "Updated tournament description"
}
```

**Curl Example:**

```bash
curl -X POST http://localhost:3000/chesssol/backend/update-tournament \
-H "Content-Type: application/json" \
-d '{
  "walletAddress": "0x123...",
  "unique_hash": "c9097e30-2698-4e1e-8294-da40c7aecf42",
  "level": 2,
  "description": "Updated tournament description"
}'
```

---

## ✅ 7. Generate Fixtures

**Endpoint:** `/generate-fixtures`

Generates game fixtures for a tournament.

**Request Body:**

```json
{
  "walletAddress": "0x123...",
  "unique_hash": "c9097e30-2698-4e1e-8294-da40c7aecf42"
}
```

**Curl Example:**

```bash
curl -X POST http://localhost:3000/chesssol/backend/generate-fixtures \
-H "Content-Type: application/json" \
-d '{
  "walletAddress": "0x123...",
  "unique_hash": "c9097e30-2698-4e1e-8294-da40c7aecf42"
}'
```


Common error scenarios:
- Missing required parameters
- Tournament not found
- Wallet already registered
- Invalid payment amount for betting tournaments
- Database errors

## Best Practices
1. Always check the `status` field in responses before proceeding
2. For betting tournaments, verify the `paymentAmount` matches the tournament's requirements
3. Store the `unique_hash` returned from create-tournament for future operations
4. Use the `isBet` field to determine if additional betting parameters are required