export interface AdrCopy {
  readonly context: string;
  readonly decision: string;
  readonly consequences: string;
}

export const ADR_COPY: Readonly<Record<number, AdrCopy>> = {
  1: {
    context:
      'Ticket volume has outgrown manual triage. A framework upgrade was scoped and rejected on cost. Feature velocity is flat.',
    decision:
      'Adopt Legacy Framework as the platform baseline. The current version will not be upgraded. Legacy Defects are expected output, not incidents.',
    consequences:
      'Legacy Defects now spawn continuously across the board. The framework is now load-bearing and unmaintained.',
  },
  2: {
    context:
      'Onboarding time for new hires was judged too long. A style guide was proposed and shelved in favour of an internal wiki page titled "Just copy an existing service."',
    decision:
      'Codify copy-paste as the standard method of extending the system. Deduplication is deprioritised indefinitely.',
    consequences:
      'Flaky Tests now spawn across the board and respawn once after closing, billing twice for the same defect. The duplication is now a pattern, and patterns are best practice.',
  },
  3: {
    context:
      'Delivery capacity did not scale with backlog growth. A vendor was engaged across three time zones, with no shared style guide, code owner, or onboarding process.',
    decision:
      'Route a majority of new feature work through offshore contracting. Reviews are conducted asynchronously, where they are conducted at all.',
    consequences:
      'Merge Conflicts spawn at volume, around the clock. The board floods and income jumps by an order of magnitude. Delivery is now distributed across every timezone at once.',
  },
  4: {
    context:
      'Throughput per engineer has plateaued. A licence for an assistive coding tool was approved on the basis of a vendor deck and a two-week trial nobody wrote up.',
    decision:
      'Generate new code by default. Review is advisory. Output that compiles is treated as output that works.',
    consequences:
      'Hallucinated Imports spawn across the board. Each reads as correct and is not; the defect is found downstream, at our day rate. Nobody on the engagement can now say which lines were written by a person.',
  },
  5: {
    context:
      'Delivery of the assistive-tooling backlog slipped. One engineer consistently closes more tickets than the rest of the team combined and has asked to work unblocked.',
    decision:
      'Grant unrestricted commit access to the highest-performing engineer. Suspend review, pairing and retro attendance for that engineer only.',
    consequences:
      'Force Pushes land on main and spawn work for everyone else. Throughput per head is now our highest ever and our bus factor is one. The retro has been made optional, which has resolved the complaints about the retro.',
  },
  6: {
    context:
      'Following the departure of the highest-performing engineer, four production services were found to have no listed owner. Ownership was requested in a channel that no longer has members.',
    decision:
      'Leave the unowned services running. Do not decommission what cannot be traced. Route their alerts to the on-call rotation.',
    consequences:
      'The 3AM Page spawns continuously and comes back after it is closed, billing the same incident twice. Nothing is fixed, because nothing can be found. The services are load-bearing and nobody knows what they bear.',
  },
  7: {
    context:
      'A platform audit found the system unmaintainable. The estimate to remediate incrementally exceeded the estimate to rebuild, because the rebuild was estimated by the team proposing it.',
    decision:
      'Begin a full rewrite on a new stack. Run both systems in parallel indefinitely. Feature parity is a phase-two concern.',
    consequences:
      'Migration Fallout spawns at scale as the two systems disagree about the truth. We are now paid to maintain the old system, build the new one, and reconcile them. This is the most profitable quarter on record.',
  },
  8: {
    context:
      'The rewrite is behind. Headcount is capped. A proposal was circulated to close the gap without hiring, and approved in the same meeting it was presented.',
    decision:
      'Grant autonomous agents commit and merge rights against both systems. Set no limit on concurrent work. Human review is retained in the process diagram.',
    consequences:
      'Autonomous PRs spawn without limit and at the highest value on the board. The engagement is now billing for work it did not do, to fix work it did not write, on a system nobody has read. There is no tier after this one.',
  },
};
