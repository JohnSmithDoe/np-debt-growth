const STAGE_MODES = ['board', 'skills', 'finale'] as const;

export type StageMode = (typeof STAGE_MODES)[number];
