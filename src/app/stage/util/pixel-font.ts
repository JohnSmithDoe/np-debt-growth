import * as Phaser from 'phaser';

export const PIXEL_FONT = 'cb-pixel-font';
const TEXTURE_KEY = 'cb-pixel-font-atlas';
const FAMILY = 'Departure Mono';

export const GLYPH_SIZE = 11;
export const GLYPH_CELL = Math.ceil(GLYPH_SIZE * 1.45);
const COLUMNS = 16;

const CHARS = `${Phaser.GameObjects.RetroFont.TEXT_SET1}€…—·× äöüÄÖÜß`;

export function whenPixelFontReady(): Promise<void> {
  return document.fonts.load(`${GLYPH_SIZE}px "${FAMILY}"`).then(() => void 0);
}

export function buildPixelFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.has(PIXEL_FONT)) return;

  const { cellWidth, cellHeight } = measureCell();
  const rows = Math.ceil(CHARS.length / COLUMNS);
  const texture = scene.textures.createCanvas(
    TEXTURE_KEY,
    cellWidth * COLUMNS,
    cellHeight * rows
  );
  if (!texture) throw new Error('The pixel font atlas could not be created.');

  paintGlyphs(texture.context, cellWidth, cellHeight);
  texture.refresh();

  scene.cache.bitmapFont.add(
    PIXEL_FONT,
    Phaser.GameObjects.RetroFont.Parse(scene, {
      image: TEXTURE_KEY,
      width: cellWidth,
      height: cellHeight,
      chars: CHARS,
      charsPerRow: COLUMNS,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 2,
    })
  );
}

function measureCell(): { cellWidth: number; cellHeight: number } {
  const probe = document.createElement('canvas').getContext('2d');
  if (!probe) throw new Error('No 2D context to measure the pixel font with.');

  probe.font = `${GLYPH_SIZE}px "${FAMILY}"`;
  const metrics = probe.measureText('M');
  return {
    cellWidth: Math.ceil(metrics.width),
    cellHeight: GLYPH_CELL,
  };
}

function paintGlyphs(
  ctx: CanvasRenderingContext2D,
  cellWidth: number,
  cellHeight: number
): void {
  ctx.font = `${GLYPH_SIZE}px "${FAMILY}"`;
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.imageSmoothingEnabled = false;

  const baseline = Math.round(GLYPH_SIZE);
  for (const [at, char] of [...CHARS].entries()) {
    ctx.fillText(
      char,
      (at % COLUMNS) * cellWidth,
      Math.floor(at / COLUMNS) * cellHeight + baseline
    );
  }
}
