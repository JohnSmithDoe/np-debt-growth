export interface BurndownSample {
  readonly at: number;
  readonly outstanding: number;
}

export interface Burndown {
  readonly samples: readonly BurndownSample[];
  readonly approvals: readonly { readonly tier: number; readonly at: number }[];
  readonly runMs: number;
}

export const EMPTY_BURNDOWN: Burndown = {
  samples: [],
  approvals: [],
  runMs: 0,
};
