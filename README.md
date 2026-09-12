# Real-Time Collaborative Drawing Canvas

A real-time multiplayer drawing application where multiple users can draw simultaneously on the same canvas and see updates from other users while they are drawing.

## Features

* Real-time collaborative drawing
* Multiple users in the same room
* Brush tool
* Eraser tool
* Color selection
* Adjustable stroke width
* Online users list
* User-specific colors
* Real-time cursor positions
* Undo and redo
* Clear canvas
* Room-based collaboration
* Responsive interface
* WebSocket communication using Socket.io

## Technology Stack

### Frontend

* React
* TypeScript
* HTML5 Canvas
* Socket.io Client
* Vite

### Backend

* Node.js
* TypeScript
* Express
* Socket.io

## Project Structure

```text
multiplayer-sync-assignment/
│
├── server/
│   ├── src/
│   │   ├── server.ts
│   │   ├── room.ts
│   │   ├── protocol.ts
│   │   └── drawing-state.ts
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── connection.ts
│   │   ├── interpolation.ts
│   │   ├── render.ts
│   │   ├── main.tsx
│   │   └── style.css
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── README.md
└── ARCHITECTURE.md
```

## Installation

### 1. Clone or download the project

Open the project folder in VS Code.

### 2. Install server dependencies

Open a terminal:

```bash
cd server
npm install
```

### 3. Install client dependencies

Open another terminal:

```bash
cd client
npm install
```

## Running the Application

### Start the server

Inside the `server` folder:

```bash
npm run dev
```

The server will run on:

```text
http://localhost:3000
```

### Start the client

Inside the `client` folder:

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

Open the frontend URL in your browser.

## Testing Multiplayer Drawing

1. Start the backend server.
2. Start the frontend.
3. Open the application in two browser windows or tabs.
4. Enter the same Room ID.
5. Enter different user names.
6. Join the room.
7. Draw on the canvas.
8. Observe the drawing and user activity between clients.

## Communication Flow

The application uses Socket.io for real-time communication.

```text
User A
   │
   │ Drawing / Cursor
   ▼
Client A
   │
   │ WebSocket
   ▼
Socket.io Server
   │
   │ Broadcast
   ▼
Client B
   │
   ▼
User B sees update
```

## Drawing Data

A drawing stroke is represented as a drawing operation containing:

* Operation ID
* User ID
* Drawing type
* Color
* Stroke width
* List of points

Example:

```json
{
  "id": "stroke-123",
  "userId": "user-456",
  "type": "stroke",
  "color": "#000000",
  "width": 5,
  "points": [
    {
      "x": 100,
      "y": 150
    },
    {
      "x": 110,
      "y": 155
    }
  ]
}
```

## Room System

Each collaboration session is identified by a Room ID.

Users joining the same Room ID share:

* Drawing operations
* Canvas history
* Cursor updates
* Online user information

Different rooms maintain separate drawing states.

## Undo / Redo

Drawing operations are maintained by the server so that the current canvas state can be synchronized between connected clients.

Undo and redo operations cause the server to send the updated drawing history to clients in the room.

## Conflict Handling

The server acts as the authoritative source for drawing state.

Clients:

1. Send drawing operations to the server.
2. Render their own strokes immediately.
3. Receive operations from other users.
4. Apply received operations to the local canvas.

This reduces inconsistencies between clients.

## Performance Considerations

The application is designed around incremental drawing and WebSocket communication rather than repeatedly transferring complete canvas images.

Important performance techniques include:

* Canvas-based rendering
* Incremental stroke rendering
* Lightweight point-based drawing operations
* WebSocket communication
* Cursor interpolation
* Server-side room state

## Future Improvements

Possible extensions include:

* Persistent drawing history
* Database storage
* Authentication
* Private rooms
* Drawing shapes
* Text tool
* Image insertion
* Mobile touch support
* Operation compression
* Conflict-free replicated data structures
* Server-side metrics
* Reconnection recovery

## License

This project is created for educational and academic purposes.
