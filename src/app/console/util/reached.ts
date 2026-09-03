import type { Consultancy } from '../../game/model/consultancy.model';
import type { NoticeTarget } from '../model/step.model';

export function reached(state: Consultancy): Record<NoticeTarget, boolean> {
  return {
    board: true,
    review: true,
    skills: state.storyPoints > 0 || Object.keys(state.skills).length > 0,
  };
}
