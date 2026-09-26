import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { backlogTicker } from '../../util/backlog-ticker';

const TICKER_LENGTH = 18;

@Component({
  selector: 'cb-backlog-ticker',
  imports: [TranslatePipe],
  templateUrl: './backlog-ticker.component.html',
  styleUrl: './backlog-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class BacklogTickerComponent {
  readonly items = backlogTicker(TICKER_LENGTH);
  readonly passes = [0, 1] as const;
}
