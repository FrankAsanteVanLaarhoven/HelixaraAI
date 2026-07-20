import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide Next.js "N" dev logo / build activity badge (bottom-left in dev)
  devIndicators: false,
  poweredByHeader: false,
};

export default nextConfig;
