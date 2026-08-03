import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/login",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/Dashboard",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/Dashboard/:path*",
        destination: "/dashboard/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
