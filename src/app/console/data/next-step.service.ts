import { computed, inject, Injectable } from '@angular/core';

import { GameStore } from '../../game/data/game.store';
import { SECRET_SKILL_ID, SKILL_BY_ID } from '../../game/model/skill.model';
import type { NextStep, NoticeTarget } from '../model/step.model';
import type { NextRank } from '../util/next-step';
import { nextSteps } from '../util/next-step';

@Injectable({ providedIn: 'root' })
export class NextStepService {
  #store = inject(GameStore);

  readonly steps = computed<readonly NextStep[]>(() =>
    nextSteps(this.#store.state(), {
      openSkills: this.#openSkills(),
      nextRank: this.#nextRank(),
    })
  );

  readonly countByTarget = computed(() => {
    const counts: Partial<Record<NoticeTarget, number>> = {};
    for (const step of this.steps()) {
      counts[step.target] = (counts[step.target] ?? 0) + 1;
    }
    return counts;
  });

  #openSkills = computed<readonly string[]>(() => {
    this.#store.state();
    const open: string[] = [];
    for (const node of SKILL_BY_ID.values()) {
      if (node.id === SECRET_SKILL_ID) continue;
      if (this.#store.skillRank(node.id) > 0) continue;
      if (!this.#store.skillAvailable(node.id)) continue;
      if (this.#store.skillLockReason(node.id) !== null) continue;
      open.push(node.id);
    }
    return open;
  });

  #nextRank = computed<NextRank | null>(() => {
    this.#store.state();
    let best: NextRank | null = null;
    let cheapest = Number.POSITIVE_INFINITY;
    for (const node of SKILL_BY_ID.values()) {
      if (node.id === SECRET_SKILL_ID) continue;
      const rank = this.#store.skillRank(node.id);
      if (rank === 0 || !this.#store.skillAvailable(node.id)) continue;
      if (this.#store.skillLockReason(node.id) !== null) continue;
      const cost = this.#store.skillRankCost(node.id);
      if (cost >= cheapest) continue;
      best = { id: node.id, rank: rank + 1 };
      cheapest = cost;
    }
    return best;
  });
}
