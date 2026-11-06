import Ghost from "./Ghost";

const columns = [
  { title: "Product", links: [["See it work", "#demo"], ["What it does", "#uses"], ["How it works", "#how"], ["Open app", "#network"]] },
  { title: "Trust", links: [["Safety", "#safety"], ["Privacy", "#safety"], ["Terms", "#how"]] },
  { title: "Contact", links: [["Network status", "#network"]] },
];

export default function Footer() {
  return (
    <footer className="border-t border-black/5 px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-4">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Ghost size={28} className="pointer-events-none" /> Countersign
          </p>
          <p className="mt-3 max-w-xs text-sm text-black/50">
            Bounded agent payments. Testnet development preview.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-medium text-black/40">{col.title}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <a href={href} className="text-black/70 hover:text-black">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-16 max-w-6xl select-none text-center text-[160px] font-bold leading-none text-black/5 sm:text-[220px]">
        sign
      </p>
    </footer>
  );
}
