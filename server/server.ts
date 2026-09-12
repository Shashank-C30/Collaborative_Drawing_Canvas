import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { Server, Socket } from "socket.io";

import { Room } from "./src/room";
import { DrawingState } from "./src/drawing-state";

import type {
  DrawingOperation,
  User,
} from "./src/protocol";

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",")
  : true;

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/api/socket",
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

const PORT = Number(process.env.PORT) || 3000;
const clientDist = path.resolve(process.cwd(), "../client/dist");

const rooms = new Map<string, Room>();
const drawingStates = new Map<string, DrawingState>();

const userColors = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#9b59b6",
  "#f39c12",
  "#1abc9c",
  "#e91e63",
  "#795548",
];

function getRoom(roomId: string): Room {
  let room = rooms.get(roomId);

  if (!room) {
    room = new Room(roomId);
    rooms.set(roomId, room);
  }

  return room;
}

function getDrawingState(roomId: string): DrawingState {
  let state = drawingStates.get(roomId);

  if (!state) {
    state = new DrawingState();
    drawingStates.set(roomId, state);
  }

  return state;
}

function getUserRoom(socket: Socket): Room | undefined {
  for (const room of rooms.values()) {
    if (room.hasUser(socket.id)) {
      return room;
    }
  }

  return undefined;
}

function getUserColor(room: Room): string {
  const usedColors = new Set(
    room.getUsers().map((user) => user.color)
  );

  for (const color of userColors) {
    if (!usedColors.has(color)) {
      return color;
    }
  }

  return userColors[
    room.getUserCount() % userColors.length
  ];
}

/*
 * Health check
 */
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Collaborative drawing server is running",
  });
});

app.use(express.static(clientDist));
app.use((_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

/*
 * Socket connection
 */
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  /*
   * Join room
   */
  socket.on(
    "join-room",
    ({
      roomId,
      name,
    }: {
      roomId: string;
      name: string;
    }) => {
      const trimmedRoomId = roomId.trim();
      const trimmedName = name.trim();

      if (!trimmedRoomId || !trimmedName) {
        socket.emit("error-message", {
          message: "Room ID and name are required.",
        });

        return;
      }

      const room = getRoom(trimmedRoomId);
      const drawingState =
        getDrawingState(trimmedRoomId);

      const user: User = {
        id: socket.id,
        name: trimmedName,
        color: getUserColor(room),
      };

      socket.join(trimmedRoomId);

      room.addUser(user);

      console.log(
        `${user.name} joined room ${trimmedRoomId}`
      );

      /*
       * Send existing drawing history to the new user.
       */
      socket.emit("history", {
        operations: drawingState.getOperations(),
      });

      /*
       * Send current users to the new user.
       */
      socket.emit("users", {
        users: room.getUsers(),
      });

      /*
       * Tell everyone else that a new user joined.
       */
      socket.to(trimmedRoomId).emit(
        "user-joined",
        {
          user,
        }
      );

      /*
       * Update user list for everyone.
       */
      io.to(trimmedRoomId).emit("users", {
        users: room.getUsers(),
      });
    }
  );

  /*
   * Stroke start
   */
  socket.on(
    "stroke-start",
    (operation: DrawingOperation) => {
      const room = getUserRoom(socket);

      if (!room) {
        return;
      }

      const currentUser = room.getUser(socket.id);

      if (!currentUser) {
        return;
      }

      /*
       * Security check:
       * The client cannot draw as another user.
       */
      if (operation.userId !== currentUser.id) {
        return;
      }

      if (
        !operation.id ||
        !operation.points ||
        operation.points.length === 0
      ) {
        return;
      }

      if (
        operation.type !== "stroke" &&
        operation.type !== "erase"
      ) {
        return;
      }

      if (
        typeof operation.width !== "number" ||
        operation.width <= 0
      ) {
        return;
      }

      const roomId = room.id;
      const drawingState =
        getDrawingState(roomId);

      /*
       * Use the server-assigned user color.
       */
      const serverOperation: DrawingOperation = {
        ...operation,
        userId: currentUser.id,
        color:
          operation.type === "erase"
            ? operation.color
            : currentUser.color,
        points: [...operation.points],
      };

      drawingState.startStroke(
        serverOperation
      );

      /*
       * Send the stroke immediately to other clients.
       * This is real-time streaming.
       */
      socket.to(roomId).emit(
        "stroke-start",
        {
          operation: serverOperation,
        }
      );
    }
  );

  /*
   * Stroke update
   *
   * Only newly-created points are transmitted.
   */
  socket.on(
    "stroke-update",
    ({
      operationId,
      points,
    }: {
      operationId: string;
      points: { x: number; y: number }[];
    }) => {
      const room = getUserRoom(socket);

      if (!room) {
        return;
      }

      const currentUser =
        room.getUser(socket.id);

      if (!currentUser) {
        return;
      }

      const drawingState =
        getDrawingState(room.id);

      const activeStroke =
        drawingState.getActiveStroke(
          operationId
        );

      if (!activeStroke) {
        return;
      }

      /*
       * Only the owner of the stroke
       * can update it.
       */
      if (
        activeStroke.userId !==
        currentUser.id
      ) {
        return;
      }

      if (!points || points.length === 0) {
        return;
      }

      const updatedOperation =
        drawingState.updateStroke(
          operationId,
          points
        );

      if (!updatedOperation) {
        return;
      }

      /*
       * Broadcast only the new points.
       */
      socket.to(room.id).emit(
        "stroke-update",
        {
          operationId,
          points,
        }
      );
    }
  );

  /*
   * Stroke end
   */
  socket.on(
    "stroke-end",
    ({
      operationId,
    }: {
      operationId: string;
    }) => {
      const room = getUserRoom(socket);

      if (!room) {
        return;
      }

      const currentUser =
        room.getUser(socket.id);

      if (!currentUser) {
        return;
      }

      const drawingState =
        getDrawingState(room.id);

      const activeStroke =
        drawingState.getActiveStroke(
          operationId
        );

      if (!activeStroke) {
        return;
      }

      /*
       * Only the owner can finish the stroke.
       */
      if (
        activeStroke.userId !==
        currentUser.id
      ) {
        return;
      }

      const completedOperation =
        drawingState.endStroke(
          operationId
        );

      if (!completedOperation) {
        return;
      }

      socket.to(room.id).emit(
        "stroke-end",
        {
          operationId,
        }
      );
    }
  );

  /*
   * Cursor movement
   */
  socket.on(
    "cursor",
    ({
      x,
      y,
    }: {
      x: number;
      y: number;
    }) => {
      const room = getUserRoom(socket);

      if (!room) {
        return;
      }

      const currentUser =
        room.getUser(socket.id);

      if (!currentUser) {
        return;
      }

      socket.to(room.id).emit(
        "cursor-update",
        {
          userId: currentUser.id,
          x,
          y,
        }
      );
    }
  );

  /*
   * Undo
   */
  socket.on("undo", () => {
    const room = getUserRoom(socket);

    if (!room) {
      return;
    }

    const currentUser =
      room.getUser(socket.id);

    if (!currentUser) {
      return;
    }

    const drawingState =
      getDrawingState(room.id);

    const removedOperation =
      drawingState.undo(
        currentUser.id
      );

    if (!removedOperation) {
      return;
    }

    /*
     * Send the complete history to everyone.
     * This keeps all clients synchronized.
     */
    io.to(room.id).emit("history", {
      operations:
        drawingState.getOperations(),
    });
  });

  /*
   * Redo
   */
  socket.on("redo", () => {
    const room = getUserRoom(socket);

    if (!room) {
      return;
    }

    const currentUser =
      room.getUser(socket.id);

    if (!currentUser) {
      return;
    }

    const drawingState =
      getDrawingState(room.id);

    const restoredOperation =
      drawingState.redo(
        currentUser.id
      );

    if (!restoredOperation) {
      return;
    }

    io.to(room.id).emit("history", {
      operations:
        drawingState.getOperations(),
    });
  });

  /*
   * Clear canvas
   */
  socket.on("clear-canvas", () => {
    const room = getUserRoom(socket);

    if (!room) {
      return;
    }

    const drawingState =
      getDrawingState(room.id);

    drawingState.clear();

    io.to(room.id).emit("history", {
      operations: [],
    });
  });

  /*
   * Disconnect
   */
  socket.on("disconnect", () => {
    console.log(
      `Client disconnected: ${socket.id}`
    );

    const room = getUserRoom(socket);

    if (!room) {
      return;
    }

    const user = room.getUser(socket.id);

    if (!user) {
      return;
    }

    const roomId = room.id;

    room.removeUser(socket.id);

    socket.to(roomId).emit(
      "user-left",
      {
        userId: socket.id,
      }
    );

    io.to(roomId).emit("users", {
      users: room.getUsers(),
    });

    /*
     * Delete empty rooms.
     */
    if (room.isEmpty()) {
      rooms.delete(roomId);
      drawingStates.delete(roomId);

      console.log(
        `Room ${roomId} removed because it is empty`
      );
    }
  });
});

/*
 * Start server
 */
if (!process.env.VERCEL) {
  httpServer.listen(PORT, () => {
    console.log(
      `Server running at http://localhost:${PORT}`
    );
  });
}

export default httpServer;
