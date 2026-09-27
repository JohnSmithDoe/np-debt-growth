export type GlowStop = readonly [offset: number, alpha: number];

export function paintRadialGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stops: readonly GlowStop[]
): void {
  const radius = size / 2;
  const gradient = ctx.createRadialGradient(
    x + radius,
    y + radius,
    0,
    x + radius,
    y + radius,
    radius
  );
  for (const [offset, alpha] of stops) {
    gradient.addColorStop(offset, `rgba(255,255,255,${alpha})`);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, size, size);
}
