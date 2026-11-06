import { DatabaseSync } from 'node:sqlite';

export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS gas_reservations (
      id TEXT PRIMARY KEY, mandate_id TEXT NOT NULL, at INTEGER NOT NULL,
      cost TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('reserved','submitted','confirmed','released')),
      tx_hash TEXT
    );
    CREATE INDEX IF NOT EXISTS gas_by_time ON gas_reservations(at, mandate_id);
    CREATE TABLE IF NOT EXISTS gasguard_log (
      id INTEGER PRIMARY KEY, mandate_id TEXT NOT NULL, decision TEXT NOT NULL,
      reason TEXT NOT NULL, at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS confirmed_payments (
      observer TEXT NOT NULL, payment_id TEXT NOT NULL, mandate_id TEXT NOT NULL,
      merchant_id TEXT NOT NULL, payout TEXT NOT NULL, amount TEXT NOT NULL,
      refunded TEXT NOT NULL DEFAULT '0', status TEXT NOT NULL,
      tx_hash TEXT NOT NULL, payload TEXT NOT NULL,
      PRIMARY KEY(observer,payment_id)
    );
    CREATE TABLE IF NOT EXISTS observer_cursor (name TEXT PRIMARY KEY, block TEXT NOT NULL, block_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS chain_events (
      id TEXT PRIMARY KEY, block TEXT NOT NULL, block_hash TEXT NOT NULL,
      tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, event TEXT NOT NULL, payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES chain_events(id),
      payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL
    );`);
  return db;
}
