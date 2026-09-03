export const SETTINGS_KEY = 'np-clickbait/settings';

export interface Settings {
  readonly showClickRadius?: boolean;
}

export const SETTINGS_DEFAULTS: Required<Settings> = {
  showClickRadius: false,
} as const;
