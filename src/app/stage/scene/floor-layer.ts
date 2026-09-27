import * as Phaser from 'phaser';

import { OFFICE_GRID, OFFICE_PLAN } from '../../game/model/office.model';
import { LOGICAL_BOARD } from '../../game/model/geometry';
import {
  OFFICE_SHELLS,
  officePlateUrl,
  officeShellKey,
} from '../model/board.consts';

export class FloorLayer {
  readonly #plates: readonly Phaser.GameObjects.Image[];

  constructor(scene: Phaser.Scene, depth: number) {
    this.#plates = OFFICE_PLAN.map((_plate, index) =>
      scene.add
        .image(0, 0, officeShellKey(index))
        .setOrigin(0, 0)
        .setDepth(depth)
    );
  }

  static preload(scene: Phaser.Scene): void {
    for (const shell of OFFICE_SHELLS) scene.load.image(shell.key, shell.url);
    for (const plate of OFFICE_PLAN) {
      scene.load.image(plate.id, officePlateUrl(plate.id));
    }
  }

  texture(key: string): void {
    for (const image of this.#plates) image.setTexture(key);
  }

  layout(scale: number, offX: number, offY: number): void {
    const width = (LOGICAL_BOARD.width * scale) / OFFICE_GRID.cols;
    const height = (LOGICAL_BOARD.height * scale) / OFFICE_GRID.rows;

    this.#plates.forEach((image, index) => {
      const col = index % OFFICE_GRID.cols;
      const row = Math.floor(index / OFFICE_GRID.cols);
      image
        .setPosition(offX + col * width, offY + row * height)
        .setDisplaySize(Math.ceil(width) + 1, Math.ceil(height) + 1);
    });
  }

  destroy(): void {
    for (const image of this.#plates) image.destroy();
  }
}
