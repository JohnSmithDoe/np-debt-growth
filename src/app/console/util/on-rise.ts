import { effect } from '@angular/core';

export function onRise(
  source: () => number,
  fire: (value: number) => void,
  from = source()
): void {
  let last = from;
  effect(() => {
    const value = source();
    if (value > last) fire(value);
    last = value;
  });
}
