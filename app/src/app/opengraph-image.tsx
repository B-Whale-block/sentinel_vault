import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Svalinn Protocol - The Shield Against The Burn";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #000510 0%, #001025 50%, #000510 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        <svg
          width="280"
          height="320"
          viewBox="0 0 256 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f5ff" />
              <stop offset="50%" stopColor="#0099ff" />
              <stop offset="100%" stopColor="#003d99" />
            </linearGradient>
          </defs>
          {/* Padlock shackle */}
          <path
            d="M 48 160 L 48 96 C 48 43 91 0 144 0 C 197 0 240 43 240 96 L 240 160"
            stroke="url(#shieldGradient)"
            strokeWidth="28"
            strokeLinecap="round"
            fill="none"
          />
          {/* Padlock body */}
          <rect
            x="16"
            y="144"
            width="224"
            height="176"
            rx="24"
            ry="24"
            fill="url(#shieldGradient)"
          />
          {/* Keyhole circle */}
          <circle cx="128" cy="220" r="28" fill="#000510" />
          {/* Keyhole slot */}
          <rect x="116" y="220" width="24" height="56" rx="8" fill="#000510" />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span
            style={{
              fontSize: "64px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              background: "linear-gradient(135deg, #00f5ff 0%, #0099ff 50%, #003d99 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            SVALINN
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#6b7280",
              fontStyle: "italic",
            }}
          >
            The shield against the burn
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
