import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  socket,
  connectToServer,
  joinRoom,
  onConnectionChange,
  onHistory,
  onUserJoined,
  onUserLeft,
  onUsers,
  onCursorUpdate,
  onStrokeStart,
  onStrokeUpdate,
  onStrokeEnd,
  onServerError,
  sendStrokeStart,
  sendStrokeUpdate,
  sendStrokeEnd,
  sendCursor,
  sendUndo,
  sendRedo,
  sendClearCanvas,
} from "./connection";

import {
  drawOperation,
} from "./render";

import type {
  DrawingOperation,
  Point,
  User,
} from "../../server/src/protocol";

type Tool = "brush" | "eraser";

const COLORS = [
  "#111827",
  "#7C3AED",
  "#2563EB",
  "#DC2626",
  "#059669",
  "#F59E0B",
  "#EC4899",
];

function App() {
  /* =====================================
     REFS
  ===================================== */

  const canvasRef =
    useRef<HTMLCanvasElement | null>(null);

  const operationsRef =
    useRef<DrawingOperation[]>([]);

  const localOperationRef =
    useRef<DrawingOperation | null>(null);

  const activeRemoteStrokesRef =
    useRef<Map<string, DrawingOperation>>(
      new Map()
    );

  const remoteCursorsRef =
    useRef<
      Map<
        string,
        {
          x: number;
          y: number;
          name: string;
          color: string;
        }
      >
    >(new Map());

  const usersRef =
    useRef<User[]>([]);

  const isDrawingRef =
    useRef(false);

  /* =====================================
     STATE
  ===================================== */

  const [connected, setConnected] =
    useState(false);

  const [joined, setJoined] =
    useState(false);

  const [roomId, setRoomId] =
    useState("demo-room");

  const [name, setName] =
    useState("");

  const [users, setUsers] =
    useState<User[]>([]);

  const [tool, setTool] =
    useState<Tool>("brush");

  const [color, setColor] =
    useState("#7C3AED");

  const [brushSize, setBrushSize] =
    useState(6);

  const [zoom, setZoom] =
    useState(100);

  const [statusMessage, setStatusMessage] =
    useState("Ready to collaborate");

  /* =====================================
     KEEP USERS REF UPDATED
  ===================================== */

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  /* =====================================
     RESIZE CANVAS
  ===================================== */

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const rect =
      canvas.getBoundingClientRect();

    const dpr =
      window.devicePixelRatio || 1;

    canvas.width =
      Math.round(rect.width * dpr);

    canvas.height =
      Math.round(rect.height * dpr);

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );
  }, []);

  /* =====================================
     GET CANVAS POINT
  ===================================== */

  const getPoint = (
    event: React.PointerEvent<HTMLCanvasElement>
  ): Point => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return {
        x: 0,
        y: 0,
      };
    }

    const rect =
      canvas.getBoundingClientRect();

    return {
      x:
        event.clientX -
        rect.left,

      y:
        event.clientY -
        rect.top,
    };
  };

  /* =====================================
     DRAW REMOTE CURSOR
  ===================================== */

  const drawRemoteCursor = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    name: string,
    color: string
  ) => {
    ctx.save();

    /*
      Cursor arrow
    */

    ctx.beginPath();

    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 18);
    ctx.lineTo(x + 5, y + 14);
    ctx.lineTo(x + 11, y + 22);
    ctx.lineTo(x + 14, y + 20);
    ctx.lineTo(x + 8, y + 12);
    ctx.lineTo(x + 15, y + 10);
    ctx.closePath();

    ctx.fillStyle = color;

    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;

    ctx.stroke();

    /*
      Name label
    */

    ctx.font =
      "600 11px Inter, sans-serif";

    const textWidth =
      ctx.measureText(name).width;

    const labelWidth =
      textWidth + 14;

    const labelHeight = 20;

    const labelX = x + 15;
    const labelY = y + 22;

    ctx.fillStyle = color;

    ctx.beginPath();

    ctx.roundRect(
      labelX,
      labelY,
      labelWidth,
      labelHeight,
      5
    );

    ctx.fill();

    ctx.fillStyle = "#ffffff";

    ctx.fillText(
      name,
      labelX + 7,
      labelY + 14
    );

    ctx.restore();
  };

  /* =====================================
     RENDER EVERYTHING
  ===================================== */

  const render = useCallback(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) return;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) return;

    const rect =
      canvas.getBoundingClientRect();

    /*
      Clear canvas
    */

    ctx.clearRect(
      0,
      0,
      rect.width,
      rect.height
    );

    /*
      Completed strokes
    */

    for (
      const operation of
      operationsRef.current
    ) {
      drawOperation(
        ctx,
        operation
      );
    }

    /*
      Current local stroke
    */

    if (
      localOperationRef.current
    ) {
      drawOperation(
        ctx,
        localOperationRef.current
      );
    }

    /*
      Remote active strokes
    */

    for (
      const operation of
      activeRemoteStrokesRef.current.values()
    ) {
      drawOperation(
        ctx,
        operation
      );
    }

    /*
      Remote cursors
    */

    for (
      const cursor of
      remoteCursorsRef.current.values()
    ) {
      drawRemoteCursor(
        ctx,
        cursor.x,
        cursor.y,
        cursor.name,
        cursor.color
      );
    }
  }, []);

  /* =====================================
     CANVAS ANIMATION LOOP
  ===================================== */

  useEffect(() => {
    resizeCanvas();

    let animationFrame = 0;

    const loop = () => {
      render();

      animationFrame =
        requestAnimationFrame(loop);
    };

    loop();

    const handleResize = () => {
      resizeCanvas();
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [
    render,
    resizeCanvas,
  ]);

  /* =====================================
     SOCKET LISTENERS
  ===================================== */

  useEffect(() => {
    /*
      Connection
    */

    onConnectionChange(
      (isConnected) => {
        setConnected(isConnected);

        if (isConnected) {
          setStatusMessage(
            "Connected to server"
          );
        } else {
          setStatusMessage(
            "Disconnected from server"
          );
        }
      }
    );

    /*
      History
    */

    onHistory(
      (operations) => {
        operationsRef.current =
          operations;

        render();
      }
    );

    /*
      User joined
    */

    onUserJoined(
      (user) => {
        setStatusMessage(
          `${user.name} joined the room`
        );
      }
    );

    /*
      User left
    */

    onUserLeft(
      (userId) => {
        remoteCursorsRef.current.delete(
          userId
        );

        setStatusMessage(
          "A collaborator left"
        );
      }
    );

    /*
      Users
    */

    onUsers(
      (userList) => {
        usersRef.current =
          userList;

        setUsers(userList);
      }
    );

    /*
      Remote cursor
    */

    onCursorUpdate(
      (
        userId,
        x,
        y
      ) => {
        const user =
          usersRef.current.find(
            (item) =>
              item.id === userId
          );

        remoteCursorsRef.current.set(
          userId,
          {
            x,
            y,
            name:
              user?.name ||
              "User",

            color:
              user?.color ||
              "#7C3AED",
          }
        );
      }
    );

    /*
      Remote stroke start
    */

    onStrokeStart(
      (operation) => {
        /*
          Don't add our own stroke
          as a remote stroke.
        */

        if (
          operation.userId ===
          socket.id
        ) {
          return;
        }

        activeRemoteStrokesRef.current.set(
          operation.id,
          {
            ...operation,
            points: [
              ...operation.points,
            ],
          }
        );
      }
    );

    /*
      Remote stroke update
    */

    onStrokeUpdate(
      (
        operationId,
        points
      ) => {
        const operation =
          activeRemoteStrokesRef.current.get(
            operationId
          );

        if (!operation) return;

        operation.points = points;
      }
    );

    /*
      Remote stroke end
    */

    onStrokeEnd(
      (operationId) => {
        const operation =
          activeRemoteStrokesRef.current.get(
            operationId
          );

        if (!operation) return;

        operationsRef.current.push(
          operation
        );

        activeRemoteStrokesRef.current.delete(
          operationId
        );
      }
    );

    /*
      Server error

      IMPORTANT:
      Your connection.ts uses
      onServerError(), NOT onError().
    */

    onServerError(
      (message) => {
        setStatusMessage(
          message
        );
      }
    );

    /*
      Cleanup

      Your connection.ts listener
      functions return void, so we
      cannot do cleanupCursor().

      Instead remove Socket.IO
      listeners directly.
    */

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");

      socket.off("history");

      socket.off("user-joined");
      socket.off("user-left");
      socket.off("users");

      socket.off("cursor-update");

      socket.off("stroke-start");
      socket.off("stroke-update");
      socket.off("stroke-end");

      socket.off("error-message");
    };
  }, [render]);

  /* =====================================
     JOIN ROOM
  ===================================== */

  const handleJoin = () => {
    if (!name.trim()) {
      setStatusMessage(
        "Please enter your name"
      );

      return;
    }

    if (!roomId.trim()) {
      setStatusMessage(
        "Please enter a room ID"
      );

      return;
    }

    connectToServer();

    /*
      Wait briefly for Socket.IO
      connection before joining.
    */

    const join = () => {
      joinRoom(
        roomId.trim(),
        name.trim()
      );

      setJoined(true);

      setStatusMessage(
        "Joined collaboration room"
      );
    };

    if (socket.connected) {
      join();
    } else {
      socket.once(
        "connect",
        join
      );
    }
  };

  /* =====================================
     POINTER DOWN
  ===================================== */

  const handlePointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (!joined) return;

    const point =
      getPoint(event);

    const operation:
      DrawingOperation = {
      id:
        crypto.randomUUID(),

      userId:
        socket.id || "",

      type:
        tool === "eraser"
          ? "erase"
          : "stroke",

      color,

      width:
        brushSize,

      points: [
        point,
      ],
    };

    isDrawingRef.current =
      true;

    localOperationRef.current =
      operation;

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    sendStrokeStart(
      operation
    );

    render();
  };

  /* =====================================
     POINTER MOVE
  ===================================== */

  const handlePointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (!joined) return;

    const point =
      getPoint(event);

    /*
      Send cursor even when
      not drawing.
    */

    sendCursor(
      point.x,
      point.y
    );

    /*
      If not drawing,
      stop here.
    */

    if (!isDrawingRef.current) {
      return;
    }

    const operation =
      localOperationRef.current;

    if (!operation) return;

    /*
      Prevent duplicate points
    */

    const lastPoint =
      operation.points[
        operation.points.length - 1
      ];

    if (
      lastPoint &&
      lastPoint.x === point.x &&
      lastPoint.y === point.y
    ) {
      return;
    }

    operation.points.push(
      point
    );

    sendStrokeUpdate(
      operation.id,
      operation.points
    );

    render();
  };

  /* =====================================
     FINISH STROKE
  ===================================== */

  const finishStroke = (
    event?: React.PointerEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current =
      false;

    if (
      event &&
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }

    const operation =
      localOperationRef.current;

    if (!operation) {
      return;
    }

    /*
      Save local operation
    */

    operationsRef.current.push(
      operation
    );

    /*
      Tell server stroke ended
    */

    sendStrokeEnd(
      operation.id
    );

    /*
      Remove temporary local stroke
    */

    localOperationRef.current =
      null;

    render();
  };

  /* =====================================
     UNDO
  ===================================== */

  const handleUndo = () => {
    if (
      operationsRef.current.length ===
      0
    ) {
      return;
    }

    sendUndo();

    /*
      Optimistic local update
    */

    operationsRef.current.pop();

    render();

    setStatusMessage(
      "Undo"
    );
  };

  /* =====================================
     REDO
  ===================================== */

  const handleRedo = () => {
    sendRedo();

    setStatusMessage(
      "Redo"
    );
  };

  /* =====================================
     CLEAR
  ===================================== */

  const handleClear = () => {
    operationsRef.current = [];

    activeRemoteStrokesRef.current.clear();

    localOperationRef.current = null;

    sendClearCanvas();

    render();

    setStatusMessage(
      "Canvas cleared"
    );
  };

  /* =====================================
     JOIN SCREEN
  ===================================== */

  if (!joined) {
    return (
      <div className="landing-page">

        <div className="landing-decoration decoration-one" />

        <div className="landing-decoration decoration-two" />

        <div className="landing-card">

          <div className="brand">

            <div className="brand-logo">
              ✦
            </div>

            <div>
              <h1>
                CanvasFlow
              </h1>

              <span>
                Collaborative creative workspace
              </span>
            </div>

          </div>

          <div className="landing-content">

            {/* QR PREVIEW */}

            <div className="qr-preview-card">

              <div className="qr-preview-top">

                <span>
                  LIVE CAMPAIGN
                </span>

                <div className="live-dot" />

              </div>

              <div className="qr-placeholder">

                <div className="qr-pattern">
                  ▦
                </div>

              </div>

              <h2>
                Scan & Collaborate
              </h2>

              <p>
                Create together in real time
                from anywhere.
              </p>

              <button className="preview-button">
                Open Experience
              </button>

            </div>

            {/* JOIN FORM */}

            <div className="join-content">

              <span className="eyebrow">
                REAL-TIME WORKSPACE
              </span>

              <h2>
                Turn ideas into
                <span>
                  {" "}something real.
                </span>
              </h2>

              <p>
                Join the collaborative canvas
                and create, sketch and
                brainstorm together.
              </p>

              <div className="form-group">

                <label>
                  Your name
                </label>

                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Enter your name"
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleJoin();
                    }
                  }}
                />

              </div>

              <div className="form-group">

                <label>
                  Room ID
                </label>

                <input
                  value={roomId}
                  onChange={(event) =>
                    setRoomId(
                      event.target.value
                    )
                  }
                  placeholder="Enter room ID"
                />

              </div>

              <button
                className="join-button"
                onClick={handleJoin}
              >
                Enter Workspace

                <span>
                  →
                </span>
              </button>

              <div className="connection-info">

                <span
                  className={
                    connected
                      ? "status-dot online"
                      : "status-dot"
                  }
                />

                {connected
                  ? "Server connected"
                  : "Ready to connect"}

              </div>

            </div>

          </div>

        </div>

      </div>
    );
  }

  /* =====================================
     MAIN WORKSPACE
  ===================================== */

  return (
    <div className="app">

      {/* TOP BAR */}

      <header className="topbar">

        <div className="topbar-left">

          <div className="mini-logo">
            ✦
          </div>

          <div className="project-title">

            <strong>
              CanvasFlow
            </strong>

            <span>
              / {roomId}
            </span>

          </div>

        </div>

        <div className="topbar-center">

          <div className="live-status">

            <span className="status-dot online" />

            Live collaboration

          </div>

        </div>

        <div className="topbar-right">

          <div className="avatars">

            {users
              .slice(0, 4)
              .map((user) => (
                <div
                  key={user.id}
                  className="avatar"
                  style={{
                    background:
                      user.color ||
                      "#7C3AED",
                  }}
                  title={user.name}
                >
                  {user.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>
              ))}

          </div>

          <button className="share-button">
            Share
          </button>

        </div>

      </header>

      {/* WORKSPACE */}

      <main className="workspace">

        {/* LEFT TOOLBAR */}

        <aside className="toolbar">

          <div className="toolbar-section">

            <button
              className={
                tool === "brush"
                  ? "tool-button active"
                  : "tool-button"
              }
              onClick={() =>
                setTool("brush")
              }
              title="Brush"
            >
              ✎
            </button>

            <button
              className={
                tool === "eraser"
                  ? "tool-button active"
                  : "tool-button"
              }
              onClick={() =>
                setTool("eraser")
              }
              title="Eraser"
            >
              ◩
            </button>

          </div>

          <div className="toolbar-divider" />

          <div className="color-list">

            {COLORS.map(
              (itemColor) => (
                <button
                  key={itemColor}
                  className={
                    color ===
                    itemColor
                      ? "color-button selected"
                      : "color-button"
                  }
                  style={{
                    background:
                      itemColor,
                  }}
                  onClick={() => {
                    setColor(
                      itemColor
                    );

                    setTool(
                      "brush"
                    );
                  }}
                />
              )
            )}

          </div>

        </aside>

        {/* CANVAS */}

        <section className="canvas-section">

          <div className="canvas-label">

            <span>
              CREATIVE BOARD
            </span>

            <span>
              {statusMessage}
            </span>

          </div>

          <div className="canvas-wrapper">

            <canvas
              ref={canvasRef}
              className="drawing-canvas"
              style={{
                transform:
                  `scale(${zoom / 100})`,
              }}
              onPointerDown={
                handlePointerDown
              }
              onPointerMove={
                handlePointerMove
              }
              onPointerUp={
                finishStroke
              }
              onPointerCancel={
                finishStroke
              }
              onPointerLeave={
                finishStroke
              }
            />

            {operationsRef.current
              .length === 0 &&
              !localOperationRef.current && (
                <div className="canvas-empty-state">

                  <span>
                    ✦
                  </span>

                  <p>
                    Start creating
                  </p>

                </div>
              )}

          </div>

          {/* BOTTOM CONTROLS */}

          <div className="bottom-controls">

            <div className="control-group">

              <button
                className="icon-control"
                onClick={
                  handleUndo
                }
                title="Undo"
              >
                ↶
              </button>

              <button
                className="icon-control"
                onClick={
                  handleRedo
                }
                title="Redo"
              >
                ↷
              </button>

              <button
                className="icon-control danger"
                onClick={
                  handleClear
                }
                title="Clear canvas"
              >
                ♲
              </button>

            </div>

            <div className="brush-control">

              <span>
                Size
              </span>

              <input
                type="range"
                min="1"
                max="40"
                value={brushSize}
                onChange={(event) =>
                  setBrushSize(
                    Number(
                      event.target.value
                    )
                  )
                }
              />

              <div
                className="brush-preview"
                style={{
                  width:
                    Math.min(
                      brushSize,
                      30
                    ),

                  height:
                    Math.min(
                      brushSize,
                      30
                    ),

                  background:
                    tool === "eraser"
                      ? "#d1d5db"
                      : color,
                }}
              />

            </div>

            <div className="zoom-control">

              <button
                onClick={() =>
                  setZoom(
                    Math.max(
                      50,
                      zoom - 10
                    )
                  )
                }
              >
                −
              </button>

              <span>
                {zoom}%
              </span>

              <button
                onClick={() =>
                  setZoom(
                    Math.min(
                      200,
                      zoom + 10
                    )
                  )
                }
              >
                +
              </button>

            </div>

          </div>

        </section>

        {/* QR PANEL */}

        <aside className="qr-panel">

          <div className="panel-header">

            <div>

              <span className="panel-eyebrow">
                CAMPAIGN
              </span>

              <h3>
                QR Landing Panel
              </h3>

            </div>

            <button className="more-button">
              •••
            </button>

          </div>

          {/* QR CARD */}

          <div className="qr-card">

            <div className="qr-card-header">

              <span className="campaign-live">
                ● LIVE
              </span>

              <span>
                120 × 120
              </span>

            </div>

            <div className="qr-code">

              <div className="qr-corner top-left" />

              <div className="qr-corner top-right" />

              <div className="qr-corner bottom-left" />

              <div className="qr-noise">
                ▦
              </div>

            </div>

            <p className="scan-text">
              Scan to open
            </p>

          </div>

          {/* DETAILS */}

          <div className="campaign-details">

            <div className="detail-item">

              <span>
                Campaign
              </span>

              <strong>
                Creative Launch
              </strong>

            </div>

            <div className="detail-item">

              <span>
                Destination
              </span>

              <strong>
                canvasflow.app
              </strong>

            </div>

          </div>

          {/* CTA */}

          <div className="cta-preview">

            <span>
              CTA PREVIEW
            </span>

            <div className="cta-box">

              <strong>
                Create without limits.
              </strong>

              <p>
                Scan the QR code to continue.
              </p>

              <button>
                Get Started →
              </button>

            </div>

          </div>

          {/* COLLABORATORS */}

          <div className="collaborators">

            <div className="collaborator-header">

              <span>
                Collaborators
              </span>

              <strong>
                {users.length}
              </strong>

            </div>

            <div className="user-list">

              {users.map(
                (user) => (
                  <div
                    className="user-row"
                    key={user.id}
                  >

                    <div
                      className="user-avatar"
                      style={{
                        background:
                          user.color ||
                          "#7C3AED",
                      }}
                    >
                      {user.name
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    <span>
                      {user.name}
                    </span>

                    {user.id ===
                      socket.id && (
                      <small>
                        You
                      </small>
                    )}

                  </div>
                )
              )}

            </div>

          </div>

        </aside>

      </main>

    </div>
  );
}

export default App;