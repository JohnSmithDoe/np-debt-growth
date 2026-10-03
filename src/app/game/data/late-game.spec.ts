import { describe, expect, it } from 'vitest';

import {
  ACCEPTANCE,
  CREDIT_FROM_ADR,
  CREDIT_INTEREST,
  CRITERION_BONUS,
  CRITERION_GOAL,
  CRITERION_MS,
  CRITERION_OVERTIME,
  CRITERION_PERFECT_MS,
  CRITERION_SPAWN_PER_SEC,
} from '../model/balance/progression';
import {
  INCIDENT_PAYOUT_FROM_TIER,
  INCIDENT_TOP_SHARE,
} from '../model/balance/flow';
import {
  INCIDENT_REVIEW,
  INCIDENT_REVIEW_FROM_TIER,
} from '../model/balance/round';
import {
  COMBO_EXTEND_MS,
  HOTFIX_MS,
  JACKPOT_BONUS,
} from '../model/balance/weather';
import { consultancy } from '../model/consultancy.fixture';
import type { Consultancy } from '../model/consultancy.model';
import { CRITERIA_COUNT } from '../model/consultancy.model';
import {
  AWARD_BY_ID,
  criterionAwardId,
  findingsAwardId,
} from '../model/award.model';
import { FINAL_SKILL_ID, adrPrice } from '../model/skill.model';
import { TICKET_TYPES } from '../model/ticket.model';
import { addTicket } from '../util/board';
import * as economy from '../util/economy';
import * as purchase from '../util/purchase';
import { crewRules } from '../util/crew-rules';
import { flow, incidentPayout } from '../util/sim';
import { CALM } from '../model/hazard.model';
import { emptyBoard, inTest } from '../model/board.model';
import type { GameStore } from './game.store';
import { storeWith } from './store.fixture';

function place(
  store: GameStore,
  type: Parameters<typeof addTicket>[1]
): number {
  const ticket = addTicket(store.board, type);
  expect(ticket).not.toBeNull();
  return ticket!.id;
}

/** Signed with nothing picked; `index` criteria signed, the current one on `line`. */
const signed = (
  index = 0,
  picked = 0,
  ranMs = 0,
  extra: Partial<Consultancy> = {}
): Consultancy =>
  consultancy({
    tier: 8,
    runMs: 100_000 + ranMs,
    signedBudget: 0,
    criterion: {
      index,
      line: index % CRITERIA_COUNT,
      sinceMs: 100_000,
      picked,
      clean: [],
      flagged: [],
      findings: 0,
    },
    skills: { root: 1, [FINAL_SKILL_ID]: 1 },
    ...extra,
  });

describe('the acceptance criteria', () => {
  it('opens on lint when the closeout is signed', () => {
    const ready = consultancy({
      tier: 8,
      budget: 5e14,
      runMs: 12_345,
      storyPoints: 1e9,
      skills: { root: 1, adr8: 1 },
    });
    const next = purchase.buySkill(ready, FINAL_SKILL_ID)!;
    expect(next.signedBudget).toBe(5e14);
    expect(economy.criterionNow(next)).toEqual({
      index: 0,
      line: 0,
      picked: 0,
      goal: CRITERION_GOAL,
    });
    expect(economy.criterionNow(consultancy({ tier: 8 }))).toBeNull();
  });

  it('bills the line under test at the newest rung, doubled', () => {
    const state = signed(1);
    const plain = economy.ticketValue(signed(0), 'legacy');
    const tested = economy.ticketValue(state, 'legacy');
    const ramp = economy.overtime(state) / economy.overtime(signed(0));
    expect(tested / plain / ramp).toBeCloseTo(
      (TICKET_TYPES.swarm.value * CRITERION_BONUS) / TICKET_TYPES.legacy.value,
      6
    );
    expect(economy.underTest(state, 'lint')).toBe(false);
  });

  it('signs clean the moment the hand reaches the goal', () => {
    const short = signed(0, CRITERION_GOAL - 1, 1_000);
    expect(economy.stepCriterion(short).criterion?.index).toBe(0);
    const next = economy.stepCriterion(signed(0, CRITERION_GOAL, 1_000));
    expect(next.criterion).toMatchObject({ index: 1, line: 1, picked: 0 });
    expect(economy.overtime(next)).toBe(ACCEPTANCE.value + CRITERION_OVERTIME);
  });

  it('signs with findings when the window closes short: no overtime, no award', () => {
    const open = signed(3, CRITERION_GOAL - 1, CRITERION_MS - 1);
    expect(economy.stepCriterion(open).criterion?.index).toBe(3);
    const slow = economy.stepCriterion(
      signed(3, CRITERION_GOAL - 1, CRITERION_MS)
    );
    expect(slow.criterion).toMatchObject({ index: 4, findings: 1, clean: [] });
    expect(economy.criteriaVerified(slow)).toBe(3);
    expect(AWARD_BY_ID.get(criterionAwardId(3))?.when(slow)).toBe(false);
  });

  it('toasts a criterion signed with findings', () => {
    const slow = economy.stepCriterion(signed(3, 0, CRITERION_MS));
    expect(AWARD_BY_ID.get(findingsAwardId(3))?.when(slow)).toBe(true);
  });

  it('spawns the line under test at one rate whatever its spawners, the rest at their own', () => {
    const lint = signed(0);
    expect(
      economy.spawnRate(lint, 'lint') + economy.spawnRate(lint, 'bug')
    ).toBeCloseTo(CRITERION_SPAWN_PER_SEC, 9);
    expect(economy.spawnRate(signed(8), 'swarm')).toBeCloseTo(
      CRITERION_SPAWN_PER_SEC,
      9
    );
    expect(economy.spawnRate(lint, 'legacy')).toBeCloseTo(
      economy.spawnRate(
        consultancy({ tier: 8, skills: { root: 1 } }),
        'legacy'
      ),
      9
    );
  });

  it('asks what the line spawns in the perfect-play time, short of the window', () => {
    expect(CRITERION_GOAL).toBe(
      Math.floor(CRITERION_SPAWN_PER_SEC * (CRITERION_PERFECT_MS / 1000))
    );
    expect(CRITERION_GOAL).toBe(30);
    expect(CRITERION_PERFECT_MS).toBeLessThan(CRITERION_MS);
  });

  it('auto-closes nothing in the push', () => {
    const skills = { ...signed(0).skills, triagePolicy: 1 };
    const before = consultancy({ skills: { ...skills, [FINAL_SKILL_ID]: 0 } });
    expect(economy.autoClosed(before).has('lint')).toBe(true);
    expect(economy.autoClosed(signed(0, 0, 0, { skills })).size).toBe(0);
  });

  it('counts and colours only the cards spawned for the test', () => {
    const store = storeWith(signed(0));
    const before = place(store, 'lint');
    store.advanceTo(100);
    const during = place(store, 'lint');
    expect(inTest(store.board, store.board.byId.get(before)!)).toBe(false);
    expect(inTest(store.board, store.board.byId.get(during)!)).toBe(true);
    store.harvest([before, during]);
    expect(store.snapshot().criterion!.picked).toBe(1);
  });

  it('feeds every line under test the same: no interest, no comebacks', () => {
    expect(economy.debtInterest(signed(5))).toBe(0);
    expect(economy.spawnRate(signed(0), 'quarter')).toBe(0);
    const store = storeWith(signed(2));
    store.advanceTo(100);
    store.harvest([place(store, 'flaky')]);
    expect(store.board.pending).toHaveLength(0);
  });

  it('keeps the hand-only cards at their own rate during the push', () => {
    const before = consultancy({ tier: 8, skills: { root: 1 } });
    expect(economy.spawnRate(signed(0), 'hotfix')).toBeCloseTo(
      economy.spawnRate(before, 'hotfix'),
      9
    );
  });

  it('is accepted once every criterion is signed', () => {
    const last = signed(CRITERIA_COUNT - 1, CRITERION_GOAL);
    const done = economy.stepCriterion(last);
    expect(economy.accepted(done)).toBe(true);
    expect(economy.criterionNow(done)).toBeNull();
  });

  it('confirms a criterion award as it is signed', () => {
    const store = storeWith(signed(0, CRITERION_GOAL));
    store.advanceTo(100);
    expect(store.snapshot().achievements).toContain(criterionAwardId(0));
    expect(store.snapshot().achievements).not.toContain(criterionAwardId(1));
  });

  it('counts what the hand picks up of the line under test', () => {
    const store = storeWith(signed(0));
    store.advanceTo(100);
    store.harvest([
      place(store, 'lint'),
      place(store, 'bug'),
      place(store, 'legacy'),
    ]);
    expect(store.snapshot().criterion!.picked).toBe(2);
  });

  it('sends the whole crew into the acceptance meeting', () => {
    const rules = crewRules(emptyBoard(), signed(0), CALM);
    expect(rules.every((rule) => rule.interrupted)).toBe(true);
    expect(flow(signed(0), { clicksPerSec: 1 }).crewPerSec).toBe(0);
  });

  it('never displaces the line under test from a full board', () => {
    const store = storeWith(signed(0));
    store.advanceTo(100);
    expect(store.board.kept).toEqual(['lint', 'bug']);
  });
});

describe('the closeout', () => {
  it('voids the hotfixes, escalations and quarter ends held on the board', () => {
    const store = storeWith({
      tier: 8,
      storyPoints: 1e9,
      skills: { root: 1, adr8: 1 },
    });
    place(store, 'hotfix');
    place(store, 'escalation');
    place(store, 'quarter');
    const incident = place(store, 'incident');
    expect(store.buySkill(FINAL_SKILL_ID)).toBe(true);
    expect(store.board.rares.map((ticket) => ticket.id)).toEqual([incident]);
  });
});

describe('late P0s', () => {
  it('bill a handful of the newest line, multipliers and all, from the rung that prices them off the build', () => {
    const early = consultancy({ tier: INCIDENT_PAYOUT_FROM_TIER - 1 });
    const late = consultancy({
      tier: 8,
      levels: { velocity: 1 },
      skills: { root: 1, valueSwarm: 2 },
    });
    expect(economy.ticketValue(early, 'incident')).toBe(
      TICKET_TYPES.incident.value * early.tier
    );
    expect(economy.ticketValue(late, 'incident')).toBeCloseTo(
      INCIDENT_TOP_SHARE * economy.ticketValue(late, 'swarm'),
      6
    );
    expect(economy.pickupStoryPoints(late, 'incident', false)).toBe(
      INCIDENT_TOP_SHARE * economy.pickupStoryPoints(late, 'swarm', false)
    );
  });

  it('pay seconds of the build income on top, from the rung that prices them off the build', () => {
    const late = {
      tier: INCIDENT_PAYOUT_FROM_TIER,
      levels: { velocity: 1 },
      skills: { root: 1 },
      spawners: { '1': 3, '5': 2 },
    };
    const store = storeWith(late);
    const payout = incidentPayout(store.state());
    expect(payout.euros).toBeGreaterThan(0);
    const before = store.state();
    const paid = store.harvest([place(store, 'incident')]);
    const base = economy.ticketValue(before, 'incident');
    expect(paid.value).toBeCloseTo(base + payout.euros, 3);
    expect(paid.big).toBe(true);
    expect(store.state().budget - before.budget).toBeCloseTo(paid.value, 3);

    const early = storeWith({ ...late, tier: INCIDENT_PAYOUT_FROM_TIER - 1 });
    const plain = early.harvest([place(early, 'incident')]);
    expect(plain.value).toBeCloseTo(
      economy.ticketValue(early.state(), 'incident'),
      3
    );
  });

  it('review longer the more of them are left open', () => {
    const store = storeWith({ tier: INCIDENT_REVIEW_FROM_TIER });
    const plain = store.haulMs();
    place(store, 'incident');
    place(store, 'incident');
    store.endRoundNow(0);
    expect(store.haulMs()).toBe(plain + 2 * INCIDENT_REVIEW.ms);
  });

  it('hold the train for a review when one is still open', () => {
    const store = storeWith({ tier: INCIDENT_REVIEW_FROM_TIER });
    const plain = store.haulMs();
    place(store, 'incident');
    store.endRoundNow(0);
    expect(store.releasePhases().map((phase) => phase.id)).toContain(
      'incident'
    );
    expect(store.haulMs()).toBe(plain + INCIDENT_REVIEW.ms);
    expect(store.snapshot().haulLeftMs).toBe(plain + INCIDENT_REVIEW.ms);
    expect(store.snapshot().lifetimeReviews).toBe(1);

    store.startRound(0);
    expect(store.haulMs()).toBe(plain);
  });

  it('are not reviewed before the tier that prices them', () => {
    const store = storeWith({ tier: INCIDENT_REVIEW_FROM_TIER - 1 });
    const plain = store.haulMs();
    place(store, 'incident');
    store.endRoundNow(0);
    expect(store.snapshot().haulLeftMs).toBe(plain);
  });
});

describe('buff combos', () => {
  it('extend the live escalation when a hotfix lands inside it', () => {
    const store = storeWith({ lastTick: 1_000 });
    store.harvest([place(store, 'escalation')]);
    const fires = store.snapshot().escalationFiresAt;
    store.harvest([place(store, 'hotfix')]);
    expect(store.snapshot().escalationFiresAt).toBe(fires + COMBO_EXTEND_MS);
  });

  it('extend the live hotfix when an escalation lands inside it', () => {
    const store = storeWith({ lastTick: 1_000 });
    store.harvest([place(store, 'hotfix')]);
    store.harvest([place(store, 'escalation')]);
    expect(store.snapshot().hotfixUntil).toBe(
      1_000 + HOTFIX_MS + COMBO_EXTEND_MS
    );
  });

  it('bill a quarter end under both as a jackpot', () => {
    const store = storeWith({ tier: 2, lastTick: 1_000 });
    for (let n = 0; n < 20; n += 1) place(store, 'bug');
    store.harvest([place(store, 'hotfix')]);
    store.harvest([place(store, 'escalation')]);
    const before = store.snapshot().budget;
    const harvest = store.harvest([place(store, 'quarter')]);
    const state = store.snapshot();

    const each =
      economy.ticketValue(state, 'bug', 1_000) *
      economy.escalationMultiplier(state);
    expect(state.budget - before).toBeCloseTo(each * 20 * JACKPOT_BONUS, 6);
    expect(harvest.headline).toBe('board.jackpot');
    expect(state.lifetimeJackpots).toBe(1);
  });
});

describe('approving an ADR on credit', () => {
  const ladder = { root: 1, adr1: 1, adr2: 1, adr3: 1 };
  const short = (share: number) =>
    consultancy({ tier: 3, skills: ladder, storyPoints: adrPrice(4) * share });

  it('is offered for the next ADR from the credit share of its price', () => {
    expect(purchase.creditOffer(short(0.5), 'adr4')).toBeNull();
    expect(purchase.creditOffer(short(0.7), 'adr4')).toBe(
      Math.ceil((adrPrice(4) - short(0.7).storyPoints) * CREDIT_INTEREST)
    );
    expect(CREDIT_INTEREST).toBe(1);
    expect(purchase.creditOffer(short(1.2), 'adr4')).toBeNull();
    expect(purchase.creditOffer(short(0.7), 'adr5')).toBeNull();
  });

  it('waits for the rungs where the saving starts', () => {
    const early = consultancy({
      tier: CREDIT_FROM_ADR - 2,
      skills: { root: 1, adr1: 1, adr2: 1 },
      storyPoints: adrPrice(CREDIT_FROM_ADR - 1) * 0.9,
    });
    expect(purchase.creditOffer(early, `adr${CREDIT_FROM_ADR - 1}`)).toBeNull();
  });

  it('opens the rung now and garnishes the rest from later pickups', () => {
    const next = purchase.approveOnCredit(short(0.7), 'adr4')!;
    expect(next.tier).toBe(4);
    expect(next.storyPoints).toBe(0);
    expect(next.spDebt).toBe(purchase.creditOffer(short(0.7), 'adr4'));
    expect(purchase.creditOffer({ ...next, storyPoints: 1e12 }, 'adr5')).toBe(
      null
    );

    const half = economy.repaid(next, 100);
    expect(half).toEqual({ storyPoints: 50, spDebt: next.spDebt - 50 });
    const repaid = economy.repaid(next, next.spDebt * 2 + 10);
    expect(repaid).toEqual({ storyPoints: next.spDebt + 10, spDebt: 0 });
  });

  it('raises the tier through the store like any approval', () => {
    const store = storeWith({
      tier: 3,
      skills: ladder,
      storyPoints: adrPrice(4) * 0.7,
    });
    expect(store.approveOnCredit('adr4')).toBe(true);
    expect(store.tier()).toBe(4);
    expect(store.spDebt()).toBeGreaterThan(0);
  });
});

describe('the crew ledger', () => {
  it('counts only crew closes, not the hand', () => {
    const store = storeWith();
    store.harvest([place(store, 'bug')]);
    expect(store.snapshot().lifetimeClosed).toBe(1);
    expect(store.snapshot().lifetimeClosedByCrew).toBe(0);
  });
});

describe('the push', () => {
  it('ships every close with no sprint cap and no train', () => {
    const store = storeWith(signed(0));
    store.endRoundNow(0);
    store.advanceTo(500);
    expect(store.hauling()).toBe(false);
    expect(store.snapshot().sprintCount).toBe(0);
    expect(economy.sprintRoom(store.snapshot())).toBe(Infinity);
  });
});
