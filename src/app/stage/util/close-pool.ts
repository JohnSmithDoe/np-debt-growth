export interface PooledClose<T> {
  readonly x: number;
  readonly y: number;
  readonly value: number;
  /** The type that brought in the most. */
  readonly type: T;
}

interface Cell<T> {
  value: number;
  sumX: number;
  sumY: number;
  count: number;
  readonly openedAt: number;
  readonly worth: Map<T, number>;
}

/** Sums closes per board area over a window, so the board shows a few large numbers instead of many small ones. */
export class ClosePool<T> {
  readonly #cells = new Map<number, Cell<T>>();
  readonly #width: number;
  readonly #height: number;
  readonly #cols: number;
  readonly #rows: number;
  readonly #ms: number;

  constructor(
    area: { width: number; height: number },
    grid: { cols: number; rows: number; ms: number }
  ) {
    this.#width = area.width;
    this.#height = area.height;
    this.#cols = grid.cols;
    this.#rows = grid.rows;
    this.#ms = grid.ms;
  }

  add(x: number, y: number, value: number, type: T, now: number): void {
    const col = clamp(Math.floor((x / this.#width) * this.#cols), this.#cols);
    const row = clamp(Math.floor((y / this.#height) * this.#rows), this.#rows);
    const key = row * this.#cols + col;
    let cell = this.#cells.get(key);
    if (!cell) {
      cell = {
        value: 0,
        sumX: 0,
        sumY: 0,
        count: 0,
        openedAt: now,
        worth: new Map(),
      };
      this.#cells.set(key, cell);
    }
    cell.value += value;
    cell.sumX += x;
    cell.sumY += y;
    cell.count += 1;
    cell.worth.set(type, (cell.worth.get(type) ?? 0) + value);
  }

  due(now: number): PooledClose<T>[] {
    const out: PooledClose<T>[] = [];
    for (const [key, cell] of this.#cells) {
      if (now - cell.openedAt < this.#ms) continue;
      this.#cells.delete(key);
      out.push({
        x: cell.sumX / cell.count,
        y: cell.sumY / cell.count,
        value: cell.value,
        type: leading(cell.worth),
      });
    }
    return out;
  }

  clear(): void {
    this.#cells.clear();
  }
}

const clamp = (index: number, count: number): number =>
  Math.min(count - 1, Math.max(0, index));

function leading<T>(worth: ReadonlyMap<T, number>): T {
  let best: T | undefined;
  let most = -1;
  for (const [type, value] of worth) {
    if (value > most) {
      most = value;
      best = type;
    }
  }
  return best!;
}
