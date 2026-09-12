# Architecture — Real-Time Collaborative Drawing Canvas

## 1. System Overview

The application follows a client-server architecture.

Multiple clients connect to a central Node.js server using Socket.io. The server manages rooms, users, drawing operations, and shared canvas state.

```text
                    ┌─────────────────────┐
                    │    Socket.io Server │
                    │      Node.js        │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          WebSocket / Socket.io        WebSocket / Socket.io
                 │                           │
        ┌────────▼────────┐         ┌────────▼────────┐
        │    Client A     │         │    Client B     │
        │  React + Canvas │         │  React + Canvas │
        └─────────────────┘         └─────────────────┘
```

---

## 2. Client Architecture

The frontend is built using React, TypeScript, and HTML5 Canvas.

### Client Components

```text
client/src/
│
├── App.tsx
│   └── Main application UI and drawing interactions
│
├── connection.ts
│   └── Socket.io connection and communication
│
├── interpolation.ts
│   └── Smooth remote cursor movement
│
├── render.ts
│   └── Canvas rendering functions
│
├── main.tsx
│   └── React application entry point
│
└── style.css
    └── Application styling
```

### Responsibilities

#### App.tsx

Responsible for:

* Canvas interaction
* Brush and eraser selection
* Color selection
* Stroke width
* Room joining
* Online users
* Undo/redo controls
* Sending cursor coordinates
* Creating drawing operations

#### connection.ts

Responsible for:

* Creating the Socket.io connection
* Joining rooms
* Sending drawing operations
* Sending cursor positions
* Sending undo/redo requests
* Receiving server events

#### render.ts

Responsible for:

* Rendering drawing operations
* Drawing individual segments
* Clearing and redrawing the canvas
* Rendering remote cursor information

#### interpolation.ts

Responsible for smoothing remote cursor movement.

Instead of immediately jumping to every received cursor coordinate, the client gradually moves the displayed cursor toward the latest received position.

---

## 3. Server Architecture

The backend uses Node.js, Express, TypeScript, and Socket.io.

```text
server/src/
│
├── server.ts
│   └── Socket.io server and event handling
│
├── room.ts
│   └── Room and user management
│
├── protocol.ts
│   └── Shared communication data structures
│
└── drawing-state.ts
    └── Canvas operation history
```

### server.ts

The main server entry point.

Responsibilities:

* Start HTTP server
* Configure Express
* Configure Socket.io
* Accept client connections
* Manage room membership
* Receive drawing operations
* Broadcast drawing operations
* Broadcast cursor positions
* Handle undo/redo
* Handle disconnections

### room.ts

Maintains users belonging to each room.

Each room contains:

```text
Room
 ├── Room ID
 └── Users
      ├── User ID
      ├── Name
      └── Color
```

### drawing-state.ts

Maintains the drawing operation history for each room.

```text
DrawingState
│
├── Operations
│    ├── Operation 1
│    ├── Operation 2
│    └── Operation 3
│
└── Redo Stack
```

### protocol.ts

Defines the TypeScript structures used for communication.

Examples:

* DrawingOperation
* User
* Point
* CursorMessage
* UndoMessage
* RedoMessage

---

## 4. Real-Time Drawing Flow

When a user draws:

```text
Mouse / Pointer
      │
      ▼
Canvas
      │
      ├──────────────► Local rendering
      │
      ▼
Drawing Operation
      │
      ▼
Socket.io Client
      │
      ▼
Socket.io Server
      │
      ▼
Room
      │
      ▼
Other Connected Clients
      │
      ▼
Canvas Rendering
```

The local client renders immediately so the user does not have to wait for the network.

The server broadcasts the operation to other users in the same room.

---

## 5. Cursor Synchronization

Cursor coordinates are transmitted separately from drawing operations.

```text
Client A
   │
   │ cursor(x, y)
   ▼
Server
   │
   │ cursor-update
   ▼
Client B
   │
   ▼
Interpolation
   │
   ▼
Smooth Remote Cursor
```

This prevents cursor movement from being treated as drawing data.

---

## 6. Room Isolation

Each room has its own state.

```text
Room A
├── Users
├── Drawing State
└── Cursor Updates

Room B
├── Users
├── Drawing State
└── Cursor Updates
```

A drawing operation from Room A is never broadcast to Room B.

---

## 7. State Synchronization

When a new user joins a room:

```text
New Client
    │
    │ join-room
    ▼
Server
    │
    ├── Find/Create Room
    │
    ├── Add User
    │
    └── Get Drawing History
            │
            ▼
       New Client
            │
            ▼
       Render History
```

The new client receives the current drawing history and reconstructs the canvas.

---

## 8. Conflict Resolution

The server is treated as the authoritative source of shared drawing state.

When two users send operations:

```text
Client A ──────┐
               │
               ▼
          Socket.io Server
               │
               ▼
          Room State
               │
               ├──────► Client A
               │
               └──────► Client B
```

Operations are processed in the order received by the server.

Each operation contains a unique ID so that individual drawing actions can be identified.

---

## 9. Undo / Redo

Undo and redo requests are processed by the server.

```text
Client
  │
  │ undo
  ▼
Server
  │
  ▼
DrawingState
  │
  ├── Remove operation
  │
  └── Update history
          │
          ▼
     Broadcast history
          │
          ▼
      All clients
```

This ensures that clients receive the same updated canvas state.

---

## 10. Data Model

### User

```text
User
├── id
├── name
└── color
```

### Point

```text
Point
├── x
└── y
```

### DrawingOperation

```text
DrawingOperation
├── id
├── userId
├── type
├── color
├── width
└── points[]
```

---

## 11. Socket Events

### Client → Server

| Event          | Purpose                   |
| -------------- | ------------------------- |
| `join-room`    | Join a collaboration room |
| `draw`         | Send drawing operation    |
| `cursor`       | Send cursor position      |
| `undo`         | Request undo              |
| `redo`         | Request redo              |
| `clear-canvas` | Clear room canvas         |

### Server → Client

| Event           | Purpose                                       |
| --------------- | --------------------------------------------- |
| `history`       | Send current drawing history                  |
| `drawing`       | Broadcast drawing operation                   |
| `cursor-update` | Broadcast remote cursor                       |
| `user-joined`   | Notify users about a new participant          |
| `user-left`     | Notify users about a disconnected participant |
| `users`         | Send current users                            |

---

## 12. Performance Strategy

The application avoids sending canvas screenshots between users.

Instead, it sends lightweight vector-like drawing information:

```text
Stroke
 ├── Color
 ├── Width
 └── Points[]
```

Advantages:

* Lower network usage
* Easy reconstruction
* Easy undo/redo
* Resolution independent
* Server can maintain operation history

Remote cursors are interpolated locally to make movement smoother.

---

## 13. Scalability Considerations

The current implementation keeps room state in server memory.

For a larger deployment, the architecture can be extended with:

```text
                    Load Balancer
                         │
              ┌──────────┴──────────┐
              │                     │
          Server A              Server B
              │                     │
              └──────────┬──────────┘
                         │
                    Redis Adapter
                         │
                    Shared State
```

A Socket.io Redis adapter could allow multiple server instances to participate in the same rooms.

Persistent storage could also be added for long-term drawing history.

---

## 14. Future Extensions

The architecture can support additional tools without replacing the core synchronization system.

Possible additions:

* Shapes
* Lines
* Rectangles
* Circles
* Text
* Image insertion
* Touch drawing
* Mobile support
* Persistent rooms
* User authentication
* Database storage
* Operation compression
* Reconnection recovery
* Server performance metrics
* Advanced conflict-free synchronization

---

## 15. Important Implementation Note

The current prototype sends a completed drawing operation through the `draw` event.

For the final assignment requirement of **seeing another user's stroke while they are actively drawing**, the protocol should be extended to stream stroke updates:

```text
stroke-start
      ↓
stroke-update
      ↓
stroke-update
      ↓
stroke-update
      ↓
stroke-end
```

This will allow remote clients to render a stroke continuously instead of waiting until mouse release.

This streaming protocol should be implemented before considering the real-time drawing requirement complete.
