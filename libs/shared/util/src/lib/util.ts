export function truncateToken(token: string | null | undefined, length = 10): string | null {
  if (!token) return null;
  return token.length > length ? token.slice(0, length) + "…" : token;
}
