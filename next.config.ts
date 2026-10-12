import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Hides the dev-only route indicator so screenshots show the real page. Compile and runtime errors still show.
  devIndicators: false,
};

export default nextConfig;
