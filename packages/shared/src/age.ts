export function parseBirthdate(value: string, now = new Date()): number {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("invalid birthdate");
  const parts = v.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const d = parts[2] ?? 0;
  const born = new Date(Date.UTC(y, m - 1, d));
  if (born.getUTCFullYear() !== y || born.getUTCMonth() !== m - 1 || born.getUTCDate() !== d) {
    throw new Error("invalid birthdate");
  }
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (born.getTime() > today.getTime()) throw new Error("underage");
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const anniversary = new Date(Date.UTC(today.getUTCFullYear(), born.getUTCMonth(), born.getUTCDate()));
  if (anniversary.getUTCMonth() !== born.getUTCMonth()) anniversary.setUTCDate(0);
  if (today.getTime() < anniversary.getTime()) age--;
  if (age > 120) throw new Error("invalid birthdate");
  return age;
}

export function isTeen(age: number): boolean {
  return age >= 13 && age <= 17;
}
