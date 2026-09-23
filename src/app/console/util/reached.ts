import type { Consultancy } from '../../game/model/consultancy.model';
import { SKILL_ROOT_ID } from '../../game/model/skill.model';
import type { NoticeTarget } from '../model/step.model';

export function reached(state: Consultancy): Record<NoticeTarget, boolean> {
  return {
    board: true,
    review: true,
    // The root ships bought and the ADR ladder hangs off it, so the tree is
    // the run's spine from the first second — never a room to reveal later.
    skills: (state.skills[SKILL_ROOT_ID] ?? 0) > 0,
  };
}
