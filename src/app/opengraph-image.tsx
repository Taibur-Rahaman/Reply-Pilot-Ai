import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0c2b33, #0a6b5a)",
          color: "#f7fbfa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 88,
            height: 88,
            borderRadius: 20,
            background: "rgba(247,251,250,0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
          }}
        >
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9c-1.5 0-2.9-.36-4.14-1L3 21l1.06-4.86A8.96 8.96 0 0 1 3 12Z"
              fill="#f7fbfa"
            />
            <path d="m9 12 2 2 4-4" stroke="#0a6b5a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", fontSize: 30, marginTop: 16, opacity: 0.85 }}>
          AI Messenger Sales Agent for Bangladesh
        </div>
      </div>
    ),
    { ...size },
  );
}
