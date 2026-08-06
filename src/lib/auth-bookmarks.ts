/**
 * User auth + saved-innovations (bookmarks) — PostgreSQL-backed.
 *
 * Auth model:
 *  - Email/password (scrypt hashes, no external deps) or passwordless magic links.
 *  - Opaque session tokens in an HTTP-only cookie; only the sha256 hash is stored.
 *
 * Everything here is server-only. The browser talks to it through the
 * endpoints in src/pages/api/.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { query } from './db';
import { sendMail } from './mailer';

const SESSION_COOKIE = 'hs_session';
const SESSION_DAYS = 30;
const MAGIC_LINK_MINUTES = 15;

export interface User {
  id: string;
  email: string;
  email_digest: 'none' | 'daily' | 'weekly';
}

export interface Bookmark {
  jtbd_id: string;
  jtbd_slug: string;
  jtbd_title: string;
  matrix_node: string | null;
  saved_at: string;
}

/* ---------------------------------------------------------------- passwords */

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/* ------------------------------------------------------------------ signup */

export async function registerUser(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) {
    throw new AuthError('Enter a valid email address.');
  }
  if (password.length < 8) {
    throw new AuthError('Password needs at least 8 characters.');
  }
  const existing = await query('SELECT id FROM users WHERE email = $1', [normalized]);
  if (existing.rowCount) {
    throw new AuthError('An account with that email already exists. Try logging in.');
  }
  const result = await query<User>(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     RETURNING id, email, email_digest`,
    [normalized, hashPassword(password)],
  );
  return result.rows[0];
}

export async function authenticate(email: string, password: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  const result = await query<User & { password_hash: string | null }>(
    'SELECT id, email, email_digest, password_hash FROM users WHERE email = $1',
    [normalized],
  );
  const row = result.rows[0];
  if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
    throw new AuthError('Email or password is incorrect.');
  }
  return { id: row.id, email: row.email, email_digest: row.email_digest };
}

/* ---------------------------------------------------------------- sessions */

export async function createSession(cookies: AstroCookies, userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await query(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [sha256(token), userId, expires],
  );
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    expires,
  });
}

export async function getCurrentUser(cookies: AstroCookies): Promise<User | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await query<User>(
    `SELECT u.id, u.email, u.email_digest
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)],
  );
  return result.rows[0] ?? null;
}

export async function destroySession(cookies: AstroCookies): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  }
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

/* ------------------------------------------------------------- magic links */

export async function issueMagicLink(email: string, siteUrl: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  // Create the account on first use — magic links double as signup.
  const user = await query<{ id: string }>(
    `INSERT INTO users (email) VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [normalized],
  );
  const token = randomBytes(32).toString('base64url');
  await query(
    'INSERT INTO magic_links (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [sha256(token), user.rows[0].id, new Date(Date.now() + MAGIC_LINK_MINUTES * 60_000)],
  );
  const link = `${siteUrl.replace(/\/$/, '')}/api/auth/magic-verify?token=${token}`;
  await sendMail({
    to: normalized,
    subject: 'Your HomeSmart.ca login link',
    text: `Click to log in (valid for ${MAGIC_LINK_MINUTES} minutes):\n\n${link}\n\nIf you didn't request this, ignore it.`,
  });
}

export async function redeemMagicLink(token: string): Promise<string> {
  const result = await query<{ user_id: string }>(
    `UPDATE magic_links SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [sha256(token)],
  );
  if (!result.rowCount) {
    throw new AuthError('That login link is invalid or expired. Request a new one.');
  }
  return result.rows[0].user_id;
}

/* --------------------------------------------------------------- bookmarks */

export interface BookmarkInput {
  jtbd_id: string;
  jtbd_slug: string;
  jtbd_title: string;
  matrix_node?: string;
}

/** Toggles a bookmark; returns the new state (true = now saved). */
export async function toggleBookmark(userId: string, input: BookmarkInput): Promise<boolean> {
  const deleted = await query(
    'DELETE FROM bookmarks WHERE user_id = $1 AND jtbd_id = $2',
    [userId, input.jtbd_id],
  );
  if (deleted.rowCount) return false;
  await query(
    `INSERT INTO bookmarks (user_id, jtbd_id, jtbd_slug, jtbd_title, matrix_node)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, jtbd_id) DO NOTHING`,
    [userId, input.jtbd_id, input.jtbd_slug, input.jtbd_title, input.matrix_node ?? null],
  );
  return true;
}

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const result = await query<Bookmark>(
    `SELECT jtbd_id, jtbd_slug, jtbd_title, matrix_node, saved_at
     FROM bookmarks WHERE user_id = $1 ORDER BY saved_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function isBookmarked(userId: string, jtbdId: string): Promise<boolean> {
  const result = await query(
    'SELECT 1 FROM bookmarks WHERE user_id = $1 AND jtbd_id = $2',
    [userId, jtbdId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

/* ------------------------------------------------------------- preferences */

export async function setEmailDigest(
  userId: string,
  digest: 'none' | 'daily' | 'weekly',
): Promise<void> {
  await query('UPDATE users SET email_digest = $1 WHERE id = $2', [digest, userId]);
}

/* ------------------------------------------------------------------ errors */

export class AuthError extends Error {}
