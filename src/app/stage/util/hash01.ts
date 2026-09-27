export function hash01(n: number): number {
  const noise = Math.sin(n) * 43758.5453;
  return noise - Math.floor(noise);
}
