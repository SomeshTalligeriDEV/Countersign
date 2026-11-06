'use client';
import { useEffect, useState } from 'react';

type Live = { block: string; observer: string; head?: string; match: number; total: number } | null;
const ENS = 'agent1.countersign.eth';

async function read(): Promise<Live> {
  const [n, d] = await Promise.all([
    fetch('/api/network', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())),
    fetch(`/api/countersign/ens/${ENS}/drift`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())),
  ]);
  const rows: { status?: string }[] = Array.isArray(d?.rows) ? d.rows : [];
  if (!n?.block) throw new Error('bad');
  return { block: String(n.block), observer: n.observer?.state ?? 'unknown', head: n.observer?.head != null ? String(n.observer.head) : undefined, match: rows.filter((r) => r.status === 'MATCH').length, total: rows.length };
}

// Polls every 5s while the tab is visible. Failure shows offline; numbers are never invented.
export default function LiveStatus() {
  const [live, setLive] = useState<Live>(null);
  const [state, setState] = useState<'loading' | 'live' | 'offline'>('loading');
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined, dead = false;
    const tick = async () => {
      clearTimeout(t);
      if (document.hidden) return;
      try { const v = await read(); if (!dead) { setLive(v); setState('live'); } } catch { if (!dead) { setLive(null); setState('offline'); } }
      if (!dead && !document.hidden) t = setTimeout(tick, 5000);
    };
    const onVis = () => { if (!document.hidden) tick(); else clearTimeout(t); };
    document.addEventListener('visibilitychange', onVis);
    tick();
    return () => { dead = true; clearTimeout(t); document.removeEventListener('visibilitychange', onVis); };
  }, []);
  return (
    <div className="cs-live" role="status" aria-live="polite" data-state={state}>
      <span className="cs-live-dot" aria-hidden="true" />
      {state === 'loading' && <span>Connecting to testnet backend…</span>}
      {state === 'offline' && <span>offline — backend tunnel down</span>}
      {state === 'live' && live && (
        <ul>
          <li>Whitechain block <b>#{live.block}</b></li>
          <li>observer <b>{live.observer}</b>{live.head ? ` (head #${live.head})` : ''}</li>
          <li>ENS drift <b>{live.match}/{live.total} MATCH</b></li>
        </ul>
      )}
    </div>
  );
}
