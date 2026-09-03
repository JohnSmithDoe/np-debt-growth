const STAGE_MODES = ['board', 'skills'] as const;

export type StageMode = (typeof STAGE_MODES)[number];
