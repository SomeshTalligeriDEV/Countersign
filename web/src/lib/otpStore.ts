import { createHash, randomInt, timingSafeEqual } from "crypto";

// ponytail: in-memory store — fine for one dev server, resets on restart and
// doesn't survive multiple instances. Swap for Redis/DB before scaling past
// a single process.
type Entry = {
  hash: string;
  expires: number;
  attempts: number; // failed verify attempts, persists across re-issues within windowStart
  issuedCount: number; // codes issued within windowStart
  windowStart: number;
};

const codes = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5; // total wrong guesses allowed per window, not per code
const MAX_ISSUES = 5; // codes a single email can request per window

function hash(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function issueCode(email: string): string {
  const now = Date.now();
  const prev = codes.get(email);
  const inWindow = prev && now < prev.windowStart + WINDOW_MS;

  if (inWindow && (prev.attempts >= MAX_ATTEMPTS || prev.issuedCount >= MAX_ISSUES)) {
    throw new Error("too many attempts, try again later");
  }

  const code = randomInt(100000, 999999).toString();
  codes.set(email, {
    hash: hash(code),
    expires: now + TTL_MS,
    attempts: inWindow ? prev!.attempts : 0,
    issuedCount: inWindow ? prev!.issuedCount + 1 : 1,
    windowStart: inWindow ? prev!.windowStart : now,
  });
  return code;
}

export function verifyCode(email: string, code: string): boolean {
  const entry = codes.get(email);
  if (!entry) return false;
  const now = Date.now();
  const inWindow = now < entry.windowStart + WINDOW_MS;
  if (now > entry.expires || !inWindow || entry.attempts >= MAX_ATTEMPTS) {
    if (!inWindow) codes.delete(email);
    return false;
  }
  entry.attempts++;
  const a = Buffer.from(hash(code));
  const b = Buffer.from(entry.hash);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (ok) codes.delete(email); // single use
  return ok;
}
