export function cssHex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}
