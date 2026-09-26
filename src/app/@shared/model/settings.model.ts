export const SETTINGS_KEY = 'np-debt-growth/settings';

export interface Settings {
  readonly showClickRadius?: boolean;
}

export const SETTINGS_DEFAULTS: Required<Settings> = {
  showClickRadius: true,
} as const;
