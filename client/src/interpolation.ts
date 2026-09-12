
export interface Position {
  x: number;
  y: number;
}

/* =========================
   INTERPOLATION
========================= */

export function interpolate(
  current: Position,
  target: Position,
  factor: number = 0.25
): Position {
  return {
    x:
      current.x +
      (target.x - current.x) *
        factor,

    y:
      current.y +
      (target.y - current.y) *
        factor,
  };
}

/* =========================
   REMOTE POSITIONS
========================= */

const remotePositions =
  new Map<
    string,
    {
      current: Position;
      target: Position;
    }
  >();

/* =========================
   UPDATE POSITION
========================= */

export function updateRemotePosition(
  userId: string,
  x: number,
  y: number
): void {
  const existing =
    remotePositions.get(
      userId
    );

  if (existing) {
    existing.target = {
      x,
      y,
    };

    return;
  }

  remotePositions.set(
    userId,
    {
      current: {
        x,
        y,
      },

      target: {
        x,
        y,
      },
    }
  );
}

/* =========================
   GET POSITION
========================= */

export function getInterpolatedPosition(
  userId: string
): Position | null {
  const user =
    remotePositions.get(
      userId
    );

  if (!user) {
    return null;
  }

  user.current =
    interpolate(
      user.current,
      user.target
    );

  return user.current;
}

/* =========================
   REMOVE USER
========================= */

export function removeRemotePosition(
  userId: string
): void {
  remotePositions.delete(
    userId
  );
}

/* =========================
   CLEAR
========================= */

export function clearRemotePositions(): void {
  remotePositions.clear();
}

