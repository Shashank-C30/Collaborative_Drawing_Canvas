
import type {
  DrawingOperation,
  Point,
} from "../../server/src/protocol";

/* =========================
   DRAW OPERATION
========================= */

export function drawOperation(
  ctx: CanvasRenderingContext2D,
  operation: DrawingOperation
): void {
  const {
    points,
    color,
    width,
    type,
  } = operation;

  if (
    !points ||
    points.length === 0
  ) {
    return;
  }

  ctx.save();

  if (type === "erase") {
    ctx.globalCompositeOperation =
      "destination-out";
  } else {
    ctx.globalCompositeOperation =
      "source-over";
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  ctx.lineWidth = width;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  /* Single point */

  if (points.length === 1) {
    ctx.beginPath();

    ctx.arc(
      points[0].x,
      points[0].y,
      width / 2,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    return;
  }

  /* Multiple points */

  ctx.beginPath();

  ctx.moveTo(
    points[0].x,
    points[0].y
  );

  for (
    let i = 1;
    i < points.length;
    i++
  ) {
    ctx.lineTo(
      points[i].x,
      points[i].y
    );
  }

  ctx.stroke();

  ctx.restore();
}

/* =========================
   DRAW SEGMENT
========================= */

export function drawSegment(
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  width: number,
  type: "stroke" | "erase"
): void {
  ctx.save();

  if (type === "erase") {
    ctx.globalCompositeOperation =
      "destination-out";
  } else {
    ctx.globalCompositeOperation =
      "source-over";
  }

  ctx.strokeStyle = color;

  ctx.lineWidth = width;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();

  ctx.moveTo(
    from.x,
    from.y
  );

  ctx.lineTo(
    to.x,
    to.y
  );

  ctx.stroke();

  ctx.restore();
}

/* =========================
   RENDER CANVAS
========================= */

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  operations: DrawingOperation[],
  width: number,
  height: number
): void {
  ctx.save();

  ctx.globalCompositeOperation =
    "source-over";

  ctx.clearRect(
    0,
    0,
    width,
    height
  );

  for (
    const operation of operations
  ) {
    drawOperation(
      ctx,
      operation
    );
  }

  ctx.restore();
}

