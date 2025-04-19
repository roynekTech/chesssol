# Chess WebSocket API Documentation

## Base URL
`ws://your-server-address/chesssol/backend/ws`

## Authentication
No authentication required for basic WebSocket connection. Some endpoints may require wallet verification.

## Message Format
All messages must be JSON objects with a `type` field indicating the message type.

---

## Endpoints

### 1. Create Game
**Type:** `create`  
**Description:** Creates a new chess game.

**Request:**
```json
// Minimal (non-betting)
{
  "type": "create",
  "walletAddress": "0x123..."
}

// Full (betting)
{
  "type": "create",
  "side": "w",
  "duration": 600000, // default to 300000 - 5 mins
  "isBetting": true,
  "transactionId": "tx123...",
  "playerAmount": 0.5,
  "walletAddress": "0x123..."
}

```

**Response (Success):**
```json
{
  "type": "created",
  "gameId": "uuid123",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "color": "w",
  "isBetting": false,
  "playerAmount": null,
  "nonce": "Sign this message..."
}
```

**Response (Error):**
```json
{
  "type": "error",
  "message": "Game side should be random, w or b"
}
```

---

### 2. Join Game
**Type:** `join`  
**Description:** Joins an existing game.

**Request:**
```json

// Non-betting
{
  "type": "join",
  "gameId": "uuid123",
  "walletAddress": "0x123..."
}

// Betting
{
  "type": "join",
  "gameId": "uuid123",
  "walletAddress": "0x123...",
  "transactionId": "tx456...",
  "playerAmount": 0.5
}

```

**Response (Success):**
```json
{
  "type": "joined",
  "gameId": "uuid123",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "color": "b",
  "isBetting": true,
  "betDetails": {
    "playerAmount": 0.1,
    "transactionIds": ["tx123...", "tx456..."]
  },
  "nonce": "Sign this message..."
}
```

**Response (Error):**
```json
{
  "type": "error",
  "message": "Game not found"
}
```

---

### 3. Make Move
**Type:** `move`  
**Description:** Makes a chess move.

**Request:**
```json
{
  "type": "move",
  "gameId": "uuid123",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "client": "player1",
  "move": {
    "from": "e2",
    "to": "e4"
  },
  "initialFen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
}
```

**Response (Broadcast):**
```json
{
  "type": "move",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "turn": "b",
  "valid": true,
  "lastMove": {
    "from": "e2",
    "to": "e4"
  },
  "nonce": "Sign this message..."
}
```

**Response (Error):**
```json
{
  "type": "error",
  "message": "Invalid move"
}
```

---

### 4. List Games
**Type:** `listGames`  
**Description:** Lists all available games.

**Request:**
```json
{
  "type": "listGames"
}
```

**Response:**
```json
{
  "type": "gameList",
  "games": [
    {
      "gameId": "uuid123",
      "status": "waiting",
      "players": 1,
      "viewers": 0,
      "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    }
  ]
}
```

---

### 5. View Game
**Type:** `viewGame`  
**Description:** Spectates an existing game.

**Request:**
```json
{
  "type": "viewGame",
  "gameId": "uuid123"
}
```

**Response (Success):**
```json
{
  "type": "viewingGame",
  "gameId": "uuid123",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "status": "active",
  "players": 2,
  "viewers": 1
}
```

**Response (Error):**
```json
{
  "type": "error",
  "message": "Game not found"
}
```

---

### 6. Chat
**Type:** `chat`  
**Description:** Sends a chat message to game participants.

**Request:**
```json
{
  "type": "chat",
  "gameId": "uuid123",
  "message": "Good move!",
  "sender": "player1"
}
```

**Response (Broadcast):**
```json
{
  "type": "chat",
  "from": "player1",
  "message": "Good move!"
}
```

---

### 7. Reconnect
**Type:** `reconnect`  
**Description:** Reconnects to a game after disconnection.

**Request:**
```json
{
  "type": "reconnect",
  "gameId": "uuid123",
  "playerId": "0x123..."
}
```

**Response (Success):**
```json
{
  "type": "reconnected",
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "color": "w",
  "status": "active"
}
```

**Response (Error):**
```json
{
  "type": "error",
  "message": "Game no longer exists"
}
```

---

### 8. Resign
**Type:** `resign`  
**Description:** Resigns from the current game.

**Request:**
```json
{
  "type": "resign",
  "gameId": "uuid123",
  "playerId": "0x123..."
}
```

**Response (Broadcast):**
```json
{
  "type": "gameEnded",
  "winner": "opponent",
  "reason": "resignation"
}
```

---

### 9. Pair Request
**Type:** `pairRequest`  
**Description:** Requests to be paired with an opponent.

**Request:**
```json
{
  "type": "pairRequest",
  "side": "w|b|random",
  "isBetting": false,
  "walletAddress": "0x123...",
  "playerAmount": 0.1,
  "transactionId": "tx123..."
}
```

**Response (Success):**
```json
{
  "type": "paired",
  "gameId": "uuid123",
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "color": "w",
  "isBetting": false,
  "opponent": "human|bot"
}
```

**Response (Searching):**
```json
{
  "type": "pairing",
  "status": "searching",
  "message": "Looking for opponent..."
}
```

---

## Error Handling
All error responses follow this format:
```json
{
  "type": "error",
  "message": "Description of error"
}
```

## WebSocket Events
1. **Connection:** Establishes WebSocket connection
2. **Message:** Handles incoming messages based on type
3. **Close:** Cleans up disconnected clients

## Notes
1. All timestamps are in milliseconds
2. FEN strings represent the current board state
3. Betting games require additional wallet/transaction verification
4. Nonces are used for wallet signature verification
