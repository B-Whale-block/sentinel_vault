import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#22d3ee"
          d="M16 2c-4 2.2-8.5 3.3-13 3.3v10.7c0 6.5 5.1 12.2 13 15 7.9-2.8 13-8.5 13-15V5.3c-4.5 0-9-1.1-13-3.3zm-2 18l-4.5-4.5 2-2 2.5 2.5 6.5-6.5 2 2L14 20z"
        />
      </svg>
    ),
    { ...size }
  );
}
