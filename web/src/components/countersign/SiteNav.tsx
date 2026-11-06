'use client';
// Pill nav: white link pill + dark action pill on desktop; burger + dialog-style menu under 720px (Esc, overlay click, focus trap).
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Item = { href: string; label: string; ext?: boolean };

function Mark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l4.5 4.5L20 6.5" /><path d="M9 12.5l1.5 1.5" opacity=".45" />
    </svg>
  );
}

function A({ i, className, onClick }: { i: Item; className: string; onClick?: () => void }) {
  return i.ext
    ? <a href={i.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>{i.label}</a>
    : <Link href={i.href} className={className} onClick={onClick}>{i.label}</Link>;
}

export default function SiteNav({ links, action }: { links: Item[]; action: Item }) {
  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    document.body.classList.toggle('cs-menu-open', open);
    if (!open) return;
    menu.current?.querySelector('a')?.focus({ preventScroll: true });
    const close = (restore: boolean) => { setOpen(false); if (restore) burger.current?.focus({ preventScroll: true }); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') {
        const f: HTMLElement[] = [burger.current!, ...Array.from(menu.current?.querySelectorAll('a') ?? [])];
        const n = (f.indexOf(document.activeElement as HTMLElement) + (e.shiftKey ? -1 : 1) + f.length) % f.length;
        e.preventDefault(); f[n].focus();
      }
    };
    const onResize = () => { if (window.innerWidth > 720) close(false); };
    document.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); document.body.classList.remove('cs-menu-open'); };
  }, [open]);
  return (
    <>
      <header className="cs-header">
        <Link href="/" className="cs-logo" aria-label="Countersign home"><Mark /></Link>
        <nav aria-label="Primary" className="cs-pill">
          {links.map((i) => <A key={i.href} i={i} className="cs-pill-link" />)}
        </nav>
        <A i={action} className="cs-action" />
        <button ref={burger} type="button" className="cs-burger" aria-expanded={open} aria-controls="cs-mobile-menu" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </header>
      {open && <div className="cs-overlay" onClick={() => { setOpen(false); burger.current?.focus(); }} />}
      <div ref={menu} id="cs-mobile-menu" className="cs-mobile-menu" hidden={!open}>
        {links.map((i) => <A key={i.href} i={i} className="cs-mobile-link" onClick={() => setOpen(false)} />)}
        <A i={action} className="cs-mobile-action" onClick={() => setOpen(false)} />
      </div>
    </>
  );
}

// Count-up stat (Pactra stats pattern). SSR renders the real value; animates from 0 only with motion allowed.
export function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    let raf = 0;
    el.textContent = '0';
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 1200);
        el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); el.textContent = String(to); };
  }, [to]);
  return <span ref={ref}>{to}</span>;
}
