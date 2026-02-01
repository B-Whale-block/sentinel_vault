import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Sentinel Vault - Secure Token Migration Protocol";
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
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width="400"
          height="450"
          viewBox="0 0 256 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Padlock shackle */}
          <path
            d="M 48 160 L 48 96 C 48 43 91 0 144 0 C 197 0 240 43 240 96 L 240 160"
            stroke="#39FF14"
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
            fill="#39FF14"
          />
          {/* Keyhole circle */}
          <circle cx="128" cy="220" r="28" fill="#000000" />
          {/* Keyhole slot */}
          <rect x="116" y="220" width="24" height="56" rx="8" fill="#000000" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
