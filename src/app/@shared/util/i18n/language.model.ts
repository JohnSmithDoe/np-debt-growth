export const LANGUAGES = ['en', 'de'] as const;

export type Language = (typeof LANGUAGES)[number];

export const LOCALE_BY_LANGUAGE: Readonly<Record<Language, string>> = {
  en: 'en-GB',
  de: 'de-DE',
};

export function isLanguage(
  value: string | null | undefined
): value is Language {
  return LANGUAGES.includes(value as Language);
}
