export function sameRecord(
  a: Readonly<Record<string, number>>,
  b: Readonly<Record<string, number>>
): boolean {
  if (a === b) return true;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
}
