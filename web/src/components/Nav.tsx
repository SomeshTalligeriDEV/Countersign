import Ghost from "./Ghost";

export default function Nav() {
  const links = [
    { label: "See it work", href: "#demo" },
    { label: "What it does", href: "#uses" },
    { label: "How it works", href: "#how" },
    { label: "Safety", href: "#safety" },
  ];
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-[#faf7f0]/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="flex items-center gap-2 text-lg font-semibold">
          <Ghost size={28} className="pointer-events-none" /> Countersign
        </a>
        <div className="hidden items-center gap-8 text-sm text-black/70 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-black">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#network"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5"
          >
            Network status
          </a>
          <a
            href="#how"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/80"
          >
            How it works
          </a>
        </div>
      </nav>
    </header>
  );
}
