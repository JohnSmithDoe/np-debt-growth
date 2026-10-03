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
import { HelpUiService } from '../../data/help-ui.service';
import {
  bootLanguage,
  rememberBootLanguage,
} from '../../../@shared/util/i18n/language.boot';
import { LANGUAGES, Language } from '../../../@shared/util/i18n/language.model';
import { SettingsUiService } from '../../data/settings-ui.service';
import { BackdropDirective } from '../../ui/backdrop/backdrop.directive';
import { PanelComponent } from '../../ui/panel/panel.component';

const sliderVolume = (event: Event): number =>
  Number((event.target as HTMLInputElement).value) / 100;

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
  #help = inject(HelpUiService);

  readonly music = input(true);
  readonly sfx = input(true);
  readonly musicVolume = input(0.5);
  readonly sfxVolume = input(0.5);
  readonly musicChange = output<boolean>();
  readonly sfxChange = output<boolean>();
  readonly musicVolumeChange = output<number>();
  readonly sfxVolumeChange = output<number>();

  readonly shown = this.#ui.isOpen;
  readonly showClickRadius = this.#settings.showClickRadius;
  readonly showAgent = this.#settings.showAgent;
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

  setShowAgent(value: boolean): void {
    this.#settings.setShowAgent(value);
  }

  toggleMusic(): void {
    this.musicChange.emit(!this.music());
  }

  toggleSfx(): void {
    this.sfxChange.emit(!this.sfx());
  }

  setMusicVolume(event: Event): void {
    this.musicVolumeChange.emit(sliderVolume(event));
  }

  setSfxVolume(event: Event): void {
    this.sfxVolumeChange.emit(sliderVolume(event));
  }

  percent(volume: number): number {
    return Math.round(volume * 100);
  }

  choose(language: Language): void {
    if (language === this.language) return;
    rememberBootLanguage(language);
    globalThis.location.reload();
  }

  openHelp(): void {
    this.#ui.close();
    this.#help.open();
  }

  dismiss(): void {
    this.#ui.close();
  }
}
