import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <div
          style={{
            width: 28,
            height: 32,
            background: "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
            clipPath: "polygon(50% 0%, 100% 15%, 100% 60%, 50% 100%, 0% 60%, 0% 15%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 10,
              height: 6,
              borderBottom: "3px solid #020617",
              borderLeft: "3px solid #020617",
              transform: "rotate(-45deg)",
              marginTop: -4,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
