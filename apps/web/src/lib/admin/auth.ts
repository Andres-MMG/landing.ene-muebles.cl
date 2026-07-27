import bcrypt from 'bcryptjs';

/**
 * Password hashing + verification for admin users.
 *
 * Bcrypt is the right primitive here: slow by design (defeats brute
 * force), salted (same password yields different hashes), and the
 * default cost of 10 in bcryptjs is roughly 50-100ms on a modern CPU,
 * which is fine for an admin login flow.
 *
 * Password format: 60-character bcrypt string (2y$ prefix + 22 salt +
 * 31 hash). We store the FULL output of bcrypt.hash() / bcrypt.compare()
 * in the passwordHash field. Never store the plaintext, never derive
 * the hash manually, never strip the prefix.
 */

const BCRYPT_COST = 10;

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length < 1) {
    throw new Error('hashPassword: password must be a non-empty string');
  }
  if (plain.length > 256) {
    // Bcrypt has a 72-byte input limit. The 256 char cap is well below
    // that and matches sane UX bounds for an admin password field.
    throw new Error('hashPassword: password exceeds 256 characters');
  }
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  if (typeof plain !== 'string' || typeof hash !== 'string') return false;
  if (!hash.startsWith('$2') || hash.length < 59) {
    // Not a valid bcrypt hash. Treat as failed match (do not throw).
    return false;
  }
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
