export interface Credit {
  readonly what: string;
  readonly who: string;
  readonly license: string;
  readonly url?: string;
}

export const SOURCE_URL = 'https://github.com/JohnSmithDoe/np-clickbait';

export const COPYRIGHT = '© 2026 Martin Stärk';

export const LICENSE_URL = 'assets/legal/LICENSE.txt';

export const ART_LICENSE_URL = 'assets/legal/GPL-3.0.txt';

export const CREDITS: readonly Credit[] = [
  {
    what: 'App framework — Angular 21',
    who: 'Google and the Angular contributors',
    license: 'MIT',
    url: 'https://angular.dev',
  },
  {
    what: 'Translation — ngx-translate',
    who: 'Olivier Combe, Andreas Löw / CodeAndWeb GmbH',
    license: 'MIT',
    url: 'https://github.com/ngx-translate/core',
  },
  {
    what: 'Rendering — Phaser 4',
    who: 'Phaser Studio',
    license: 'MIT',
    url: 'https://phaser.io',
  },
  {
    what: 'Desktop shell — Tauri 2, serde',
    who: 'The Tauri Programme, David Tolnay',
    license: 'Apache-2.0 OR MIT',
    url: 'https://tauri.app',
  },
  {
    what: 'Streams and helpers — RxJS, tslib',
    who: 'the ReactiveX contributors, Microsoft',
    license: 'Apache-2.0, 0BSD',
  },
  {
    what: 'Typeface — Departure Mono',
    who: 'Helena Zhang',
    license: 'SIL OFL 1.1',
    url: 'assets/fonts/DepartureMono.LICENSE.txt',
  },
  {
    what: 'The crew — Universal LPC Spritesheet Generator',
    who:
      'JaidynReiman, Stephen Challener (Redshrike), ElizaWy, Johannes Sjölund (wulax), ' +
      'bluecarrot16, Benjamin K. Smith (BenCreating), TheraHedwig, Evert, MuffinElZangano, ' +
      'Durrani, Matthew Krohn (makrohn), laetissima, Thane Brimhall (pennomi), ' +
      'Pierre Vigier (pvigier), and the others named in the linked file',
    license: 'GPL-3.0 elected, cast-wide',
    url: 'assets/characters/crew-atlas.credits.txt',
  },
  {
    what: 'Trophy icon — Material Symbols “emoji_events”',
    who: 'Google',
    license: 'Apache-2.0',
    url: 'https://github.com/google/material-design-icons',
  },
  {
    what: 'Title, tier, screen and floor art',
    who: 'generated with FLUX.2 Klein (Apache-2.0) via mflux, from prompts in this repo',
    license: 'machine-generated',
    url: 'https://github.com/filipstrand/mflux',
  },
  {
    what: 'Music — “Uptempo Chiptune”, “Boss Battle #2” (C64)',
    who: 'Skrjablin; TheOuterLinux, after nene',
    license: 'CC0-1.0',
    url: 'assets/audio/music.credits.txt',
  },
  {
    what: 'Sound effects',
    who: 'synthesised in the browser at run time',
    license: 'AGPL-3.0-only',
  },
  {
    what: 'Code, design and the rest of the art',
    who: 'written for this game',
    license: 'AGPL-3.0-only',
  },
];
