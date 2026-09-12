export type UserId = string;
export type OperationId = string;

export interface Point {
  x: number;
  y: number;
}

export interface DrawingOperation {
  id: OperationId;
  userId: UserId;
  type: "stroke" | "erase";
  color: string;
  width: number;
  points: Point[];
}

/*
 * Sent when the user starts a new stroke.
 */
export interface StrokeStartMessage {
  type: "stroke-start";
  operation: DrawingOperation;
}

/*
 * Sent continuously while the user is drawing.
 *
 * Only the newly created points are transmitted.
 */
export interface StrokeUpdateMessage {
  type: "stroke-update";
  operationId: OperationId;
  points: Point[];
}

/*
 * Sent when the user releases the mouse/pointer.
 */
export interface StrokeEndMessage {
  type: "stroke-end";
  operationId: OperationId;
}

export interface User {
  id: UserId;
  name: string;
  color: string;
}

export interface CursorMessage {
  type: "cursor";
  userId: UserId;
  x: number;
  y: number;
}

export interface UndoMessage {
  type: "undo";
  userId: UserId;
}

export interface RedoMessage {
  type: "redo";
  userId: UserId;
}

export interface UserJoinedMessage {
  type: "user-joined";
  user: User;
}

export interface UserLeftMessage {
  type: "user-left";
  userId: UserId;
}

export interface DrawingMessage {
  type: "drawing";
  operation: DrawingOperation;
}

export interface HistoryMessage {
  type: "history";
  operations: DrawingOperation[];
}

export interface CursorUpdateMessage {
  type: "cursor-update";
  userId: UserId;
  x: number;
  y: number;
}

export interface UsersMessage {
  type: "users";
  users: User[];
}

export interface ErrorMessage {
  message: string;
}

/*
 * Messages sent from client to server.
 */
export type ClientMessage =
  | StrokeStartMessage
  | StrokeUpdateMessage
  | StrokeEndMessage
  | CursorMessage
  | UndoMessage
  | RedoMessage;

/*
 * Messages sent from server to client.
 */
export type ServerMessage =
  | UserJoinedMessage
  | UserLeftMessage
  | DrawingMessage
  | HistoryMessage
  | CursorUpdateMessage
  | UsersMessage
  | ErrorMessage;