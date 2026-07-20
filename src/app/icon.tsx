import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** HelixaraAI tab icon — replaces any default Next.js favicon */
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
          background: "#05080f",
          borderRadius: 6,
          border: "1px solid #2ee6ff66",
          color: "#2ee6ff",
          fontSize: 18,
          fontWeight: 700,
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        H
      </div>
    ),
    { ...size }
  );
}
