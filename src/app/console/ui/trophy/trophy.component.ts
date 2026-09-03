import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'cb-trophy',
  templateUrl: './trophy.component.html',
  styleUrl: './trophy.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class TrophyComponent {}
