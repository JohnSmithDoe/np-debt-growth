import { isLanguage, Language, LOCALE_BY_LANGUAGE } from './language.model';

const BOOT_LANGUAGE_KEY = 'npcb-language';

const DEFAULT_LANGUAGE: Language = 'en';

export function bootLanguage(): Language {
  const stored = globalThis.localStorage?.getItem(BOOT_LANGUAGE_KEY) ?? null;
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
}

export const bootLocale = (): string => LOCALE_BY_LANGUAGE[bootLanguage()];

export const rememberBootLanguage = (language: Language): void => {
  globalThis.localStorage?.setItem(BOOT_LANGUAGE_KEY, language);
};

export const applyDocumentLanguage = (language: Language): void => {
  document.documentElement.lang = language;
};
