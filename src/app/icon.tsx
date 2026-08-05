import { ImageResponse } from "next/og";

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
          background: "linear-gradient(135deg, #0e8a74, #0a6b5a)",
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9c-1.5 0-2.9-.36-4.14-1L3 21l1.06-4.86A8.96 8.96 0 0 1 3 12Z"
            fill="#f7fbfa"
          />
          <path d="m9 12 2 2 4-4" stroke="#0a6b5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
