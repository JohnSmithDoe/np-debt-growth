import type { RoundOutcome } from '../../game/model/round.model';

export type RoundBound = 'capacity' | 'hand' | 'supply';

export interface RoundReview {
  readonly seq: number;
  readonly billed: number;
  readonly delta: number | null;
  readonly target: number | null;
  readonly met: boolean;
  readonly bound: RoundBound;
  readonly filled: number;
  readonly capacity: number;
  readonly unbilled: number;
  readonly spareSeconds: number | null;
  readonly crewShare: number;
  readonly landed: number;
  readonly skimmed: number;
  readonly points: RoundPoints;
}

export interface RoundPoints {
  readonly velocity: number;
  readonly copilots: number;
  readonly awards: number;
  readonly total: number;
}

function boundOf(round: RoundOutcome): RoundBound {
  if (round.filledAtMs >= 0) return 'capacity';
  return round.unbilled > round.capacity - round.filled ? 'hand' : 'supply';
}

export function reviewRound(
  round: RoundOutcome,
  previous: RoundOutcome | null,
  target: number | null
): RoundReview {
  const before = previous?.billed ?? 0;
  return {
    seq: round.seq,
    billed: round.billed,
    delta: previous && before > 0 ? round.billed / before - 1 : null,
    target,
    met: target === null || round.billed >= target,
    bound: boundOf(round),
    filled: round.filled,
    capacity: round.capacity,
    unbilled: round.unbilled,
    spareSeconds:
      round.filledAtMs >= 0
        ? Math.max(0, round.durationMs - round.filledAtMs) / 1000
        : null,
    crewShare: round.billed > 0 ? round.closedByCrew / round.billed : 0,
    landed: round.billed,
    skimmed: round.skimmed,
    points: {
      velocity: round.spVelocity,
      copilots: round.spCopilots,
      awards: round.spAwards,
      total: round.spVelocity + round.spCopilots + round.spAwards,
    },
  };
}
