"use client";
import Image from "next/image";
import { useState } from "react";

export default function Ghost({
  size = 180,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [poked, setPoked] = useState(false);

  return (
    <button
      type="button"
      aria-label="Animate the Countersign mascot"
      onClick={() => {
        setPoked(true);
        setTimeout(() => setPoked(false), 600);
      }}
      className={`group relative inline-block shrink-0 cursor-pointer border-0 bg-transparent p-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="absolute left-1/2 top-[88%] h-4 w-2/3 -translate-x-1/2 rounded-full bg-black/15 blur-md transition-transform duration-300 group-hover:scale-90"
        aria-hidden
      />
      <span
        className={`block h-full w-full animate-[float_3.2s_ease-in-out_infinite] transition-transform duration-200 ease-out group-hover:-translate-y-2 group-active:scale-95 ${
          poked ? "animate-[wiggle_0.5s_ease-in-out]" : ""
        }`}
      >
        <Image
          src="/ghost.png"
          alt="Countersign mascot, a fluffy purple ghost"
          width={size}
          height={size}
          className="h-full w-full object-contain drop-shadow-xl"
          priority
        />
      </span>
    </button>
  );
}
