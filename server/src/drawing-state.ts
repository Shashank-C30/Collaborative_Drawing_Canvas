import {
  DrawingOperation,
  OperationId,
  Point,
  UserId,
} from "./protocol";

export class DrawingState {
  /*
   * Completed operations that form the permanent
   * drawing history of the room.
   */
  private operations: DrawingOperation[] = [];

  /*
   * Strokes that users are currently drawing.
   *
   * They are kept separately until stroke-end.
   */
  private activeStrokes: Map<
    OperationId,
    DrawingOperation
  > = new Map();

  /*
   * Operations removed by undo.
   */
  private redoStack: DrawingOperation[] = [];

  /*
   * Start a new live stroke.
   */
  startStroke(
    operation: DrawingOperation
  ): void {
    this.activeStrokes.set(
      operation.id,
      {
        ...operation,
        points: [...operation.points],
      }
    );
  }

  /*
   * Add newly received points to an active stroke.
   */
  updateStroke(
    operationId: OperationId,
    points: Point[]
  ): DrawingOperation | null {
    const operation =
      this.activeStrokes.get(operationId);

    if (!operation) {
      return null;
    }

    operation.points.push(...points);

    return operation;
  }

  /*
   * Finish a live stroke and move it
   * into permanent drawing history.
   */
  endStroke(
    operationId: OperationId
  ): DrawingOperation | null {
    const operation =
      this.activeStrokes.get(operationId);

    if (!operation) {
      return null;
    }

    this.activeStrokes.delete(operationId);

    this.operations.push(operation);

    /*
     * A new completed operation invalidates
     * the redo history.
     */
    this.redoStack = [];

    return operation;
  }

  /*
   * Get all completed drawing operations.
   */
  getOperations(): DrawingOperation[] {
    return [...this.operations];
  }

  /*
   * Get an active stroke.
   */
  getActiveStroke(
    operationId: OperationId
  ): DrawingOperation | null {
    return (
      this.activeStrokes.get(operationId) ??
      null
    );
  }

  /*
   * Undo the latest operation belonging
   * to the requested user.
   */
  undo(
    userId: UserId
  ): DrawingOperation | null {
    if (this.operations.length === 0) {
      return null;
    }

    const operation =
      this.operations[
        this.operations.length - 1
      ];

    if (operation.userId !== userId) {
      return null;
    }

    this.operations.pop();

    this.redoStack.push(operation);

    return operation;
  }

  /*
   * Redo the latest undone operation.
   */
  redo(
    userId: UserId
  ): DrawingOperation | null {
    if (this.redoStack.length === 0) {
      return null;
    }

    const operation =
      this.redoStack[
        this.redoStack.length - 1
      ];

    if (operation.userId !== userId) {
      return null;
    }

    this.redoStack.pop();

    this.operations.push(operation);

    return operation;
  }

  /*
   * Remove a specific completed operation.
   */
  removeOperation(
    operationId: OperationId
  ): DrawingOperation | null {
    const index =
      this.operations.findIndex(
        (operation) =>
          operation.id === operationId
      );

    if (index === -1) {
      return null;
    }

    const [removed] =
      this.operations.splice(index, 1);

    return removed;
  }

  /*
   * Remove an active stroke.
   */
  cancelStroke(
    operationId: OperationId
  ): boolean {
    return this.activeStrokes.delete(
      operationId
    );
  }

  /*
   * Clear the entire room state.
   */
  clear(): void {
    this.operations = [];
    this.activeStrokes.clear();
    this.redoStack = [];
  }

  /*
   * Number of completed operations.
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /*
   * Number of currently active strokes.
   */
  getActiveStrokeCount(): number {
    return this.activeStrokes.size;
  }
}

