/** Cryptographically secure id for DB rows (preview links, posts, leads, …). */
export function newId(): string {
  return crypto.randomUUID()
}
