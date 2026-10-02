import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Keep our repository working agreement under explicit version control.
  agentRules: false,
};

export default nextConfig;
