import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // All page information (manifest, icons, title) goes in <head> for every browser. Without this, Next puts it
  // later in the page, and Android Chrome then ignores the manifest: the app could not be installed.
  htmlLimitedBots: /.*/,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  // Safety rules sent with every page: the app cannot be shown inside another site (clickjacking),
  // the browser does not guess file types, only https, and no camera / micro / location.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
