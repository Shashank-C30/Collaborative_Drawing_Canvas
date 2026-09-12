
import {
  io,
  Socket,
} from "socket.io-client";

import type {
  DrawingOperation,
  Point,
  User,
} from "../../server/src/protocol";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (import.meta.env.DEV
    ? "http://localhost:3000"
    : window.location.origin);

export const socket: Socket =
  io(SERVER_URL, {
    autoConnect: false,
    path: "/api/socket",
  });

/* =========================
   CONNECTION
========================= */

export function connectToServer(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectFromServer(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}

/* =========================
   ROOM
========================= */

export function joinRoom(
  roomId: string,
  name: string
): void {
  socket.emit(
    "join-room",
    {
      roomId,
      name,
    }
  );
}

/* =========================
   DRAWING
========================= */

export function sendStrokeStart(
  operation: DrawingOperation
): void {
  socket.emit(
    "stroke-start",
    operation
  );
}

export function sendStrokeUpdate(
  operationId: string,
  points: Point[]
): void {
  socket.emit(
    "stroke-update",
    {
      operationId,
      points,
    }
  );
}

export function sendStrokeEnd(
  operationId: string
): void {
  socket.emit(
    "stroke-end",
    {
      operationId,
    }
  );
}

/* =========================
   CURSOR
========================= */

export function sendCursor(
  x: number,
  y: number
): void {
  socket.emit(
    "cursor",
    {
      x,
      y,
    }
  );
}

/* =========================
   UNDO / REDO
========================= */

export function sendUndo(): void {
  socket.emit("undo");
}

export function sendRedo(): void {
  socket.emit("redo");
}

export function sendClearCanvas(): void {
  socket.emit(
    "clear-canvas"
  );
}

/* =========================
   USERS
========================= */

export function onUserJoined(
  callback: (user: User) => void
): void {
  socket.on(
    "user-joined",
    callback
  );
}

export function onUserLeft(
  callback: (userId: string) => void
): void {
  socket.on(
    "user-left",
    callback
  );
}

export function onUsers(
  callback: (users: User[]) => void
): void {
  socket.on(
    "users",
    (data: {
      users: User[];
    }) => {
      callback(data.users);
    }
  );
}

/* =========================
   HISTORY
========================= */

export function onHistory(
  callback: (
    operations: DrawingOperation[]
  ) => void
): void {
  socket.on(
    "history",
    (data: {
      operations: DrawingOperation[];
    }) => {
      callback(
        data.operations
      );
    }
  );
}

/* =========================
   STROKES
========================= */

export function onStrokeStart(
  callback: (
    operation: DrawingOperation
  ) => void
): void {
  socket.on(
    "stroke-start",
    (data: {
      operation: DrawingOperation;
    }) => {
      callback(
        data.operation
      );
    }
  );
}

export function onStrokeUpdate(
  callback: (
    operationId: string,
    points: Point[]
  ) => void
): void {
  socket.on(
    "stroke-update",
    (data: {
      operationId: string;
      points: Point[];
    }) => {
      callback(
        data.operationId,
        data.points
      );
    }
  );
}

export function onStrokeEnd(
  callback: (
    operationId: string
  ) => void
): void {
  socket.on(
    "stroke-end",
    (data: {
      operationId: string;
    }) => {
      callback(
        data.operationId
      );
    }
  );
}

/* =========================
   CURSOR EVENTS
========================= */

export function onCursorUpdate(
  callback: (
    userId: string,
    x: number,
    y: number
  ) => void
): void {
  socket.on(
    "cursor-update",
    (data: {
      userId: string;
      x: number;
      y: number;
    }) => {
      callback(
        data.userId,
        data.x,
        data.y
      );
    }
  );
}

/* =========================
   SERVER ERRORS
========================= */

export function onServerError(
  callback: (
    message: string
  ) => void
): void {
  socket.on(
    "error-message",
    (data: {
      message: string;
    }) => {
      callback(
        data.message
      );
    }
  );
}

/* =========================
   CONNECTION STATUS
========================= */

export function onConnectionChange(
  callback: (
    connected: boolean
  ) => void
): void {
  socket.on(
    "connect",
    () => {
      callback(true);
    }
  );

  socket.on(
    "disconnect",
    () => {
      callback(false);
    }
  );

  socket.on(
    "connect_error",
    () => {
      callback(false);
    }
  );
}

