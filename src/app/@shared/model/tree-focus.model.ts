export interface TreeFocus {
  readonly id: string;
  /** Counts requests, so asking for the same node again pans again. */
  readonly seq: number;
}
