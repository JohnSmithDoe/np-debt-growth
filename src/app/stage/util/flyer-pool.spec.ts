import type * as Phaser from 'phaser';
import { describe, expect, it } from 'vitest';

import { voteBeamY } from '../../game/model/board.model';
import { FLIGHT, FlyerPool } from './flyer-pool';

function fakeScene(): Phaser.Scene {
  const image = (): unknown => {
    const self: Record<string, unknown> = { x: 0, y: 0, alpha: 1, rotation: 0 };
    const chain =
      (apply: (...args: number[]) => void) =>
      (...args: number[]) => {
        apply(...args);
        return self;
      };
    Object.assign(self, {
      setDepth: chain(() => undefined),
      setVisible: chain(() => undefined),
      setFrame: chain(() => undefined),
      setRotation: chain((r) => (self['rotation'] = r)),
      setAlpha: chain((a) => (self['alpha'] = a)),
      setPosition: chain((x, y) => {
        self['x'] = x;
        self['y'] = y;
      }),
      destroy: () => undefined,
      displayWidth: 10,
      displayHeight: 10,
    });
    return self;
  };
  return { add: { image } } as unknown as Phaser.Scene;
}

describe('the flyer pool and the planning-poker beams', () => {
  it('reports one crossing per voting beam, where the card passes it', () => {
    const pool = new FlyerPool(fakeScene(), 0);
    pool.beams(0, 1);
    const crossed: number[] = [];
    pool.onVote = (beam) => crossed.push(beam);

    pool.launch('card', FLIGHT.drop, 7, 50, 0, 50, 400, 1_000, 30);
    pool.markVoted(7, 0b101);
    for (let ms = 0; ms <= 1_000; ms += 16) pool.update(16);

    expect(crossed).toEqual([0, 2]);
  });

  it('lights nothing for a card the vote passed over', () => {
    const pool = new FlyerPool(fakeScene(), 0);
    pool.beams(0, 1);
    let crossed = 0;
    pool.onVote = () => (crossed += 1);

    pool.launch('card', FLIGHT.drop, 3, 50, 0, 50, voteBeamY(3) + 20, 800, 30);
    pool.markVoted(3, 0);
    for (let ms = 0; ms <= 800; ms += 16) pool.update(16);

    expect(crossed).toBe(0);
  });
});
