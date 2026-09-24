import {
  effect,
  EnvironmentProviders,
  inject,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
  Provider,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import {
  provideTranslateLoader,
  provideTranslateService,
} from '@ngx-translate/core';

import {
  applyDocumentLanguage,
  bootLanguage,
  bootLocale,
} from './@shared/util/i18n/language.boot';
import { bundledTranslateLoader } from './@shared/util/i18n/translate.loader';
import { AudioService } from './audio/data/audio.service';
import { DoorService } from './console/data/door.service';
import { GameClock } from './game/data/game-clock.service';
import { HarnessDoor } from './game/data/harness-door.service';
import { SaveService } from './game/data/save.service';
import { routes } from './app.routes';

export function provideAppKernel(): Array<Provider | EnvironmentProviders> {
  applyDocumentLanguage(bootLanguage());

  return [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideTranslateService({
      lang: bootLanguage(),
      fallbackLang: 'en',
    }),
    provideTranslateLoader(bundledTranslateLoader),
    { provide: LOCALE_ID, useFactory: bootLocale },
    provideEnvironmentInitializer(() => {
      const save = inject(SaveService);
      const clock = inject(GameClock);
      const door = inject(DoorService);
      const audio = inject(AudioService);
      inject(HarnessDoor).open();
      save.restore();
      effect(() => {
        if (!door.opened()) return;
        save.start();
        clock.start();
        audio.startMusic();
      });
    }),
  ];
}
