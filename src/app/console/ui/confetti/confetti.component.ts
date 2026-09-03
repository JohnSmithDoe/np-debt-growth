import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

interface Spark {
  readonly left: string;
  readonly size: string;
  readonly delay: string;
  readonly duration: string;
}

const EDGE_INSET = 2;

function sparkAt(index: number, count: number): Spark {
  const step = count > 1 ? (100 - EDGE_INSET * 2) / (count - 1) : 0;
  const nth = index + 1;
  return {
    left: `${EDGE_INSET + index * step}%`,
    size: `${4 + (nth % 3) * 2}px`,
    delay: `${(nth % 5) * 0.42 + (nth % 2) * 0.15}s`,
    duration: `${1.9 + (nth % 4) * 0.4}s`,
  };
}

@Component({
  selector: 'cb-confetti',
  templateUrl: './confetti.component.html',
  styleUrl: './confetti.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class ConfettiComponent {
  readonly pieces = input(14);

  protected readonly sparks = computed<Spark[]>(() => {
    const count = Math.max(this.pieces(), 0);
    return Array.from({ length: count }, (_, index) => sparkAt(index, count));
  });
}
