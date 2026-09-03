import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { SettingsService } from '../../../@shared/data/settings.service';
import { FullscreenService } from '../../data/fullscreen.service';
import {
  bootLanguage,
  rememberBootLanguage,
} from '../../../@shared/util/i18n/language.boot';
import { LANGUAGES, Language } from '../../../@shared/util/i18n/language.model';
import { SettingsUiService } from '../../data/settings-ui.service';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { PanelComponent } from '../../ui/panel/panel.component';

@Component({
  selector: 'cb-settings-modal',
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'dismiss()' },
  imports: [BackdropDirective, PanelComponent, TranslatePipe],
})
export class SettingsModalComponent {
  #settings = inject(SettingsService);
  #ui = inject(SettingsUiService);
  #screen = inject(FullscreenService);

  readonly muted = input(false);
  readonly mutedChange = output<boolean>();

  readonly shown = this.#ui.isOpen;
  readonly showClickRadius = this.#settings.showClickRadius;
  readonly canFullscreen = this.#screen.available;
  readonly fullscreen = this.#screen.on;
  readonly languages = LANGUAGES;
  readonly language = bootLanguage();

  toggleFullscreen(): void {
    this.#screen.toggle();
  }

  setShowClickRadius(value: boolean): void {
    this.#settings.setShowClickRadius(value);
  }

  toggleMuted(): void {
    this.mutedChange.emit(!this.muted());
  }

  choose(language: Language): void {
    if (language === this.language) return;
    rememberBootLanguage(language);
    globalThis.location.reload();
  }

  dismiss(): void {
    this.#ui.close();
  }
}
