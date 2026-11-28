import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      ...["/", "/dashboard/:path*", "/editor/:path*", "/settings/:path*",
        "/analytics/:path*", "/onboarding/:path*", "/login/:path*",
        "/register/:path*", "/admin/:path*", "/forgot-password/:path*",
        "/reset-password/:path*", "/verify-email/:path*"].map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
      })),
    ];
  },
};

export default nextConfig;
