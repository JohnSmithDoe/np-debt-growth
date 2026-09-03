import type { Burndown } from '../../game/model/burndown.model';
import { MAX_TIER } from '../../game/model/tier.model';

export const CHART_BOX = { width: 600, height: 200 } as const;

export interface BurndownTick {
  readonly tier: number;
  readonly x: number;
}

export interface BurndownChart {
  readonly outstanding: string;
  readonly ideal: string;
  readonly ticks: readonly BurndownTick[];
  readonly peak: number;
  readonly minutes: number;
}

export function burndownChart(run: Burndown): BurndownChart | null {
  const first = run.samples[0];
  if (!first || run.samples.length < 2) return null;

  const span = Math.max(1, run.runMs - first.at);
  const peak = run.samples.reduce(
    (top, sample) => Math.max(top, sample.outstanding),
    0
  );
  const ceiling = Math.max(1, peak);

  const x = (at: number): number => ((at - first.at) / span) * CHART_BOX.width;
  const y = (outstanding: number): number =>
    CHART_BOX.height - (outstanding / ceiling) * CHART_BOX.height;

  return {
    outstanding: run.samples
      .map((sample) => `${round(x(sample.at))},${round(y(sample.outstanding))}`)
      .join(' '),
    ideal: `0,${round(y(peak))} ${CHART_BOX.width},${CHART_BOX.height}`,
    ticks: run.approvals
      .filter((mark) => mark.tier <= MAX_TIER && mark.at >= first.at)
      .map((mark) => ({ tier: mark.tier, x: round(x(mark.at)) })),
    peak,
    minutes: Math.round(span / 60_000),
  };
}

const round = (value: number): number => Math.round(value * 10) / 10;
