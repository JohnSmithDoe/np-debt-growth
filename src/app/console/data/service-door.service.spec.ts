import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ServiceDoorService } from './service-door.service';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

const type = (...keys: string[]): void => {
  for (const key of keys) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  }
};

describe('the service door', () => {
  let door: ServiceDoorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    door = TestBed.inject(ServiceDoorService);
  });

  it('stays shut until the whole sequence is typed', () => {
    type(...KONAMI.slice(0, -1));
    expect(door.isOpen()).toBe(false);
    type('a');
    expect(door.isOpen()).toBe(true);
  });

  it('opens after a near miss, rather than desyncing on it', () => {
    type('ArrowUp', 'ArrowDown', 'ArrowUp');
    type(...KONAMI);
    expect(door.isOpen()).toBe(true);
  });

  it('ignores the case of the letters, and everything that is not it', () => {
    type('x', 'Escape', 'q');
    expect(door.isOpen()).toBe(false);
    type(...KONAMI.slice(0, -2), 'B', 'A');
    expect(door.isOpen()).toBe(true);
  });
});
