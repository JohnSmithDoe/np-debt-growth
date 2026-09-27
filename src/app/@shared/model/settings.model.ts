export const SETTINGS_KEY = 'np-debt-growth/settings';

export interface Settings {
  readonly showClickRadius?: boolean;
  readonly showAgent?: boolean;
  readonly railTab?: string;
}

export const SETTINGS_DEFAULTS: Required<Settings> = {
  showClickRadius: true,
  showAgent: true,
  railTab: 'supply',
} as const;
