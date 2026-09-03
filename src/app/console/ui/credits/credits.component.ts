import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  ART_LICENSE_URL,
  COPYRIGHT,
  CREDITS,
  LICENSE_URL,
  SOURCE_URL,
} from '../../model/credit.model';

@Component({
  selector: 'cb-credits',
  host: { '[class.open]': 'open()' },
  templateUrl: './credits.component.html',
  styleUrl: './credits.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreditsComponent {
  readonly credits = CREDITS;
  readonly sourceUrl = SOURCE_URL;
  readonly sourceLabel = SOURCE_URL.replace(/^https:\/\//, '');
  readonly licenseUrl = LICENSE_URL;
  readonly artLicenseUrl = ART_LICENSE_URL;
  readonly copyright = COPYRIGHT;
  readonly open = signal(false);

  toggle(): void {
    this.open.update((open) => !open);
  }
}
