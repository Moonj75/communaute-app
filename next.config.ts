import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // All page information (manifest, icons, title) goes in <head> for every browser. Without this, Next puts it
  // later in the page, and Android Chrome then ignores the manifest: the app could not be installed.
  htmlLimitedBots: /.*/,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
