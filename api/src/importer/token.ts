export function tokenMatch(got: string, want: string): boolean {
  if (got.length !== want.length) return false;
  let acc = 0;
  for (let i = 0; i < got.length; i++) acc |= got.charCodeAt(i) ^ want.charCodeAt(i);
  return acc === 0;
}
