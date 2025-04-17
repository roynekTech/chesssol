# Chess API Documentation

## Base URL
```
http://localhost:8080/chesssol/backend
https://roynek.com/chesssol/backend
```


## WebSocket Endpoint
```
ws://localhost:8080/chesssol/backend/ws
ws://roynek.com/chesssol/backend/ws
```

## REST API Endpoints

### 1. Game Management

#### Create a new game
```
POST /games
```

**Request Body:**
```json
{
  "walletAddress": "string (required)",
  "side": "string (optional - 'w', 'b', or 'random')",
  "isBetting": "boolean (optional)",
  "transactionId": "string (required if isBetting is true)",
  "playerAmount": "number (required if isBetting is true)",
  "game_hash": "string (optional)",
  "startDate": "ISO date string (optional)"
}
```

**Success Response:**
```json
{
  "game_id": "number",
  "message": "string",
  "player_position": "string ('player1 (white)' or 'player2 (black)')"
}
```

#### Join an existing game
```
POST /games/:gameId/join
```

**Request Body:**
```json
{
  "walletAddress": "string (required)",
  "side": "string (optional - 'w' or 'b')",
  "transactionId": "string (required if game is betting)"
}
```

**Success Response:**
```json
{
  "message": "string",
  "game_id": "string",
  "player_position": "string",
  "game_state": "string ('running')"
}
```

#### Update game state
```
PUT /games/:gameId/state
```

**Request Body:**
```json
{
  "gameState": "string ('starting', 'running', 'checkmate', 'aborted', 'abandoned', 'draw')",
  "reward": "number (optional)"
}
```

**Success Response:**
```json
{
  "message": "string",
  "game_id": "string",
  "new_state": "string"
}
```

### 2. Game Data

#### Update game state (FEN)
```
POST /games/:gameId/data
```

**Request Body:**
```json
{
  "fen": "string (required - current FEN string)",
  "client": "string (required - 'player1' or 'player2')",
  "clientTime": "ISO date string (optional)"
}
```

**Success Response:**
```json
{
  "message": "string",
  "current_fen": "string",
  "moves": "array"
}
```

#### Get latest game state
```
GET /games/:gameId/data
```

**Request Body:**
```json
{
  "client": "string (required - 'player1' or 'player2')",
  "currentFen": "string (optional - client's current FEN)"
}
```

**Possible Responses:**
1. FEN unchanged:
```json
{
  "message": "string",
  "is_current": true,
  "current_fen": "string"
}
```

2. You made last move:
```json
{
  "message": "string",
  "is_current": true,
  "current_fen": "string"
}
```

3. FEN updated:
```json
{
  "message": "string",
  "is_current": false,
  "current_fen": "string",
  "last_updated": "ISO date string"
}
```

### 3. Chess Logic

#### Get legal moves
```
POST /games/legal-moves
```

**Request Body:**
```json
{
  "fen": "string (required)",
  "side": "string (required - 'w' or 'b')"
}
```

**Success Response:**
```json
{
  "moves": [
    {
      "color": "string",
      "from": "string",
      "to": "string",
      "flags": "string",
      "piece": "string",
      "san": "string"
    }
  ]
}
```

#### Get best move (Stockfish engine)
```
POST /get_best_move
```

**Request Body:**
```json
{
  "fen": "string (required)",
  "game_id": "string (required)",
  "level": "number (optional, default 16)"
}
```

**Success Response:**
```json
{
  "game_id": "string",
  "fen": "string",
  "best_move": "string"
}
```

## WebSocket API

### Connection
Connect to `ws://localhost:8080/chesssol/backend/ws`

### Message Types

#### 1. Create Game
**Client:**
```json
{
  "type": "create"
}
```

**Server Response:**
```json
{
  "type": "created",
  "gameId": "string",
  "fen": "string",
  "color": "string ('w')"
}
```

#### 2. Join Game
**Client:**
```json
{
  "type": "join",
  "gameId": "string"
}
```

**Server Response:**
```json
{
  "type": "joined",
  "gameId": "string",
  "fen": "string",
  "color": "string ('w' or 'b')"
}
```

#### 3. Make Move
**Client:**
```json
{
  "type": "move",
  "gameId": "string",
  "fen": "string",
  "client": "string"
}
```

**Server Broadcast:**
```json
{
  "type": "move",
  "fen": "string",
  "turn": "string ('w' or 'b')"
}
```

#### 4. Chat Message
**Client:**
```json
{
  "type": "chat",
  "gameId": "string",
  "message": "string",
  "client": "string"
}
```

**Server Broadcast:**
```json
{
  "type": "chat",
  "from": "string",
  "message": "string"
}
```

#### 5. Reconnect
**Client:**
```json
{
  "type": "reconnect",
  "gameId": "string",
  "playerId": "string"
}
```

**Server Response:**
```json
{
  "type": "reconnected",
  "fen": "string",
  "color": "string",
  "status": "string"
}
```

#### 6. Resign
**Client:**
```json
{
  "type": "resign",
  "gameId": "string",
  "playerId": "string"
}
```

**Server Broadcast:**
```json
{
  "type": "gameEnded",
  "winner": "string",
  "reason": "string ('resignation')"
}
```

### Error Responses
```json
{
  "type": "error",
  "message": "string"
}
```

## Sample Flows

### 1. Creating and Joining a Game
1. Player A creates game via REST or WebSocket
2. Player B joins via game ID
3. Both players receive initial FEN and color assignments

### 2. Making Moves
1. Player makes move by sending FEN to `/games/:gameId/data` (REST) or via WebSocket
2. Server validates move
3. Server broadcasts new FEN to both players

### 3. Game Completion
1. When checkmate/draw occurs, frontend calls `/games/:gameId/state`
2. Server updates game state
3. All players receive final state

## Notes
- All timestamps are in ISO 8601 format
- FEN strings must be valid according to standard chess notation
- WebSocket connections should implement reconnection logic
- For betting games, transaction IDs are required when joining