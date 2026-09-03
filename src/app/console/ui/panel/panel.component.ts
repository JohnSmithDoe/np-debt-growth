import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'cb-panel',
  templateUrl: './panel.component.html',
  styleUrl: './panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelComponent {
  readonly heading = input.required<string>();
  readonly subheading = input('');
}
