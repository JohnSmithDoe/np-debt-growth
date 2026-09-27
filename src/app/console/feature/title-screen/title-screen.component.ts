import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import {
  bootLanguage,
  rememberBootLanguage,
} from '../../../@shared/util/i18n/language.boot';
import { LANGUAGES, Language } from '../../../@shared/util/i18n/language.model';
import { GameStore } from '../../../game/data/game.store';
import { SaveService } from '../../../game/data/save.service';
import { DoorService } from '../../data/door.service';
import { FullscreenService } from '../../data/fullscreen.service';
import { HelpUiService } from '../../data/help-ui.service';
import { BacklogTickerComponent } from '../../ui/backlog-ticker/backlog-ticker.component';
import { CreditsComponent } from '../../ui/credits/credits.component';
import { CLOSING_OFFICE_ART, officeArtFor } from '../../util/office-art';

@Component({
  selector: 'cb-title-screen',
  imports: [BacklogTickerComponent, CreditsComponent, TranslatePipe],
  templateUrl: './title-screen.component.html',
  styleUrl: './title-screen.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TitleScreenComponent {
  #save = inject(SaveService);
  #screen = inject(FullscreenService);
  #door = inject(DoorService);
  #store = inject(GameStore);
  #help = inject(HelpUiService);

  readonly art = computed(() =>
    this.#store.ended() ? CLOSING_OFFICE_ART : officeArtFor(this.#store.tier())
  );

  readonly languages = LANGUAGES;
  readonly language = bootLanguage();
  readonly shown = computed(() => !this.#door.opened());
  readonly action = computed(() =>
    this.#save.restored() ? 'title.resume' : 'title.start'
  );

  readonly canFullscreen = this.#screen.available;
  readonly fullscreen = this.#screen.on;

  toggleFullscreen(): void {
    this.#screen.toggle();
  }

  open(): void {
    this.#door.open();
  }

  openHelp(): void {
    this.#help.open();
  }

  choose(language: Language): void {
    if (language === this.language) return;
    rememberBootLanguage(language);
    globalThis.location.reload();
  }
}
