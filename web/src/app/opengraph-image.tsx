import { ImageResponse } from "next/og";

export const alt = "Countersign — spending mandates for AI agents";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "#0a0a0b", color: "#f5f5f4" }}>
        <div style={{ fontSize: 28, color: "#c4b5fd", letterSpacing: 4 }}>TESTNET · WHITECHAIN · WORLD ID · ENS</div>
        <div style={{ fontSize: 84, fontWeight: 700, marginTop: 24, lineHeight: 1.05 }}>Countersign</div>
        <div style={{ fontSize: 48, color: "#a8a29e", marginTop: 16 }}>Spending mandates for AI agents</div>
      </div>
    ),
    size,
  );
}
