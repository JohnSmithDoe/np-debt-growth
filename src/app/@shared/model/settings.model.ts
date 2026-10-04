export const SETTINGS_KEY = 'np-debt-growth/settings';

export interface Settings {
  readonly showClickRadius?: boolean;
  readonly showAgent?: boolean;
  readonly agentAuto?: boolean;
  readonly agentWarned?: boolean;
  readonly tutorialDone?: boolean;
  readonly railTab?: string;
}

export const SETTINGS_DEFAULTS: Required<Settings> = {
  showClickRadius: true,
  showAgent: true,
  agentAuto: false,
  agentWarned: false,
  tutorialDone: false,
  railTab: 'supply',
} as const;
