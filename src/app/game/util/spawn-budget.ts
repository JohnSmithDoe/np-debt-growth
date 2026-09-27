export class SpawnBudget {
  readonly #credit = new Map<string, number>();

  due(
    key: string,
    ratePerSec: number,
    seconds: number,
    cap: number,
    rand: () => number
  ): number {
    const credit = (this.#credit.get(key) ?? rand()) + ratePerSec * seconds;
    const whole = Math.min(Math.floor(credit), cap);
    this.#credit.set(key, Math.min(credit - whole, cap));
    return Math.max(0, whole);
  }
}
