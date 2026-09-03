import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { from, Observable, of } from 'rxjs';

import { isLanguage, Language } from './language.model';

const CATALOGUES: Readonly<
  Record<Language, () => Promise<Readonly<Record<string, string>>>>
> = {
  en: () => import('./catalogue/en').then((module) => module.EN),
  de: () => import('./catalogue/de').then((module) => module.DE),
};

export function bundledTranslateLoader(): TranslateLoader {
  return {
    getTranslation(lang: string): Observable<TranslationObject> {
      const load = isLanguage(lang) ? CATALOGUES[lang] : undefined;
      return load ? from(load()) : of({});
    },
  };
}
